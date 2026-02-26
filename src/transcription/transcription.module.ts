import { Module } from '@nestjs/common';

import { TranscriptionHandler } from './transcription.handler';
import { TranscriptionService } from './transcription.service';

@Module({
  providers: [TranscriptionService, TranscriptionHandler],
})
export class TranscriptionModule {}
