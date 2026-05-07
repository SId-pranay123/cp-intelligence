-- AlterTable
ALTER TABLE "user_problem_activity" ADD COLUMN     "next_review_at" TIMESTAMP(3),
ADD COLUMN     "review_count" INTEGER NOT NULL DEFAULT 0;
