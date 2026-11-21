-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT,
    "contentId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentReport_contentType_contentId_idx" ON "ContentReport"("contentType", "contentId");

-- CreateIndex
CREATE INDEX "ContentReport_status_idx" ON "ContentReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReport_reporterId_contentType_contentId_key" ON "ContentReport"("reporterId", "contentType", "contentId");

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
