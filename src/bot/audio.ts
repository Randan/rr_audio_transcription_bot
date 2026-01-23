import path from 'path';

export const buildTelegramFileUrl = (botToken: string, filePath: string) =>
  `https://api.telegram.org/file/bot${botToken}/${filePath}`;

export const getMediaExtension = (filePath: string) => path.extname(filePath) || '.ogg';
