CREATE EXTENSION IF NOT EXISTS pgcrypto;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "document_folders" (
	"document_id" uuid NOT NULL,
	"folder_id" uuid NOT NULL,
	CONSTRAINT "document_folders_document_id_folder_id_pk" PRIMARY KEY("document_id","folder_id")
);
--> statement-breakpoint
CREATE TABLE "document_tags" (
	"document_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "document_tags_document_id_tag_id_pk" PRIMARY KEY("document_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"s3_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"doc_date" date,
	"expiry_date" date,
	"memo" text,
	"uploaded_by" uuid NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "documents_s3_key_unique" UNIQUE("s3_key")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "folders_parent_name_uniq" UNIQUE("parent_id","name")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_folders" ADD CONSTRAINT "document_folders_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_tags" ADD CONSTRAINT "document_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_folders_folder_idx" ON "document_folders" USING btree ("folder_id");--> statement-breakpoint
CREATE INDEX "document_tags_tag_idx" ON "document_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "documents_expiry_idx" ON "documents" USING btree ("expiry_date") WHERE "documents"."expiry_date" is not null;--> statement-breakpoint
CREATE INDEX "documents_title_trgm_idx" ON "documents" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "folders_root_name_uniq" ON "folders" USING btree ("name") WHERE "folders"."parent_id" is null;