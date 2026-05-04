import { Module } from '@nestjs/common';
import { CodeforcesService } from './codeforces.service';
import { CodeforcesController } from './codeforces.controller';
import { ProcessorModule } from '../processor/processor.module';

@Module({
  imports: [ProcessorModule],
  providers: [CodeforcesService],
  controllers: [CodeforcesController],
  exports: [CodeforcesService],
})
export class CodeforcesModule {}
