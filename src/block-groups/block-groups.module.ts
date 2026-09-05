import { Module } from '@nestjs/common';
import { BlockGroupsController } from './block-groups.controller';
import { BlockGroupsService } from './block-groups.service';

@Module({
  controllers: [BlockGroupsController],
  providers: [BlockGroupsService],
  exports: [BlockGroupsService],
})
export class BlockGroupsModule {}
