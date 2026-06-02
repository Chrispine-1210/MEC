import 'dotenv/config';
import ws from 'ws';
import { Pool, neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_URL_NO_SSL;
if (!connectionString) {
  console.error('No DATABASE_URL found in environment. Ensure .env is present and contains DATABASE_URL');
  process.exit(1);
}

const pool = new Pool({ connectionString });

async function main() {
  try {
    console.log('Checking DB connection...');
    await pool.query('SELECT 1');
    console.log('Connected. Applying migrations...');

    const queries = [
      `INSERT INTO "users" (
        "username", "email", "password", "first_name", "last_name", "role", "is_active", "created_at", "updated_at"
      )
      SELECT
        'admin',
        'admin@mtendere.com',
        '$2b$10$HrYtuAtsyyHXjfsxIUvov.k62GoIru3nNTppES99GEnI8NLnlyU86',
        'Admin',
        'User',
        'super_admin',
        true,
        now(),
        now()
      WHERE NOT EXISTS (
        SELECT 1 FROM "users" WHERE lower("email") = 'admin@mtendere.com' OR lower("username") = 'admin'
      );`,
      `CREATE TABLE IF NOT EXISTS "subscribers" (
        "id" serial PRIMARY KEY NOT NULL,
        "email" varchar(255) NOT NULL,
        "name" text,
        "status" varchar(40) DEFAULT 'pending' NOT NULL,
        "preferences" jsonb,
        "source" varchar(80) DEFAULT 'website',
        "verification_token" text,
        "unsubscribe_token" text,
        "verified_at" timestamp,
        "unsubscribed_at" timestamp,
        "last_email_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now(),
        CONSTRAINT "subscribers_email_unique" UNIQUE("email")
      );`,
      `CREATE INDEX IF NOT EXISTS "subscribers_status_created_idx" ON "subscribers" ("status", "created_at" DESC);`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_verification_token_unique_idx" ON "subscribers" ("verification_token") WHERE "verification_token" IS NOT NULL;`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "subscribers_unsubscribe_token_unique_idx" ON "subscribers" ("unsubscribe_token") WHERE "unsubscribe_token" IS NOT NULL;`,
      `CREATE INDEX IF NOT EXISTS "applications_user_type_reference_idx" ON "applications" ("user_id", "type", "reference_id");`,
      `ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_accepted" boolean DEFAULT false;`,
      `ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_source" varchar(120);`,
      `ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_at" timestamp;`,
      `ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_ip_address" varchar(45);`,
      `ALTER TABLE "subscribers" ADD COLUMN IF NOT EXISTS "consent_user_agent" text;`,
      `CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL,
        "email" varchar(255) NOT NULL,
        "token_hash" varchar(128) NOT NULL,
        "jwt_id" varchar(80) NOT NULL,
        "status" varchar(40) DEFAULT 'pending' NOT NULL,
        "request_ip_address" varchar(45),
        "request_user_agent" text,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "replaced_at" timestamp,
        "created_at" timestamp DEFAULT now()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_hash_idx" ON "email_verification_tokens" ("token_hash");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "email_verification_tokens_jti_idx" ON "email_verification_tokens" ("jwt_id");`,
      `CREATE INDEX IF NOT EXISTS "email_verification_tokens_user_status_idx" ON "email_verification_tokens" ("user_id", "status");`,
      `CREATE INDEX IF NOT EXISTS "email_verification_tokens_email_created_idx" ON "email_verification_tokens" ("email", "created_at");`,
      `CREATE INDEX IF NOT EXISTS "email_verification_tokens_expiry_idx" ON "email_verification_tokens" ("expires_at");`,
      `CREATE TABLE IF NOT EXISTS "email_jobs" (
        "id" varchar(36) PRIMARY KEY NOT NULL,
        "category" varchar(100) NOT NULL,
        "recipient" varchar(255) NOT NULL,
        "subject" text NOT NULL,
        "payload" jsonb NOT NULL,
        "metadata" jsonb,
        "status" varchar(40) DEFAULT 'queued' NOT NULL,
        "priority" integer DEFAULT 100 NOT NULL,
        "attempts" integer DEFAULT 0 NOT NULL,
        "max_attempts" integer DEFAULT 5 NOT NULL,
        "provider" varchar(40),
        "provider_message_id" text,
        "scheduled_for" timestamp DEFAULT now() NOT NULL,
        "processing_at" timestamp,
        "sent_at" timestamp,
        "failed_at" timestamp,
        "last_error" text,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS "email_jobs_status_schedule_idx" ON "email_jobs" ("status", "scheduled_for");`,
      `CREATE INDEX IF NOT EXISTS "email_jobs_category_status_idx" ON "email_jobs" ("category", "status");`,
      `CREATE INDEX IF NOT EXISTS "email_jobs_recipient_idx" ON "email_jobs" ("recipient");`,
      `CREATE INDEX IF NOT EXISTS "email_jobs_provider_message_idx" ON "email_jobs" ("provider_message_id");`,
      `CREATE TABLE IF NOT EXISTS "email_delivery_events" (
        "id" serial PRIMARY KEY NOT NULL,
        "job_id" varchar(36),
        "provider" varchar(40),
        "event_type" varchar(80) NOT NULL,
        "recipient" varchar(255),
        "category" varchar(100),
        "provider_message_id" text,
        "metadata" jsonb,
        "ip_address" varchar(45),
        "user_agent" text,
        "created_at" timestamp DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS "email_delivery_events_job_idx" ON "email_delivery_events" ("job_id");`,
      `CREATE INDEX IF NOT EXISTS "email_delivery_events_type_created_idx" ON "email_delivery_events" ("event_type", "created_at");`,
      `CREATE INDEX IF NOT EXISTS "email_delivery_events_category_created_idx" ON "email_delivery_events" ("category", "created_at");`,
      `CREATE INDEX IF NOT EXISTS "email_delivery_events_provider_message_idx" ON "email_delivery_events" ("provider_message_id");`,
      `CREATE TABLE IF NOT EXISTS "email_preferences" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer,
        "email" varchar(255) NOT NULL,
        "categories" jsonb NOT NULL,
        "consent_status" varchar(40) DEFAULT 'pending' NOT NULL,
        "consent_source" varchar(120),
        "consent_at" timestamp,
        "unsubscribed_at" timestamp,
        "unsubscribe_token_hash" varchar(128) NOT NULL,
        "audit_trail" jsonb,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "email_preferences_email_idx" ON "email_preferences" ("email");`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "email_preferences_token_hash_idx" ON "email_preferences" ("unsubscribe_token_hash");`,
      `CREATE INDEX IF NOT EXISTS "email_preferences_user_idx" ON "email_preferences" ("user_id");`,
      `CREATE INDEX IF NOT EXISTS "email_preferences_status_idx" ON "email_preferences" ("consent_status");`,
      `CREATE TABLE IF NOT EXISTS "email_template_versions" (
        "id" serial PRIMARY KEY NOT NULL,
        "template_key" varchar(120) NOT NULL,
        "version" integer DEFAULT 1 NOT NULL,
        "status" varchar(40) DEFAULT 'draft' NOT NULL,
        "subject" text NOT NULL,
        "preheader" text,
        "html" text NOT NULL,
        "text_body" text NOT NULL,
        "variables" jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "email_template_versions_key_version_idx" ON "email_template_versions" ("template_key", "version");`,
      `CREATE INDEX IF NOT EXISTS "email_template_versions_key_status_idx" ON "email_template_versions" ("template_key", "status");`,
      `CREATE TABLE IF NOT EXISTS "email_campaigns" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "category" varchar(100) NOT NULL,
        "status" varchar(40) DEFAULT 'draft' NOT NULL,
        "subject" text NOT NULL,
        "audience_segment" jsonb,
        "template_key" varchar(120),
        "scheduled_for" timestamp,
        "sent_at" timestamp,
        "metrics" jsonb,
        "created_by" integer,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS "email_campaigns_status_schedule_idx" ON "email_campaigns" ("status", "scheduled_for");`,
      `CREATE INDEX IF NOT EXISTS "email_campaigns_category_idx" ON "email_campaigns" ("category");`,
      `ALTER TABLE "blog_posts" ADD COLUMN IF NOT EXISTS "likes" integer DEFAULT 0;`,
      `UPDATE "blog_posts"
      SET "is_published" = false, "updated_at" = now()
      WHERE "title" = ANY(ARRAY[
        'Top 10 Scholarships for Malawian Students in 2026',
        'How to Write a Winning Statement of Purpose',
        'Life as a Malawian Student in Germany: A Complete Guide',
        'Building a Career in International Development: A Roadmap',
        'Student Visa Success: Avoiding Common Rejection Reasons',
        'The Power of Networking: How to Build Connections That Launch Careers'
      ]);`,
      `WITH seed(title, event_date, category, image_url, tags, excerpt, content, likes) AS (
        VALUES
          (
            'India Education Expo 2024 at Crossroads Hotel',
            '2024-02-10 09:00:00'::timestamp,
            'Events',
            'events/IMG-20250321-WA0250.jpg',
            ARRAY['India','Education Expo','Events']::text[],
            'The India Education Expo 2024 connected Indian education officials, Malawian stakeholders, parents, and prospective students at Crossroads Hotel.',
            $$# India Education Expo 2024 at Crossroads Hotel
The India Education Expo 2024 was held at Crossroads Hotel, bringing together Indian education officials, Malawian stakeholders, parents, and prospective students. The event created a practical platform for students to compare academic pathways, understand scholarship options, and speak directly with people connected to Indian higher education.

## A platform for international opportunity
The expo showcased the range of academic opportunities available in India, from undergraduate pathways to postgraduate progression. Students and families received firsthand guidance on admissions expectations, program selection, documentation, campus life, and the realities of preparing for study abroad.

## Why the expo mattered
For many students, international education can feel distant until they meet representatives and advisors who can explain the journey clearly. The Crossroads Hotel expo made that process more transparent by bringing information, counseling, and institutional relationships into one room.

## What students and parents gained
- Direct exposure to Indian education pathways and available programs.
- A clearer understanding of scholarships, tuition planning, and application readiness.
- Space to ask practical questions about visas, accommodation, student support, and cultural adjustment.
- Confidence that study in India can be planned through credible guidance and structured preparation.

## Strengthening Malawi-India education links
The event highlighted the growing partnership between Malawi and India in higher education. It also reinforced Mtendere Education Consult's role as a bridge between students in Malawi and international institutions that can open doors for their academic and professional growth.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$,
            84
          ),
          (
            'Celebrating 50+ Students Awarded Partial Scholarships to India',
            '2022-07-16 10:00:00'::timestamp,
            'Scholarships',
            'events/IMG-20221029-WA0058.jpg',
            ARRAY['Scholarships','India','Mentorship']::text[],
            'A mentorship and send-off ceremony celebrated more than 50 students who secured partial scholarships to pursue studies in India.',
            $$# Celebrating 50+ Students Awarded Partial Scholarships to India
On July 16, 2022, Mtendere Education Consult hosted a mentorship and send-off ceremony to celebrate more than 50 students who secured partial scholarships to study in India. The gathering recognized the students' hard work while preparing them emotionally and practically for the next stage of their academic journey.

## A moment of recognition and responsibility
The ceremony was more than a celebration. It was a reminder that every scholarship comes with responsibility: to study with discipline, represent Malawi well, support one another abroad, and return with knowledge that can contribute to families, communities, and the country.

## Guidance from respected guests
The guest of honour was Justice Gloria Nomondwe of the High Court. She was joined by Dr. Naomi Mvula of LUANAR and Mr. Phiri from the Ministry of Foreign Affairs. Their words encouraged students to approach the opportunity with humility, courage, and seriousness of purpose.

## Mentorship before departure
Students received practical encouragement on adjusting to a new country, staying focused, managing expectations, and building healthy academic routines. Families also had a chance to understand the transition and celebrate the achievement with pride.

## Why this milestone matters
More than 50 students earning partial scholarships represents a powerful signal: Malawian students can compete for international opportunities when they receive the right information, preparation, and mentorship. The ceremony strengthened Mtendere's commitment to scholarship access and student success.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$,
            96
          ),
          (
            'Students Departure at Kamuzu International Airport',
            '2023-09-05 08:00:00'::timestamp,
            'Study Abroad',
            'events/IMG-20220907-WA0124.jpg',
            ARRAY['Departure','Study Abroad','Student Journey']::text[],
            'Students departing from Kamuzu International Airport began a new chapter in their international education journey with support from families and mentors.',
            $$# Students Departure at Kamuzu International Airport
The departure of students from Kamuzu International Airport marked the beginning of a new chapter in their educational journey. Families, friends, and mentors gathered to bid farewell with pride, emotion, and encouragement as the students prepared to continue their studies abroad.

## The meaning behind the departure
Every airport farewell carries a bigger story. For these students, the journey represented years of effort, family sacrifice, academic ambition, and the belief that international education can expand what is possible for young Malawians.

## Support beyond the ticket
Before departure, students were guided on travel readiness, documentation, expectations abroad, communication with families, and the importance of staying connected to their goals. This kind of preparation helps students move with more confidence and less uncertainty.

## Carrying Malawi into the world
The moment symbolized not only the pursuit of academic dreams but also the strengthening of Malawi's global presence through its students abroad. Each student carried the hopes of their communities and the responsibility to learn, grow, and make an impact.

## A journey that continues
Departure is not the end of the support process. Mtendere continues to encourage students to remain focused, seek help when needed, build strong networks, and use their international exposure to become more capable contributors wherever their path leads.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$,
            71
          ),
          (
            'European Education Expo with GEDU at Crossroads Hotel',
            '2023-10-22 09:00:00'::timestamp,
            'Partnerships',
            'events/IMG-20230311-WA0110.jpg',
            ARRAY['Europe','Education Expo','Partnerships']::text[],
            'Mtendere Education Consult and GEDU hosted a European Education Expo at Crossroads Hotel for students, principals, and education-sector stakeholders.',
            $$# European Education Expo with GEDU at Crossroads Hotel
The European Education Expo, hosted by Mtendere Education Consult in collaboration with GEDU, was a remarkable event at Crossroads Hotel. It brought together senior students, principals, organizations, and stakeholders from the education sector to explore study opportunities connected to Europe.

## Connecting students to European pathways
The expo gave Malawian students a chance to learn about European institutions, available programs, admission expectations, and the wider benefits of international exposure. It also helped students understand how to compare destinations and choose pathways that match their goals.

## A strong partnership moment
Working with GEDU strengthened the credibility and reach of the event. The collaboration demonstrated how international partnerships can help students access better information, clearer options, and structured support before making major education decisions.

## Value for schools and stakeholders
Principals and education leaders were able to see how international study pathways can complement local academic preparation. Organizations and stakeholders also had space to connect around shared goals: student mobility, responsible guidance, and improved access to global learning.

## Mtendere's bridge-building role
The expo underscored Mtendere's role in bridging international opportunities for young scholars. By bringing institutions, schools, families, and students together, the event turned interest in Europe into a more informed and actionable education conversation.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$,
            79
          )
      )
      INSERT INTO "blog_posts" ("title", "content", "excerpt", "image_url", "category", "tags", "is_published", "author_id", "likes", "created_at", "updated_at")
      SELECT
        title,
        content,
        excerpt,
        image_url,
        category,
        tags,
        true,
        COALESCE(
          (SELECT "id" FROM "users" WHERE lower("email") = 'admin@mtendere.com' LIMIT 1),
          (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1),
          1
        ),
        likes,
        event_date,
        now()
      FROM seed
      WHERE NOT EXISTS (
        SELECT 1 FROM "blog_posts" existing WHERE lower(existing."title") = lower(seed.title)
      );`,
      `WITH seed(title, event_date, category, image_url, tags, excerpt, content, likes) AS (
        VALUES
          ('India Education Expo 2024 at Crossroads Hotel', '2024-02-10 09:00:00'::timestamp, 'Events', 'events/IMG-20250321-WA0250.jpg', ARRAY['India','Education Expo','Events']::text[], 'The India Education Expo 2024 connected Indian education officials, Malawian stakeholders, parents, and prospective students at Crossroads Hotel.', $$# India Education Expo 2024 at Crossroads Hotel
The India Education Expo 2024 was held at Crossroads Hotel, bringing together Indian education officials, Malawian stakeholders, parents, and prospective students. The event created a practical platform for students to compare academic pathways, understand scholarship options, and speak directly with people connected to Indian higher education.

## A platform for international opportunity
The expo showcased the range of academic opportunities available in India, from undergraduate pathways to postgraduate progression. Students and families received firsthand guidance on admissions expectations, program selection, documentation, campus life, and the realities of preparing for study abroad.

## Why the expo mattered
For many students, international education can feel distant until they meet representatives and advisors who can explain the journey clearly. The Crossroads Hotel expo made that process more transparent by bringing information, counseling, and institutional relationships into one room.

## What students and parents gained
- Direct exposure to Indian education pathways and available programs.
- A clearer understanding of scholarships, tuition planning, and application readiness.
- Space to ask practical questions about visas, accommodation, student support, and cultural adjustment.
- Confidence that study in India can be planned through credible guidance and structured preparation.

## Strengthening Malawi-India education links
The event highlighted the growing partnership between Malawi and India in higher education. It also reinforced Mtendere Education Consult's role as a bridge between students in Malawi and international institutions that can open doors for their academic and professional growth.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$, 84),
          ('Celebrating 50+ Students Awarded Partial Scholarships to India', '2022-07-16 10:00:00'::timestamp, 'Scholarships', 'events/IMG-20221029-WA0058.jpg', ARRAY['Scholarships','India','Mentorship']::text[], 'A mentorship and send-off ceremony celebrated more than 50 students who secured partial scholarships to pursue studies in India.', $$# Celebrating 50+ Students Awarded Partial Scholarships to India
On July 16, 2022, Mtendere Education Consult hosted a mentorship and send-off ceremony to celebrate more than 50 students who secured partial scholarships to study in India. The gathering recognized the students' hard work while preparing them emotionally and practically for the next stage of their academic journey.

## A moment of recognition and responsibility
The ceremony was more than a celebration. It was a reminder that every scholarship comes with responsibility: to study with discipline, represent Malawi well, support one another abroad, and return with knowledge that can contribute to families, communities, and the country.

## Guidance from respected guests
The guest of honour was Justice Gloria Nomondwe of the High Court. She was joined by Dr. Naomi Mvula of LUANAR and Mr. Phiri from the Ministry of Foreign Affairs. Their words encouraged students to approach the opportunity with humility, courage, and seriousness of purpose.

## Mentorship before departure
Students received practical encouragement on adjusting to a new country, staying focused, managing expectations, and building healthy academic routines. Families also had a chance to understand the transition and celebrate the achievement with pride.

## Why this milestone matters
More than 50 students earning partial scholarships represents a powerful signal: Malawian students can compete for international opportunities when they receive the right information, preparation, and mentorship. The ceremony strengthened Mtendere's commitment to scholarship access and student success.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$, 96),
          ('Students Departure at Kamuzu International Airport', '2023-09-05 08:00:00'::timestamp, 'Study Abroad', 'events/IMG-20220907-WA0124.jpg', ARRAY['Departure','Study Abroad','Student Journey']::text[], 'Students departing from Kamuzu International Airport began a new chapter in their international education journey with support from families and mentors.', $$# Students Departure at Kamuzu International Airport
The departure of students from Kamuzu International Airport marked the beginning of a new chapter in their educational journey. Families, friends, and mentors gathered to bid farewell with pride, emotion, and encouragement as the students prepared to continue their studies abroad.

## The meaning behind the departure
Every airport farewell carries a bigger story. For these students, the journey represented years of effort, family sacrifice, academic ambition, and the belief that international education can expand what is possible for young Malawians.

## Support beyond the ticket
Before departure, students were guided on travel readiness, documentation, expectations abroad, communication with families, and the importance of staying connected to their goals. This kind of preparation helps students move with more confidence and less uncertainty.

## Carrying Malawi into the world
The moment symbolized not only the pursuit of academic dreams but also the strengthening of Malawi's global presence through its students abroad. Each student carried the hopes of their communities and the responsibility to learn, grow, and make an impact.

## A journey that continues
Departure is not the end of the support process. Mtendere continues to encourage students to remain focused, seek help when needed, build strong networks, and use their international exposure to become more capable contributors wherever their path leads.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$, 71),
          ('European Education Expo with GEDU at Crossroads Hotel', '2023-10-22 09:00:00'::timestamp, 'Partnerships', 'events/IMG-20230311-WA0110.jpg', ARRAY['Europe','Education Expo','Partnerships']::text[], 'Mtendere Education Consult and GEDU hosted a European Education Expo at Crossroads Hotel for students, principals, and education-sector stakeholders.', $$# European Education Expo with GEDU at Crossroads Hotel
The European Education Expo, hosted by Mtendere Education Consult in collaboration with GEDU, was a remarkable event at Crossroads Hotel. It brought together senior students, principals, organizations, and stakeholders from the education sector to explore study opportunities connected to Europe.

## Connecting students to European pathways
The expo gave Malawian students a chance to learn about European institutions, available programs, admission expectations, and the wider benefits of international exposure. It also helped students understand how to compare destinations and choose pathways that match their goals.

## A strong partnership moment
Working with GEDU strengthened the credibility and reach of the event. The collaboration demonstrated how international partnerships can help students access better information, clearer options, and structured support before making major education decisions.

## Value for schools and stakeholders
Principals and education leaders were able to see how international study pathways can complement local academic preparation. Organizations and stakeholders also had space to connect around shared goals: student mobility, responsible guidance, and improved access to global learning.

## Mtendere's bridge-building role
The expo underscored Mtendere's role in bridging international opportunities for young scholars. By bringing institutions, schools, families, and students together, the event turned interest in Europe into a more informed and actionable education conversation.

## About the Author
Mtendere Education Consult is an education consultancy committed to creating international opportunities for students across Malawi through guidance, partnerships, mentorship, and transparent application support.$$, 79)
      )
      UPDATE "blog_posts"
      SET
        "content" = seed.content,
        "excerpt" = seed.excerpt,
        "image_url" = seed.image_url,
        "category" = seed.category,
        "tags" = seed.tags,
        "is_published" = true,
        "likes" = GREATEST(COALESCE("blog_posts"."likes", 0), seed.likes),
        "created_at" = seed.event_date,
        "updated_at" = now()
      FROM seed
      WHERE lower("blog_posts"."title") = lower(seed.title);`,
      `ALTER TABLE "team_members" ADD COLUMN IF NOT EXISTS "display_order" integer DEFAULT 0;`,
      `ALTER TABLE "partners" ADD COLUMN IF NOT EXISTS "student_count" integer;`,
      `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "author_name" text;`,
      `ALTER TABLE "testimonials" ADD COLUMN IF NOT EXISTS "credential" text;`,
      `CREATE TABLE IF NOT EXISTS "events" (
        "id" serial PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "slug" varchar(180) NOT NULL UNIQUE,
        "summary" text,
        "description" text NOT NULL,
        "category" varchar(100) DEFAULT 'General' NOT NULL,
        "event_type" varchar(80) DEFAULT 'Information Session' NOT NULL,
        "location" text DEFAULT 'Lilongwe, Malawi' NOT NULL,
        "venue_name" text,
        "address" text,
        "map_url" text,
        "is_virtual" boolean DEFAULT false,
        "virtual_url" text,
        "livestream_url" text,
        "is_paid" boolean DEFAULT false,
        "price_amount" integer DEFAULT 0,
        "currency" varchar(10) DEFAULT 'MWK',
        "capacity" integer,
        "start_at" timestamp NOT NULL,
        "end_at" timestamp NOT NULL,
        "registration_deadline" timestamp,
        "cover_image" text,
        "video_url" text,
        "tags" text[],
        "agenda" jsonb,
        "speakers" jsonb,
        "sponsors" jsonb,
        "faqs" jsonb,
        "resources" jsonb,
        "gallery" jsonb,
        "status" varchar(40) DEFAULT 'draft' NOT NULL,
        "is_featured" boolean DEFAULT false,
        "is_recommended" boolean DEFAULT false,
        "is_trending" boolean DEFAULT false,
        "allow_comments" boolean DEFAULT true,
        "requires_approval" boolean DEFAULT false,
        "view_count" integer DEFAULT 0,
        "share_count" integer DEFAULT 0,
        "like_count" integer DEFAULT 0,
        "created_by" integer NOT NULL,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      `CREATE UNIQUE INDEX IF NOT EXISTS "events_slug_idx" ON "events" ("slug");`,
      `CREATE INDEX IF NOT EXISTS "events_status_idx" ON "events" ("status");`,
      `CREATE INDEX IF NOT EXISTS "events_start_at_idx" ON "events" ("start_at");`,
      `CREATE INDEX IF NOT EXISTS "events_category_idx" ON "events" ("category");`,
      `CREATE TABLE IF NOT EXISTS "event_registrations" (
        "id" serial PRIMARY KEY NOT NULL,
        "event_id" integer NOT NULL,
        "user_id" integer,
        "full_name" text NOT NULL,
        "email" varchar(255) NOT NULL,
        "phone" varchar(40),
        "organization" text,
        "status" varchar(40) DEFAULT 'pending' NOT NULL,
        "ticket_code" varchar(80) NOT NULL UNIQUE,
        "attendance_status" varchar(40) DEFAULT 'registered' NOT NULL,
        "answers" jsonb,
        "reminder_opt_in" boolean DEFAULT true,
        "checked_in_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS "event_registrations_event_idx" ON "event_registrations" ("event_id");`,
      `CREATE INDEX IF NOT EXISTS "event_registrations_email_idx" ON "event_registrations" ("email");`,
      `CREATE INDEX IF NOT EXISTS "event_registrations_status_idx" ON "event_registrations" ("status");`,
      `CREATE TABLE IF NOT EXISTS "event_comments" (
        "id" serial PRIMARY KEY NOT NULL,
        "event_id" integer NOT NULL,
        "user_id" integer,
        "parent_id" integer,
        "author_name" text NOT NULL,
        "author_email" varchar(255),
        "content" text NOT NULL,
        "status" varchar(40) DEFAULT 'approved' NOT NULL,
        "report_count" integer DEFAULT 0,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS "event_comments_event_idx" ON "event_comments" ("event_id");`,
      `CREATE INDEX IF NOT EXISTS "event_comments_status_idx" ON "event_comments" ("status");`,
      `CREATE TABLE IF NOT EXISTS "event_reactions" (
        "id" serial PRIMARY KEY NOT NULL,
        "event_id" integer NOT NULL,
        "user_id" integer,
        "visitor_id" varchar(120),
        "reaction" varchar(40) DEFAULT 'like' NOT NULL,
        "created_at" timestamp DEFAULT now()
      );`,
      `CREATE INDEX IF NOT EXISTS "event_reactions_event_idx" ON "event_reactions" ("event_id");`,
      `WITH seed(name, position, bio, image_url, linkedin, display_order) AS (
        VALUES
          ('Mr. Rabson Kaluwile', 'Board Chairperson', 'MSc. Environmental Health, University of Dundee, Scotland. Provides board leadership and governance oversight for Mtendere Education Consult.', 'team/mr. rabson.jpg', 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 1),
          ('Dr. Daniel S. Nyangulu', 'Board Member', 'MB ChB, University of Manchester, England. Contributes board-level guidance informed by medical training and professional judgment.', 'team/dr. daniel.jpg', 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 2),
          ('Dr. Gabriella Chiutsi Phiri', 'Board Member', 'PhD in Rural Development and Extension. Brings rural development and extension expertise to Mtendere''s governance and community impact work.', NULL, 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 3),
          ('Brenda Gondwe', 'Board Member', 'BA in Leadership and Management. Supports the board with leadership and management insight.', 'team/ms brenda.jpg', 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 4),
          ('Brenda Tawina Kumwembe', 'Lead Consultant', 'BA in Management and Public Relations. Leads consulting work across student guidance, public relations, and client support.', 'team/Brend tawina.jpg', NULL, 5),
          ('George Kaluwile', 'Chief Marketing Officer', 'BA in International Management. Guides marketing and growth efforts for Mtendere.', 'team/george.jpg', NULL, 6),
          ('Christopher Nazonse Waluza', 'Admissions Coordinator', 'BA in Development Studies. Coordinates admissions support and application workflows.', 'team/christoper.jpg', NULL, 7),
          ('Timothy Mahwayo', 'Admin and Finance Officer', 'Accounting. Supports administration and finance functions for reliable student service delivery.', 'team/timothy.jpg', NULL, 8)
      )
      INSERT INTO "team_members" ("name", "position", "bio", "image_url", "linkedin", "display_order", "is_active")
      SELECT name, position, bio, image_url, linkedin, display_order, true
      FROM seed
      WHERE NOT EXISTS (
        SELECT 1 FROM "team_members" existing WHERE lower(existing."name") = lower(seed.name)
      );`,
      `WITH seed(name, position, bio, image_url, linkedin, display_order) AS (
        VALUES
          ('Mr. Rabson Kaluwile', 'Board Chairperson', 'MSc. Environmental Health, University of Dundee, Scotland. Provides board leadership and governance oversight for Mtendere Education Consult.', 'team/mr. rabson.jpg', 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 1),
          ('Dr. Daniel S. Nyangulu', 'Board Member', 'MB ChB, University of Manchester, England. Contributes board-level guidance informed by medical training and professional judgment.', 'team/dr. daniel.jpg', 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 2),
          ('Dr. Gabriella Chiutsi Phiri', 'Board Member', 'PhD in Rural Development and Extension. Brings rural development and extension expertise to Mtendere''s governance and community impact work.', NULL, 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 3),
          ('Brenda Gondwe', 'Board Member', 'BA in Leadership and Management. Supports the board with leadership and management insight.', 'team/ms brenda.jpg', 'https://www.linkedin.com/in/mtendere-education-consult-478133298/', 4),
          ('Brenda Tawina Kumwembe', 'Lead Consultant', 'BA in Management and Public Relations. Leads consulting work across student guidance, public relations, and client support.', 'team/Brend tawina.jpg', NULL, 5),
          ('George Kaluwile', 'Chief Marketing Officer', 'BA in International Management. Guides marketing and growth efforts for Mtendere.', 'team/george.jpg', NULL, 6),
          ('Christopher Nazonse Waluza', 'Admissions Coordinator', 'BA in Development Studies. Coordinates admissions support and application workflows.', 'team/christoper.jpg', NULL, 7),
          ('Timothy Mahwayo', 'Admin and Finance Officer', 'Accounting. Supports administration and finance functions for reliable student service delivery.', 'team/timothy.jpg', NULL, 8)
      )
      UPDATE "team_members"
      SET
        "position" = seed.position,
        "bio" = seed.bio,
        "image_url" = seed.image_url,
        "linkedin" = seed.linkedin,
        "display_order" = seed.display_order,
        "is_active" = true,
        "updated_at" = now()
      FROM seed
      WHERE lower("team_members"."name") = lower(seed.name);`,
      `DELETE FROM "testimonials"
      WHERE "author_name" IS NULL OR btrim("author_name") = '';`,
      `WITH seed(sort_order, author_name, credential, content, rating, image_url) AS (
        VALUES
          (0, 'Janet Kandulu', 'Bs Nutrition and Dietetics, Chandigarh University', 'Mtendere Education Consult helped me get into my dream university in India. Their guidance through the entire process was invaluable!', 5, 'students/Janet Kandulu.jpg'),
          (1, 'Edna Karonga', 'Masters Degree in Business Administration, Chandigarh university', 'The team at Mtendere made my application process seamless and stress-free.', 5, 'students/Edna Kalonga.jpg'),
          (2, 'Ian Ndola', 'MBA, University of Alabama USA', 'When I was lost about where to start, Mtendere Education Consult provided the clarity and support I needed to pursue my studies abroad.', 5, 'students/Ian Ndola.jpg')
      )
      INSERT INTO "testimonials" ("user_id", "author_name", "credential", "content", "rating", "image_url", "is_approved", "created_at", "updated_at")
      SELECT
        COALESCE(
          (SELECT "id" FROM "users" WHERE lower("email") = 'admin@mtendere.com' LIMIT 1),
          (SELECT "id" FROM "users" ORDER BY "id" LIMIT 1),
          1
        ),
        author_name,
        credential,
        content,
        rating,
        image_url,
        true,
        now() - (sort_order * interval '1 minute'),
        now()
      FROM seed
      WHERE NOT EXISTS (
        SELECT 1 FROM "testimonials" existing WHERE lower(existing."author_name") = lower(seed.author_name)
      );`,
      `WITH seed(sort_order, author_name, credential, content, rating, image_url) AS (
        VALUES
          (0, 'Janet Kandulu', 'Bs Nutrition and Dietetics, Chandigarh University', 'Mtendere Education Consult helped me get into my dream university in India. Their guidance through the entire process was invaluable!', 5, 'students/Janet Kandulu.jpg'),
          (1, 'Edna Karonga', 'Masters Degree in Business Administration, Chandigarh university', 'The team at Mtendere made my application process seamless and stress-free.', 5, 'students/Edna Kalonga.jpg'),
          (2, 'Ian Ndola', 'MBA, University of Alabama USA', 'When I was lost about where to start, Mtendere Education Consult provided the clarity and support I needed to pursue my studies abroad.', 5, 'students/Ian Ndola.jpg')
      )
      UPDATE "testimonials"
      SET
        "credential" = seed.credential,
        "content" = seed.content,
        "rating" = seed.rating,
        "image_url" = seed.image_url,
        "is_approved" = true,
        "created_at" = now() - (seed.sort_order * interval '1 minute'),
        "updated_at" = now()
      FROM seed
      WHERE lower("testimonials"."author_name") = lower(seed.author_name);`,
      `INSERT INTO "events" (
        "title", "slug", "summary", "description", "category", "event_type", "location", "venue_name", "address",
        "is_virtual", "is_paid", "price_amount", "currency", "capacity", "start_at", "end_at", "registration_deadline",
        "cover_image", "tags", "agenda", "speakers", "faqs", "resources", "status", "is_featured",
        "is_recommended", "is_trending", "allow_comments", "requires_approval", "created_by", "updated_at"
      )
      VALUES
        (
          'Scholarship Application Masterclass',
          'scholarship-application-masterclass',
          'A practical workshop for students preparing competitive scholarship applications.',
          'Join Mtendere consultants for a hands-on scholarship application masterclass covering opportunity matching, personal statements, recommendation planning, document readiness, and interview preparation.',
          'Scholarships',
          'Workshop',
          'Lilongwe, Malawi',
          'Mtendere Education Consult',
          'Lilongwe, Malawi',
          false,
          false,
          0,
          'MWK',
          120,
          '2026-06-12 08:30:00',
          '2026-06-12 12:30:00',
          '2026-06-10 17:00:00',
          'events/events-default.jpg',
          ARRAY['scholarships', 'applications', 'students'],
          '[{"time":"08:30","title":"Registration and orientation"},{"time":"09:00","title":"Building a competitive scholarship profile"},{"time":"10:30","title":"Document review clinic"},{"time":"11:30","title":"Questions and next steps"}]'::jsonb,
          '[{"name":"Brenda Tawina Kumwembe","role":"Lead Consultant"},{"name":"Christopher Nazonse Waluza","role":"Admissions Coordinator"}]'::jsonb,
          '[{"question":"Is this event free?","answer":"Yes, registration is free but seats are limited."}]'::jsonb,
          '[{"title":"Scholarship readiness checklist","description":"Shared with registered attendees after confirmation."}]'::jsonb,
          'published',
          true,
          true,
          true,
          true,
          false,
          1,
          now()
        ),
        (
          'Virtual Study Abroad Briefing',
          'virtual-study-abroad-briefing',
          'A live online briefing on choosing destinations, timelines, funding, and visa readiness.',
          'This virtual session helps students and families compare study abroad pathways, understand application timelines, prepare funding plans, and ask questions directly to Mtendere advisors.',
          'Study Abroad',
          'Virtual Briefing',
          'Online',
          'Online',
          NULL,
          true,
          false,
          0,
          'MWK',
          300,
          '2026-05-30 18:00:00',
          '2026-05-30 20:00:00',
          '2026-05-30 12:00:00',
          'events/events-default.jpg',
          ARRAY['study abroad', 'virtual', 'briefing'],
          '[{"time":"18:00","title":"Destination and program fit"},{"time":"18:45","title":"Funding and scholarship planning"},{"time":"19:20","title":"Visa readiness questions"}]'::jsonb,
          '[{"name":"Mtendere Education Consult","role":"Host"}]'::jsonb,
          '[{"question":"How do I join?","answer":"Registered attendees receive the virtual event link in their confirmation details."}]'::jsonb,
          '[{"title":"Study abroad planning sheet","description":"Shared after registration."}]'::jsonb,
          'published',
          true,
          true,
          false,
          true,
          false,
          1,
          now()
        ),
        (
          'Career Readiness and CV Review Day',
          'career-readiness-cv-review-day',
          'A practical review day for CVs, interviews, job search planning, and graduate readiness.',
          'Students and job seekers can receive structured feedback on CVs, learn interview preparation basics, and map a more focused job search strategy with the Mtendere team.',
          'Career',
          'Clinic',
          'Lilongwe, Malawi',
          'Mtendere Education Consult',
          'Lilongwe, Malawi',
          false,
          false,
          0,
          'MWK',
          80,
          '2026-06-20 09:00:00',
          '2026-06-20 13:00:00',
          '2026-06-18 17:00:00',
          'events/events-default.jpg',
          ARRAY['career', 'cv', 'jobs'],
          '[{"time":"09:00","title":"Career readiness briefing"},{"time":"10:00","title":"CV review rotations"},{"time":"12:00","title":"Interview preparation and closing"}]'::jsonb,
          '[{"name":"George Kaluwile","role":"Chief Marketing Officer"},{"name":"Timothy Mahwayo","role":"Admin and Finance Officer"}]'::jsonb,
          '[{"question":"Should I bring my CV?","answer":"Yes, bring a printed or digital copy for review."}]'::jsonb,
          '[{"title":"CV review notes","description":"Provided during the clinic."}]'::jsonb,
          'published',
          false,
          true,
          true,
          true,
          true,
          1,
          now()
        )
      ON CONFLICT ("slug") DO UPDATE SET
        "title" = EXCLUDED."title",
        "summary" = EXCLUDED."summary",
        "description" = EXCLUDED."description",
        "category" = EXCLUDED."category",
        "event_type" = EXCLUDED."event_type",
        "location" = EXCLUDED."location",
        "venue_name" = EXCLUDED."venue_name",
        "address" = EXCLUDED."address",
        "is_virtual" = EXCLUDED."is_virtual",
        "is_paid" = EXCLUDED."is_paid",
        "price_amount" = EXCLUDED."price_amount",
        "currency" = EXCLUDED."currency",
        "capacity" = EXCLUDED."capacity",
        "start_at" = EXCLUDED."start_at",
        "end_at" = EXCLUDED."end_at",
        "registration_deadline" = EXCLUDED."registration_deadline",
        "cover_image" = EXCLUDED."cover_image",
        "tags" = EXCLUDED."tags",
        "agenda" = EXCLUDED."agenda",
        "speakers" = EXCLUDED."speakers",
        "faqs" = EXCLUDED."faqs",
        "resources" = EXCLUDED."resources",
        "status" = EXCLUDED."status",
        "is_featured" = EXCLUDED."is_featured",
        "is_recommended" = EXCLUDED."is_recommended",
        "is_trending" = EXCLUDED."is_trending",
        "allow_comments" = EXCLUDED."allow_comments",
        "requires_approval" = EXCLUDED."requires_approval",
        "updated_at" = now();`,
    ];

    for (const q of queries) {
      console.log('Executing:', q);
      await pool.query(q);
      console.log('OK');
    }

    console.log('Migrations applied successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
