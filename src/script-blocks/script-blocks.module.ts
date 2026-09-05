import { Module } from '@nestjs/common';
import { AiModule } from '../ai-integration/ai.module';
import { ScriptBlocksController } from './script-blocks.controller';
import { ScriptBlocksService } from './script-blocks.service';

@Module({
  imports: [AiModule],
  controllers: [ScriptBlocksController],
  providers: [ScriptBlocksService],
  exports: [ScriptBlocksService],
})
export class ScriptBlocksModule {}
