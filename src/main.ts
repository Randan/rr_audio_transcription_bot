import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@randan/tg-logger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const host = config.get<string>('HOST', '0.0.0.0');
  const port = config.get<number>('PORT', 3000);

  await app.listen(port, host);

  const logger = app.get(LoggerService);
  logger.log(`Audio transcription bot is running on http://${host}:${port}`);
  console.log(`Audio transcription bot is running on http://${host}:${port}`);
  console.log(`HTTP transcribe endpoint: POST http://${host}:${port}/transcribe`);
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
