import dotenv from 'dotenv';

dotenv.config();

const requireEnv = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is required`);
  }

  return value;
};

export const loadEnv = () => {
  const botToken = requireEnv('BOT_API_KEY');
  const assemblyAiKey = requireEnv('ASSEMBLY_AI_API_KEY');
  const port = Number(process.env.PORT) || 3000;
  const env = process.env.ENV || 'prod';
  const adminTelegramId = process.env.ADMIN_TG_ID ? Number(process.env.ADMIN_TG_ID) : undefined;

  return {
    botToken,
    assemblyAiKey,
    adminTelegramId,
    env,
    port,
  };
};
