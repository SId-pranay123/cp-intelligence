-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "codeforces_handle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codeforces_submissions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "problem_name" TEXT NOT NULL,
    "problem_tags" TEXT[],
    "verdict" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "time_taken_ms" INTEGER,
    "memory_used" INTEGER,

    CONSTRAINT "codeforces_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_problem_activity" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "problem_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "solved_at" TIMESTAMP(3),
    "time_taken_minutes" INTEGER,
    "confidence_rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_problem_activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "problems" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "difficulty" TEXT,
    "link" TEXT NOT NULL,
    "concept_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "problems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_codeforces_handle_key" ON "users"("codeforces_handle");

-- CreateIndex
CREATE INDEX "codeforces_submissions_user_id_idx" ON "codeforces_submissions"("user_id");

-- CreateIndex
CREATE INDEX "codeforces_submissions_problem_id_idx" ON "codeforces_submissions"("problem_id");

-- CreateIndex
CREATE INDEX "user_problem_activity_user_id_idx" ON "user_problem_activity"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_problem_activity_user_id_problem_id_key" ON "user_problem_activity"("user_id", "problem_id");

-- CreateIndex
CREATE INDEX "problems_source_idx" ON "problems"("source");

-- CreateIndex
CREATE UNIQUE INDEX "problems_source_external_id_key" ON "problems"("source", "external_id");

-- AddForeignKey
ALTER TABLE "codeforces_submissions" ADD CONSTRAINT "codeforces_submissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_problem_activity" ADD CONSTRAINT "user_problem_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_problem_activity" ADD CONSTRAINT "user_problem_activity_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problems"("id") ON DELETE CASCADE ON UPDATE CASCADE;
