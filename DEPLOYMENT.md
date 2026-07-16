# Deployment Guide

## Production Setup
1. Configure Supabase Auth providers for Phone OTP and Google OAuth.
2. Provision PostgreSQL and set `DATABASE_URL`.
3. Set Supabase, CORS, backend, and frontend environment variables.
4. Build and deploy the frontend and backend.

## Required Environment Variables
- `DATABASE_URL`
- `AUTH_PROVIDER=supabase`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `CORS_ORIGIN`
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Database Setup
- Startup migrations create additive auth tables and indexes.
- Existing users are preserved.
- `users.password` is made nullable for Supabase-backed users.

## Build Steps
- `pnpm install --frozen-lockfile`
- `pnpm --prefix apps/backend run type-check`
- `pnpm build`

## Deployment Steps
- Deploy the backend and frontend separately.
- Point `VITE_API_URL` at the deployed backend API.
- Configure Supabase redirect URLs for local and production `/auth/callback`.
- Ensure HTTPS is enabled for production origins.
