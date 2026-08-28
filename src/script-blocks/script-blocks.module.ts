import { Module } from '@nestjs/common';
import { ScriptBlocksController } from './script-blocks.controller';
import { ScriptBlocksService } from './script-blocks.service';

@Module({
  controllers: [ScriptBlocksController],
  providers: [ScriptBlocksService],
  exports: [ScriptBlocksService],
})
export class ScriptBlocksModule {}
