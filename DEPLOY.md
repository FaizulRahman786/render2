Deployment Guide

Overview
- Frontend: Vercel (Vite)
- Backend: Render (Node/Express)
- Identity: Supabase Auth
- Authorization: PostgreSQL application tables through Express/Drizzle

Prerequisites
- GitHub repo connected to Vercel and Render or manual deploy access
- Supabase project with Phone OTP and Google OAuth configured
- Render API key and Vercel token only if using GitHub Actions to trigger deployments

Environment variables (Render backend)
- NODE_ENV=production
- PORT=3001
- DATABASE_URL=<your postgres connection string>
- AUTH_PROVIDER=supabase
- SUPABASE_URL=https://<your-project>.supabase.co
- SUPABASE_ANON_KEY=<your Supabase anon key>
- CORS_ORIGIN=https://<your-vercel-app>.vercel.app

Frontend (Vercel) env
- VITE_API_URL=https://<your-render-service>.onrender.com/api
- VITE_SUPABASE_URL=https://<your-project>.supabase.co
- VITE_SUPABASE_ANON_KEY=<your Supabase anon key>
- NODE_ENV=production

Quick manual steps - Render (backend)
1. Import this repository in Render.
2. Use `pnpm install --frozen-lockfile && pnpm --prefix apps/backend run build` as the build command.
3. Use `pnpm --prefix apps/backend start` as the start command.
4. Set required environment variables in Render dashboard.
5. Deploy.

Quick manual steps - Vercel (frontend)
1. Import the repository into Vercel.
2. Set the project root to repository root and build command to `vite build`, output dir `dist`.
3. Add the required `VITE_*` environment variables.
4. Add the production `/auth/callback` URL to Supabase redirect URLs.
5. Deploy.

Verifications after deploy
- Visit the Vercel frontend URL and confirm network calls to `/api/` go to Render.
- Sign in with Supabase Phone OTP and Google OAuth using existing app users.
- Confirm `/api/auth/me` returns the expected role from the database.
- Confirm notification streaming uses `/api/notifications/stream` with an Authorization header.
