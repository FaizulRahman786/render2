import 'dotenv/config.js';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
import('dotenv').then(dotenv => {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
});

setTimeout(async () => {
  const sql = postgres(process.env.DATABASE_URL, { max: 1, connect_timeout: 30 });

  // Create public_courses table
  await sql`CREATE TABLE IF NOT EXISTS "public_courses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "short_description" text,
    "description" text,
    "duration" text,
    "eligibility" text,
    "level" text,
    "subjects" jsonb DEFAULT '[]'::jsonb,
    "highlights" jsonb DEFAULT '[]'::jsonb,
    "fee_reference" text,
    "admission_available" boolean DEFAULT true NOT NULL,
    "image_url" text,
    "cloudinary_id" text DEFAULT '',
    "featured" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "cms_status" text DEFAULT 'draft' NOT NULL,
    "published_at" timestamp,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`;
  console.log('Created public_courses');

  await sql`CREATE INDEX IF NOT EXISTS "public_courses_status_idx" ON "public_courses" USING btree ("cms_status")`;
  await sql`CREATE INDEX IF NOT EXISTS "public_courses_display_order_idx" ON "public_courses" USING btree ("display_order")`;
  await sql`CREATE INDEX IF NOT EXISTS "public_courses_featured_idx" ON "public_courses" USING btree ("featured")`;
  console.log('Created public_courses indexes');

  // Create public_faculty table
  await sql`CREATE TABLE IF NOT EXISTS "public_faculty" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "designation" text NOT NULL,
    "department" text,
    "subject" text,
    "qualification" text,
    "experience" text,
    "specialization" text,
    "bio" text,
    "profile_image" text,
    "cloudinary_id" text DEFAULT '',
    "featured" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "cms_status" text DEFAULT 'draft' NOT NULL,
    "published_at" timestamp,
    "created_by" uuid,
    "updated_by" uuid,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`;
  console.log('Created public_faculty');

  await sql`CREATE INDEX IF NOT EXISTS "public_faculty_status_idx" ON "public_faculty" USING btree ("cms_status")`;
  await sql`CREATE INDEX IF NOT EXISTS "public_faculty_display_order_idx" ON "public_faculty" USING btree ("display_order")`;
  await sql`CREATE INDEX IF NOT EXISTS "public_faculty_featured_idx" ON "public_faculty" USING btree ("featured")`;
  console.log('Created public_faculty indexes');

  // Add FK constraints for public_courses
  await sql`ALTER TABLE "public_courses" ADD CONSTRAINT "public_courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`;
  await sql`ALTER TABLE "public_courses" ADD CONSTRAINT "public_courses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`;
  console.log('Added public_courses FK constraints');

  // Add FK constraints for public_faculty
  await sql`ALTER TABLE "public_faculty" ADD CONSTRAINT "public_faculty_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`;
  await sql`ALTER TABLE "public_faculty" ADD CONSTRAINT "public_faculty_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action`;
  console.log('Added public_faculty FK constraints');

  // Enable RLS
  await sql`ALTER TABLE "public_courses" ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE "public_faculty" ENABLE ROW LEVEL SECURITY`;
  console.log('Enabled RLS on public_courses and public_faculty');

  await sql.end();
  console.log('Done!');
}, 100);