# Deploying on Railway

Railway runs the app as one normal Node server (`npm run build`, then `npm start`). Nothing in the code is Railway specific. Node 22 is pinned in `package.json` (`engines`).

## What you need first

- The code on GitHub (branch `mazhar`).
- A **PostgreSQL database that is reachable while the site is built**. `next build` reads the catalogue, so the database must answer during the build. Railway's own Postgres is only reachable from the running app (its private address), so for the demo keep using **Neon**. If you move to Railway Postgres later, use its public address for the build.
- A Cloudinary account (all pictures go there; no disk or Railway volume is needed).

## One-time database setup (from your own computer)

Put the Neon **direct** connection string (pooling off) in a git-ignored file, for example `.env.neon`:

```
DATABASE_URL=...
DATABASE_MIGRATION_URL=...
DATABASE_SSL=true
```

```bash
node --env-file=.env.neon db/migrate.mjs up
npx tsx --env-file=.env.neon db/seed-catalog.ts      # optional: the sample catalogue
```

## Steps in Railway

1. **New Project → Deploy from GitHub repo**, pick the repository and the `mazhar` branch. Choose the region closest to the database (Neon `us-east-1` = US East, Virginia).
2. **Settings → Networking → Generate Domain.** Do this **before** adding the variables: two of them use the domain.
3. **Variables → Raw Editor**: paste the contents of `.env.railway` (see the variable list below). Save; Railway redeploys.
4. Open the address. Check the shop pages, then `/admin`.
5. **Create the first admin** from your computer; the sign-in link it prints starts with `localhost`, so replace that part with the Railway address:

   ```bash
   npx tsx --env-file=.env.neon db/create-super-admin.ts --email you@example.com --first Ada --last Lovelace
   ```

## Variables

| Variable                                                               | Value                                                                                                                                                                                 |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                         | Neon **pooled** string (host contains `-pooler`), as the owner user                                                                                                                   |
| `DATABASE_SSL`                                                         | `true`                                                                                                                                                                                |
| `DATABASE_POOL_MAX`                                                    | `5`                                                                                                                                                                                   |
| `NEXT_PUBLIC_SITE_URL`, `APP_ORIGINS`                                  | `https://${{RAILWAY_PUBLIC_DOMAIN}}` (Railway fills it in). Baked in at build: changing them needs a redeploy.                                                                        |
| `NEXT_PUBLIC_API_URL`                                                  | `/api/v1`                                                                                                                                                                             |
| `TRUST_PROXY`                                                          | `true` (Railway's proxy sets the visitor IP header; check once on the live site)                                                                                                      |
| `BCRYPT_COST`                                                          | `12`                                                                                                                                                                                  |
| `STAFF_2FA_ENCRYPTION_KEY`                                             | A new key: `openssl rand -base64 32`. If it is lost, staff set up their authenticator again.                                                                                          |
| `PAYMENT_PROVIDER`                                                     | `stripe` (the app refuses `simulated` in production). Cash on delivery and manual transfers work without it.                                                                          |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From the Cloudinary dashboard (the key needs upload permission, role Master Admin)                                                                                                    |
| `CLOUDINARY_FOLDER`                                                    | `luzanika-demo` (use another folder for the live shop)                                                                                                                                |
| `RESEND_API_KEY`, `MAIL_FROM`, `CONTACT_TO_EMAIL`                      | Email through Resend's web API. **Railway blocks SMTP on the trial and hobby plans, so use `RESEND_API_KEY` (the same key as before) and not `SMTP_*`.** Without it no email is sent. |

## Email on Railway

On the trial and hobby plans Railway blocks outgoing mail-server (SMTP) connections, so order, password-reset and contact emails would silently fail. The app can send through Resend's web API instead (plain HTTPS): set `RESEND_API_KEY` (and `MAIL_FROM` on a domain verified in Resend) and leave the `SMTP_*` variables out. The failure shows in the Deploy Logs as `order email failed`.

## Later

- **Expired unpaid orders:** `npm run orders:expire` returns held stock. Add a second Railway service from the same repo, start command `npm run orders:expire`, cron schedule `*/5 * * * *`. Stock is also released whenever someone checks out or opens their orders, so a quiet demo works without it.
- **Own domain:** Settings → Networking → Custom Domain, then add the CNAME Railway shows at your DNS host. Keep the existing email (Resend) records untouched, then update `NEXT_PUBLIC_SITE_URL` and `APP_ORIGINS`.
- **Rate limits** are counted in the server's memory, which is fine for one instance. With several instances each counts separately.
- Swap the full-access Resend key for a "Sending access" key before the real launch.
