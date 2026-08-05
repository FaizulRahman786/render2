CREATE TABLE "achievements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" text DEFAULT 'academic' NOT NULL,
	"achievement_date" timestamp,
	"image_url" text,
	"cloudinary_id" text DEFAULT '',
	"award_organization" text,
	"student_name" text,
	"level" text,
	"featured" boolean DEFAULT false NOT NULL,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session" text NOT NULL,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"title" text,
	"subtitle" text,
	"description" text,
	"opening_date" timestamp,
	"closing_date" timestamp,
	"eligibility" text,
	"documents" jsonb DEFAULT '[]'::jsonb,
	"process" jsonb DEFAULT '[]'::jsonb,
	"programs" jsonb DEFAULT '[]'::jsonb,
	"instructions" text,
	"contact_phone" text,
	"contact_email" text,
	"cta_label" text DEFAULT 'Apply for Admission',
	"cta_url" text,
	"featured" boolean DEFAULT false NOT NULL,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"excerpt" text,
	"content" text NOT NULL,
	"cover_image" text,
	"cloudinary_id" text DEFAULT '',
	"category" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"author" text,
	"author_id" uuid,
	"featured" boolean DEFAULT false NOT NULL,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp,
	"published_at" timestamp,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "blog_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "cms_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section" text NOT NULL,
	"content" jsonb NOT NULL,
	"action" text DEFAULT 'save' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_page_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"path" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"kind" text DEFAULT 'html' NOT NULL,
	"size" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_page_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"note" text,
	"snapshot" jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"page_type" text DEFAULT 'html' NOT NULL,
	"entry_file" text DEFAULT 'index.html' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"og_image" text,
	"robots" text DEFAULT 'index,follow' NOT NULL,
	"navigation_label" text,
	"navigation_visibility" boolean DEFAULT false NOT NULL,
	"navigation_position" integer DEFAULT 0 NOT NULL,
	"ack_risks" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"source_page" text,
	"notes" text,
	"status" text DEFAULT 'new' NOT NULL,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"short_description" text,
	"description" text,
	"event_date" timestamp NOT NULL,
	"end_date" timestamp,
	"start_time" text,
	"end_time" text,
	"venue" text,
	"organizer" text,
	"contact_phone" text,
	"registration_url" text,
	"location" text,
	"banner_url" text,
	"cloudinary_id" text DEFAULT '',
	"featured" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"seo_title" text,
	"seo_description" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text DEFAULT 'general' NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_structures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session" text NOT NULL,
	"class_level" text NOT NULL,
	"admission_fee" numeric(10, 2),
	"tuition_fee" numeric(10, 2),
	"monthly_fee" numeric(10, 2),
	"exam_fee" numeric(10, 2),
	"transport_fee" numeric(10, 2),
	"other_charges" numeric(10, 2),
	"total_fee" numeric(10, 2),
	"discount_info" text,
	"notes" text,
	"payment_schedule" text,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gallery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"caption" text,
	"alt_text" text DEFAULT '',
	"image_url" text NOT NULL,
	"cloudinary_id" text DEFAULT '',
	"category" text DEFAULT 'campus' NOT NULL,
	"taken_at" timestamp,
	"featured" boolean DEFAULT false NOT NULL,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"key" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"title" text,
	"subtitle" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"cta_label" text,
	"cta_url" text,
	"featured_ids" jsonb DEFAULT '[]'::jsonb,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"url" text NOT NULL,
	"resource_type" text DEFAULT 'image' NOT NULL,
	"format" text,
	"bytes" integer,
	"width" integer,
	"height" integer,
	"alt_text" text DEFAULT '',
	"uploaded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_assets_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "navigation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"label" text NOT NULL,
	"href" text NOT NULL,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"visibility" boolean DEFAULT true NOT NULL,
	"target" text DEFAULT 'self' NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"attachment_url" text,
	"audience" text DEFAULT 'everyone' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"publish_at" timestamp,
	"expire_at" timestamp,
	"published_at" timestamp,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "public_courses" (
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
);
--> statement-breakpoint
CREATE TABLE "public_faculty" (
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
);
--> statement-breakpoint
CREATE TABLE "public_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session" text,
	"exam" text,
	"class_level" text,
	"student_name" text,
	"rank" text,
	"percentage" numeric(5, 2),
	"grade" text,
	"description" text,
	"result_type" text DEFAULT 'top_performer' NOT NULL,
	"display_date" timestamp,
	"featured" boolean DEFAULT false NOT NULL,
	"cms_status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_by" uuid,
	"updated_by" uuid,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"relationship" text DEFAULT 'student' NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"review" text NOT NULL,
	"profile_image" text,
	"consent" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT 'public' NOT NULL,
	"admin_note" text,
	"reviewed_at" timestamp,
	"reviewed_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"cover_image" text,
	"seo_title" text,
	"seo_description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_by" uuid,
	"updated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "site_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "test_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"test_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"selected_answer" text,
	"answer_text" text,
	"marks_awarded" numeric(10, 2),
	"graded_at" timestamp,
	"graded_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_by" uuid;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievements" ADD CONSTRAINT "achievements_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admissions" ADD CONSTRAINT "admissions_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_versions" ADD CONSTRAINT "cms_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_page_files" ADD CONSTRAINT "custom_page_files_page_id_custom_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."custom_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_page_versions" ADD CONSTRAINT "custom_page_versions_page_id_custom_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."custom_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_page_versions" ADD CONSTRAINT "custom_page_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_pages" ADD CONSTRAINT "custom_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_pages" ADD CONSTRAINT "custom_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_structures" ADD CONSTRAINT "fee_structures_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation_items" ADD CONSTRAINT "navigation_items_parent_id_navigation_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."navigation_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notices" ADD CONSTRAINT "notices_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_courses" ADD CONSTRAINT "public_courses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_courses" ADD CONSTRAINT "public_courses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_faculty" ADD CONSTRAINT "public_faculty_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_faculty" ADD CONSTRAINT "public_faculty_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_results" ADD CONSTRAINT "public_results_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_results" ADD CONSTRAINT "public_results_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_test_id_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."tests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_student_id_users_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_answers" ADD CONSTRAINT "test_answers_graded_by_users_id_fk" FOREIGN KEY ("graded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "achievements_status_idx" ON "achievements" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "achievements_category_idx" ON "achievements" USING btree ("category");--> statement-breakpoint
