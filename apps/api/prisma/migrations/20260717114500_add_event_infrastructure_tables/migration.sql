-- CreateTable
CREATE TABLE "Event" (
    "sequence" BIGSERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("sequence")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "consumerId" TEXT NOT NULL,
    "lastSequence" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("consumerId")
);

-- CreateTable
CREATE TABLE "Deduplication" (
    "consumerId" TEXT NOT NULL,
    "eventSequence" BIGINT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deduplication_pkey" PRIMARY KEY ("consumerId","eventSequence")
);

-- CreateIndex
CREATE INDEX "Event_sequence_idx" ON "Event"("sequence");

-- CreateIndex
CREATE INDEX "Event_type_idx" ON "Event"("type");
