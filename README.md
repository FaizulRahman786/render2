# Coaching Management Platform

A high-performance, production-grade SaaS application for managing courses, live classes, student tests, fees, and real-time SSE notifications.

---

## 🛠️ Technology Stack

*   **Frontend**: React (Vite), Tailwind CSS (v4), Radix UI
*   **Backend**: Node.js (Express), TypeScript
*   **Database**: Supabase PostgreSQL (Managed)
*   **ORM Layer**: Drizzle ORM (postgres.js driver)
*   **Real-time Services**: Server-Sent Events (SSE)
*   **Authentication**: Supabase Auth (JWT Verification)

---

## ⚙️ Environment Variables

Copy the [`.env.example`](file:///.env.example) to `.env` and fill in the required values:

```bash
# General Server Config
PORT=3001
NODE_ENV=development

# Frontend Bindings
VITE_API_URL=http://localhost:3001/api

# Supabase Auth Bindings
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase Database - Runtime Connection (Transaction Pooler - Port 6543)
DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres

# Supabase Database - Migration Connection (Direct URI - Port 5432)
DIRECT_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Optional Integrations
CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<cloud_name>
```

> [!IMPORTANT]
> The database connection is split into two connection strings:
> 1. `DATABASE_URL` (Port 6543) is routed through PgBouncer in transaction mode and uses `prepare: false` to allow high concurrency.
> 2. `DIRECT_URL` (Port 5432) bypasses the pooler and is used exclusively by `drizzle-kit` and the Supabase CLI to apply migrations (DDL/DML schemas).

---

## 🚀 Migration & Database Workflow

To guarantee schema safety, the codebase uses a migration-first workflow where `schema.ts` is the single source of truth:

```
[schema.ts] ➜ pnpm db:generate ➜ [Migration SQL] ➜ npx supabase db push ➜ [Supabase DB]
```

### 1. Generating Migrations
When you modify [`schema.ts`](file:///apps/backend/src/db/schema.ts), generate a new migration file:
```bash
pnpm run db:generate
```
This writes a timestamped SQL file into `supabase/migrations/`.

### 2. Pushing to Supabase Cloud
To apply local migrations to your remote Supabase instance:
1. Log into your Supabase account:
   ```bash
   npx supabase login
   ```
2. Link your local project:
   ```bash
   pnpm run supabase:link
   ```
3. Deploy the migrations:
   ```bash
   pnpm run supabase:push
   ```

### 3. Local Development (Optional)
Start a local Supabase emulator stack:
```bash
pnpm run supabase:start
```

---

## 🔄 Graceful Shutdown and Connection Recycling

The Express backend handles process interruption gracefully:
*   On receiving `SIGTERM` or `SIGINT`, it rejects new connections, finishes processing pending HTTP requests, and invokes `postgresClient.end({ timeout: 5 })` to cleanly disconnect all pooled sockets.

---

## 🗑️ Reverting / Rollback Plan

If you encounter connection pools exhaustion or performance degradation using the new driver, follow these rollback steps:

1.  **Driver Revert**:
    ```bash
    pnpm remove postgres
    pnpm add pg @types/pg
    ```
2.  **Restore DB Context**:
    Revert the database client instantiation in [`db/index.ts`](file:///apps/backend/src/db/index.ts) from `drizzle-orm/postgres-js` back to `drizzle-orm/node-postgres` and `pg.Pool`.
3.  **Restore Configurations**:
    Set `drizzle.config.ts` to output migrations directly using the single `DATABASE_URL`.