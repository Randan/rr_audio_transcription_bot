import { Module } from '@nestjs/common';

import { TranscriptionController } from './transcription.controller';
import { TranscriptionHandler } from './transcription.handler';
import { TranscriptionService } from './transcription.service';

@Module({
  controllers: [TranscriptionController],
  providers: [TranscriptionService, TranscriptionHandler],
})
export class TranscriptionModule {}
