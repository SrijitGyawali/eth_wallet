CREATE TABLE IF NOT EXISTS "Wallet" (
	"userId" uuid PRIMARY KEY NOT NULL,
	"ethAddress" varchar(64) NOT NULL,
	"encryptedPrivateKey" text NOT NULL,
	"iv" varchar(64) NOT NULL,
	"tag" varchar(64) NOT NULL,
	"salt" varchar(128) NOT NULL,
	"kdf" varchar(32) DEFAULT 'HKDF-SHA256' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
