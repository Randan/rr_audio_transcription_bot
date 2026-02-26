import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule, NotifyAdminModule } from '@randan/tg-logger';

import { HealthModule } from './common/health/health.module';
import { configValidationSchema } from './config/config.schema';
import { TelegramModule } from './telegram/telegram.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: configValidationSchema,
    }),
    LoggerModule,
    NotifyAdminModule,
    HealthModule,
    TelegramModule,
  ],
})
export class AppModule {}
