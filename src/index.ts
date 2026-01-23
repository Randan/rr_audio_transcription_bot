import { startBot } from './bot/startBot';
import { loadEnv } from './config/env';
import { startHealthServer } from './server/health';
import { createTranscriber } from './services/transcription';
import { createLogger } from './utils/logger';

const env = loadEnv();
const logger = createLogger({ isDev: env.env === 'dev' });

startHealthServer(env.port);

const transcribe = createTranscriber(env.assemblyAiKey, {
  log: logger.log,
});
startBot({
  botToken: env.botToken,
  adminTelegramId: env.adminTelegramId,
  isDev: env.env === 'dev',
  log: logger.log,
  error: logger.error,
  transcribe,
});
