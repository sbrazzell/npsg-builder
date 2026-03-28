# Deployment Guide

This guide covers deploying NSGP Builder to Vercel with a Turso database and Google OAuth authentication.

---

## 1. Set up Turso

Install the Turso CLI:

```bash
brew install tursodatabase/tap/turso
```

Log in:

```bash
turso auth login
```

Create a database:

```bash
turso db create nsgp-builder
```

Get the database URL:

```bash
turso db show nsgp-builder --url
```

Create an auth token:

```bash
turso db tokens create nsgp-builder
```

Push the schema to Turso (set env vars first):

```bash
TURSO_DATABASE_URL="libsql://your-db-name.turso.io" \
TURSO_AUTH_TOKEN="your-token" \
npx prisma migrate deploy
```

Seed the database (optional):

```bash
TURSO_DATABASE_URL="libsql://your-db-name.turso.io" \
TURSO_AUTH_TOKEN="your-token" \
npx prisma db seed
```

---

## 2. Set up Google OAuth

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Set **Application type** to **Web application**
6. Add the following **Authorized redirect URIs**:
   - `https://your-vercel-url.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

---

## 3. Generate NEXTAUTH_SECRET

Run:

```bash
openssl rand -base64 32
```

Copy the output — this is your `NEXTAUTH_SECRET`.

---

## 4. Deploy to Vercel

1. Push code to GitHub (already done)
2. Go to [vercel.com](https://vercel.com) → **New Project** → **Import from GitHub** → select `nsgp-builder`
3. Set all environment variables in the Vercel project settings:

| Variable | Value |
|----------|-------|
| `TURSO_DATABASE_URL` | `libsql://your-db-name.turso.io` |
| `TURSO_AUTH_TOKEN` | your Turso auth token |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` (your actual Vercel URL) |
| `NEXTAUTH_SECRET` | output of `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `ALLOWED_EMAILS` | comma-separated emails of your team members |
| `NARRATIVE_PROVIDER` | `template` |

4. Click **Deploy**

---

## 5. After deploy

- **Update Google OAuth redirect URI**: go back to Google Cloud Console and add the actual Vercel URL (`https://your-app.vercel.app/api/auth/callback/google`) if you didn't do so already
- **Test login**: have each team member sign in with their Google account
- **Verify the allowlist**: only emails listed in `ALLOWED_EMAILS` will be granted access

---

## Local development with Turso

To develop locally against the real Turso database, set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in your `.env` file with your actual credentials.

For fully local development with a local SQLite file, you can use a local libsql server:

```bash
# Install sqld (local libsql server)
brew install sqld

# Start a local server
sqld --db-path ./dev.db

# Set in .env:
# TURSO_DATABASE_URL="http://127.0.0.1:8080"
# TURSO_AUTH_TOKEN=""  (leave empty for local server)
```

Note: The `prisma db seed` and `prisma migrate` commands require `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to be set, as configured in `prisma.config.ts`.
