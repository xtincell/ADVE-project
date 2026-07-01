-- AlterTable
ALTER TABLE "BrandContextNode" ADD COLUMN     "nodeId" TEXT,
ADD COLUMN     "retrievalScope" TEXT[] DEFAULT ARRAY['SELF']::TEXT[];

-- CreateIndex
CREATE INDEX "BrandContextNode_nodeId_idx" ON "BrandContextNode"("nodeId");

-- CreateIndex
CREATE INDEX "BrandContextNode_nodeId_kind_idx" ON "BrandContextNode"("nodeId", "kind");

-- AddForeignKey
ALTER TABLE "BrandContextNode" ADD CONSTRAINT "BrandContextNode_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "BrandNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
