-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('OFFICIAL_VISIT', 'CONFERENCE', 'MEETING');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "events_and_visits" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "event_type" "EventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "venue" TEXT NOT NULL,
    "partner_representatives" TEXT NOT NULL,
    "eaii_representatives" TEXT NOT NULL,
    "agreements_reached" TEXT,
    "action_points" TEXT,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_note" TEXT,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "approval_status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approval_note" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "assigned_employee_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_and_visits_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "events_and_visits" ADD CONSTRAINT "events_and_visits_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_and_visits" ADD CONSTRAINT "events_and_visits_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_and_visits" ADD CONSTRAINT "events_and_visits_assigned_employee_id_fkey" FOREIGN KEY ("assigned_employee_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events_and_visits" ADD CONSTRAINT "events_and_visits_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
