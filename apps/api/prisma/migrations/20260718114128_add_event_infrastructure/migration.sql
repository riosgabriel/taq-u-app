-- CreateTable
CREATE TABLE "Event" (
    "sequence" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("sequence")
);

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");

-- CreateIndex
CREATE INDEX "Event_streamId_idx" ON "Event"("streamId");
