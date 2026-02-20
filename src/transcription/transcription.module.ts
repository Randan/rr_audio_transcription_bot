import { Module } from '@nestjs/common';
import { TranscriptionService } from './transcription.service';
import { TranscriptionHandler } from './transcription.handler';

@Module({
  providers: [TranscriptionService, TranscriptionHandler],
})
export class TranscriptionModule {}