CREATE INDEX "admissions_session_idx" ON "admissions" USING btree ("session");--> statement-breakpoint
CREATE INDEX "admissions_status_idx" ON "admissions" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "blog_posts_status_idx" ON "blog_posts" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "blog_posts_category_idx" ON "blog_posts" USING btree ("category");--> statement-breakpoint
CREATE INDEX "blog_posts_published_idx" ON "blog_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "cms_versions_section_created_at_idx" ON "cms_versions" USING btree ("section","created_at");--> statement-breakpoint
CREATE INDEX "custom_page_files_page_path_idx" ON "custom_page_files" USING btree ("page_id","path");--> statement-breakpoint
CREATE INDEX "custom_page_versions_page_version_idx" ON "custom_page_versions" USING btree ("page_id","version");--> statement-breakpoint
CREATE INDEX "custom_pages_status_idx" ON "custom_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enquiries_status_idx" ON "enquiries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "enquiries_created_at_idx" ON "enquiries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "events_status_idx" ON "events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "events_event_date_idx" ON "events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "faqs_status_idx" ON "faqs" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "faqs_category_idx" ON "faqs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "fee_structures_session_idx" ON "fee_structures" USING btree ("session");--> statement-breakpoint
CREATE INDEX "fee_structures_status_idx" ON "fee_structures" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "gallery_items_status_idx" ON "gallery_items" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "gallery_items_category_idx" ON "gallery_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "media_assets_resource_type_idx" ON "media_assets" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "media_assets_created_at_idx" ON "media_assets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "navigation_items_position_idx" ON "navigation_items" USING btree ("position");--> statement-breakpoint
CREATE INDEX "notices_status_idx" ON "notices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notices_publish_at_idx" ON "notices" USING btree ("publish_at");--> statement-breakpoint
CREATE INDEX "notices_audience_idx" ON "notices" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "public_courses_status_idx" ON "public_courses" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "public_courses_display_order_idx" ON "public_courses" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "public_courses_featured_idx" ON "public_courses" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "public_faculty_status_idx" ON "public_faculty" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "public_faculty_display_order_idx" ON "public_faculty" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "public_faculty_featured_idx" ON "public_faculty" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "public_results_status_idx" ON "public_results" USING btree ("cms_status");--> statement-breakpoint
CREATE INDEX "public_results_type_idx" ON "public_results" USING btree ("result_type");--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reviews_rating_idx" ON "reviews" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "site_pages_status_idx" ON "site_pages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_answers_test_id_idx" ON "test_answers" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "test_answers_student_id_idx" ON "test_answers" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "test_answers_question_id_idx" ON "test_answers" USING btree ("question_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_deleted_by_users_id_fk" FOREIGN KEY ("deleted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;