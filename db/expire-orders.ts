import pg from "pg";

/**
 * Gives back the stock held by unpaid orders whose time has run out. Run it
 * every few minutes on the server (a systemd timer or cron job):
 *   npm run orders:expire
 * It also runs by itself whenever someone checks out or opens their orders,
 * so this just makes sure held stock never stays held on a quiet shop.
 *
 * It touches the database directly (no website code), the same way the
 * order service does: one order per transaction, stock rows locked in order.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (see .env.example).");
  process.exit(1);
}

async function main() {
  const pool = new pg.Pool({ connectionString: url, max: 1 });
  let released = 0;
  try {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM orders
       WHERE status = 'waiting_payment' AND stock_state = 'reserved' AND reservation_expires_at < now()
       ORDER BY reservation_expires_at LIMIT 500`,
    );

    for (const { id } of rows) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const order = (
          await client.query(
            `SELECT id, market FROM orders
             WHERE id = $1 AND status = 'waiting_payment' AND reservation_expires_at < now()
             FOR UPDATE`,
            [id],
          )
        ).rows[0];
        if (order) {
          const items = (
            await client.query(
              `SELECT variant_id, quantity FROM order_items
               WHERE order_id = $1 AND variant_id IS NOT NULL ORDER BY variant_id`,
              [id],
            )
          ).rows;
          await client.query(
            `SELECT 1 FROM inventory WHERE variant_id = ANY($1::uuid[]) AND market = $2
             ORDER BY variant_id FOR UPDATE`,
            [items.map((item) => item.variant_id), order.market],
          );
          for (const item of items) {
            await client.query(
              "UPDATE inventory SET reserved = reserved - $1 WHERE variant_id = $2 AND market = $3",
              [item.quantity, item.variant_id, order.market],
            );
          }
          await client.query(
            `UPDATE orders SET status = 'cancelled', stock_state = 'released',
               reservation_expires_at = NULL, cancelled_at = now(), cancel_reason = 'Not paid in time'
             WHERE id = $1`,
            [id],
          );
          await client.query(
            `UPDATE payments SET status = 'cancelled'
             WHERE order_id = $1 AND status IN ('pending', 'requires_action', 'failed')`,
            [id],
          );
          await client.query(
            `INSERT INTO order_status_history (order_id, from_status, to_status, actor_type, note)
             VALUES ($1, 'waiting_payment', 'cancelled', 'system', 'Not paid in time')`,
            [id],
          );
          released += 1;
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    console.log(`Released ${released} unpaid order(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Expiring orders failed:", error);
  process.exitCode = 1;
});
