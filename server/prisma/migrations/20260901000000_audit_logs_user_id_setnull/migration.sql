-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

