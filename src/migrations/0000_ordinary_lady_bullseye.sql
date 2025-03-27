CREATE TABLE "db_account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "db_account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "db_authenticator" (
	"credentialID" text NOT NULL,
	"userId" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"credentialPublicKey" text NOT NULL,
	"counter" integer NOT NULL,
	"credentialDeviceType" text NOT NULL,
	"credentialBackedUp" boolean NOT NULL,
	"transports" text,
	CONSTRAINT "db_authenticator_userId_credentialID_pk" PRIMARY KEY("userId","credentialID"),
	CONSTRAINT "db_authenticator_credentialID_unique" UNIQUE("credentialID")
);
--> statement-breakpoint
CREATE TABLE "db_payment" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255) NOT NULL,
	"orderId" varchar(255),
	"amount" integer,
	"status" varchar(255) NOT NULL,
	"metadata" text DEFAULT '{}',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "db_plan" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"productName" text,
	"variantId" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" text NOT NULL,
	"isUsageBased" boolean DEFAULT false,
	"interval" text,
	"intervalCount" integer,
	"trialInterval" text,
	"trialIntervalCount" integer,
	"sort" integer,
	CONSTRAINT "db_plan_variantId_unique" UNIQUE("variantId")
);
--> statement-breakpoint
CREATE TABLE "db_post" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(256),
	"createdById" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "db_session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "db_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"email" varchar(255) NOT NULL,
	"email_verified" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
	"image" varchar(255),
	"password" varchar(255),
	"github_username" varchar(255),
	"role" varchar(50) DEFAULT 'user' NOT NULL,
	"bio" text,
	"theme" varchar(20) DEFAULT 'system',
	"email_notifications" boolean DEFAULT true,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "db_verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "db_verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "db_account" ADD CONSTRAINT "db_account_userId_db_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."db_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_authenticator" ADD CONSTRAINT "db_authenticator_userId_db_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."db_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_post" ADD CONSTRAINT "db_post_createdById_db_user_id_fk" FOREIGN KEY ("createdById") REFERENCES "public"."db_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "db_session" ADD CONSTRAINT "db_session_userId_db_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."db_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "db_account" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "createdById_idx" ON "db_post" USING btree ("createdById");--> statement-breakpoint
CREATE INDEX "name_idx" ON "db_post" USING btree ("name");