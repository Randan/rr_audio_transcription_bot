import path from 'path';

export const buildTelegramFileUrl = (botToken: string, filePath: string) =>
  `https://api.telegram.org/file/bot${botToken}/${filePath}`;

export const getVoiceExtension = (filePath: string) => path.extname(filePath) || '.ogg';
