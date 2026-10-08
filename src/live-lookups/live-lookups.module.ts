import { Module } from '@nestjs/common';
import { LiveLookupsController } from './live-lookups.controller';
import { LiveLookupsService } from './live-lookups.service';

@Module({
  controllers: [LiveLookupsController],
  providers: [LiveLookupsService],
  exports: [LiveLookupsService],
})
export class LiveLookupsModule {}
