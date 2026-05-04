/*
  Warnings:

  - A unique constraint covering the columns `[user_id,problem_id,submission_id]` on the table `codeforces_submissions` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `submission_id` to the `codeforces_submissions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "codeforces_submissions" ADD COLUMN     "submission_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "codeforces_submissions_user_id_problem_id_submission_id_key" ON "codeforces_submissions"("user_id", "problem_id", "submission_id");
