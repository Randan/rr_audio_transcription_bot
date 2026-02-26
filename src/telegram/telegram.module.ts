import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TelegrafModule } from 'nestjs-telegraf';

import { TranscriptionModule } from '../transcription/transcription.module';

@Module({
  imports: [
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const token = config.get<string>('BOT_TOKEN');
        if (!token) {
          throw new Error('BOT_TOKEN is required');
        }
        return { token, include: [TranscriptionModule] };
      },
      inject: [ConfigService],
    }),
    TranscriptionModule,
  ],
})
export class TelegramModule {}
