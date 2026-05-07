-- CreateTable
CREATE TABLE "user_company_targets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_company_targets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_company_targets_user_id_idx" ON "user_company_targets"("user_id");

-- AddForeignKey
ALTER TABLE "user_company_targets" ADD CONSTRAINT "user_company_targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
