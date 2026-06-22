-- CreateEnum
CREATE TYPE "SourceOfOpportunity" AS ENUM ('PARTNER_PROPOSAL', 'MARKET_RESEARCH', 'GOVERNMENT_DIRECTIVE', 'STAKEHOLDER_REFERRAL', 'INTERNAL_INITIATIVE', 'INTERNATIONAL_COLLABORATION', 'OTHER');

-- CreateEnum
CREATE TYPE "OppScreeningStatus" AS ENUM ('PENDING', 'SCREENED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OppVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OppReviewStatus" AS ENUM ('PENDING', 'REVIEWED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OppApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "partnership_opportunities" (
    "id" TEXT NOT NULL,
    "opportunity_code" TEXT,
    "title" TEXT NOT NULL,
    "date_identified" TIMESTAMP(3) NOT NULL,
    "source_of_opportunity" "SourceOfOpportunity" NOT NULL,
    "description" TEXT NOT NULL,
    "strategic_alignment" TEXT[],
    "expected_benefits" TEXT[],
    "screening_status" "OppScreeningStatus" NOT NULL DEFAULT 'PENDING',
    "screening_note" TEXT,
    "screened_by_id" TEXT,
    "screened_at" TIMESTAMP(3),
    "verification_status" "OppVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verification_note" TEXT,
    "verified_by_id" TEXT,
    "verified_at" TIMESTAMP(3),
    "forwarded_to_division_id" TEXT,
    "forwarded_by_id" TEXT,
    "forwarded_at" TIMESTAMP(3),
    "review_status" "OppReviewStatus" NOT NULL DEFAULT 'PENDING',
    "review_note" TEXT,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "approval_status" "OppApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approval_note" TEXT,
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partnership_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "partnership_opportunities_opportunity_code_key" ON "partnership_opportunities"("opportunity_code");

-- CreateIndex
CREATE INDEX "partnership_opportunities_screening_status_idx" ON "partnership_opportunities"("screening_status");

-- CreateIndex
CREATE INDEX "partnership_opportunities_verification_status_idx" ON "partnership_opportunities"("verification_status");

-- CreateIndex
CREATE INDEX "partnership_opportunities_approval_status_idx" ON "partnership_opportunities"("approval_status");

-- CreateIndex
CREATE INDEX "partnership_opportunities_forwarded_to_division_id_idx" ON "partnership_opportunities"("forwarded_to_division_id");

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_screened_by_id_fkey" FOREIGN KEY ("screened_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_forwarded_to_division_id_fkey" FOREIGN KEY ("forwarded_to_division_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_forwarded_by_id_fkey" FOREIGN KEY ("forwarded_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partnership_opportunities" ADD CONSTRAINT "partnership_opportunities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
