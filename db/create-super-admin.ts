import { parseArgs } from "node:util";

import pg from "pg";

import { generateToken, hashToken } from "../src/server/security/tokens";

/**
 * Creates the first super admin of the admin area:
 *   npm run admin:create -- --email owner@example.com --first Ada --last Lovelace
 *
 * It makes an invited account and prints a one-time link to choose a password,
 * so no password ever goes through the command line or shell history. After
 * opening the link the person signs in and sets up their authenticator app.
 * It refuses to run when a super admin already exists, unless --force is given
 * (more super admins are normally invited from inside the admin).
 */
const INVITE_HOURS = 72;

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    first: { type: "string" },
    last: { type: "string" },
    force: { type: "boolean", default: false },
  },
});

const url = process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error(
    "Set DATABASE_MIGRATION_URL or DATABASE_URL (see .env.example).",
  );
  process.exit(1);
}

const email = values.email?.trim().toLowerCase();
const firstName = values.first?.trim();
const lastName = values.last?.trim();
if (!email || !firstName || !lastName || !/^[^\s@]+@[^\s@]+$/.test(email)) {
  console.error(
    "Usage: npm run admin:create -- --email <email> --first <first name> --last <last name> [--force]",
  );
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingSuper = await client.query(
      "SELECT 1 FROM staff WHERE is_super_admin LIMIT 1",
    );
    const sameEmail = await client.query(
      "SELECT id, status, is_super_admin FROM staff WHERE email = $1 FOR UPDATE",
      [email],
    );

    let staffId: string;
    if (sameEmail.rows[0]) {
      const row = sameEmail.rows[0];
      if (!(row.status === "invited" && row.is_super_admin)) {
        throw new Error(`${email} already exists. Nothing was changed.`);
      }
      // The invite was never accepted: this just makes a fresh link.
      staffId = row.id;
    } else {
      if (existingSuper.rows.length > 0 && !values.force) {
        throw new Error(
          "A super admin already exists. Invite more people from inside the admin, or add --force.",
        );
      }
      const created = await client.query(
        `INSERT INTO staff (email, first_name, last_name, is_super_admin)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [email, firstName, lastName],
      );
      staffId = created.rows[0].id;
    }

    const token = generateToken();
    await client.query(
      "DELETE FROM staff_tokens WHERE staff_id = $1 AND type = 'invite' AND used_at IS NULL",
      [staffId],
    );
    await client.query(
      `INSERT INTO staff_tokens (staff_id, type, token_hash, expires_at)
       VALUES ($1, 'invite', $2, now() + make_interval(hours => $3))`,
      [staffId, hashToken(token), INVITE_HOURS],
    );
    await client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, after)
       VALUES ('staff.super_admin_created', 'staff', $1, $2::jsonb)`,
      [staffId, JSON.stringify({ email, firstName, lastName })],
    );
    await client.query("COMMIT");

    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    console.log(`\nSuper admin ready: ${firstName} ${lastName} <${email}>`);
    console.log(
      `Open this link within ${INVITE_HOURS} hours to choose a password (it works once):\n`,
    );
    console.log(`  ${site}/admin/accept-invite?token=${token}\n`);
    console.log(
      "Then sign in and set up an authenticator app (required). The token itself is:",
    );
    console.log(`  ${token}\n`);
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
