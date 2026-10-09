import { Module } from '@nestjs/common';
import { SessionReportsController } from './session-reports.controller';
import { SessionReportsService } from './session-reports.service';

@Module({
  controllers: [SessionReportsController],
  providers: [SessionReportsService],
})
export class SessionReportsModule {}
