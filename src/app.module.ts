import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configValidationSchema } from './config/config.schema';
import { LoggerModule } from './common/logger/logger.module';
import { NotifyAdminModule } from './common/notify-admin/notify-admin.module';
import { HealthModule } from './common/health/health.module';
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
