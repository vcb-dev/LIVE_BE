-- CreateTable
CREATE TABLE "LIVE"."session_reports" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "submitted_by_id" UUID NOT NULL,
    "live_date" DATE NOT NULL,
    "staff_name" TEXT NOT NULL,
    "shift_id" UUID NOT NULL,
    "live_type_id" UUID NOT NULL,
    "team_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "total_hours" DECIMAL(6,2) NOT NULL,
    "revenue" DECIMAL(14,2) NOT NULL,
    "view_count" INTEGER NOT NULL,
    "retention_rate" DECIMAL(5,2) NOT NULL,
    "order_count" INTEGER NOT NULL,
    "impression_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "session_reports_session_id_idx" ON "LIVE"."session_reports"("session_id");

-- CreateIndex
CREATE INDEX "session_reports_live_date_idx" ON "LIVE"."session_reports"("live_date");

-- AddForeignKey
ALTER TABLE "LIVE"."session_reports" ADD CONSTRAINT "session_reports_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "LIVE"."live_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LIVE"."session_reports" ADD CONSTRAINT "session_reports_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "LIVE"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LIVE"."session_reports" ADD CONSTRAINT "session_reports_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "LIVE"."live_lookups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LIVE"."session_reports" ADD CONSTRAINT "session_reports_live_type_id_fkey" FOREIGN KEY ("live_type_id") REFERENCES "LIVE"."live_lookups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LIVE"."session_reports" ADD CONSTRAINT "session_reports_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "LIVE"."live_lookups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LIVE"."session_reports" ADD CONSTRAINT "session_reports_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "LIVE"."live_lookups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
