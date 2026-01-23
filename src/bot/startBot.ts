import path from 'path';

import fs from 'fs/promises';

import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';

import { downloadAudioToTemp } from '../utils/download';

type StartBotParams = {
  botToken: string;
  transcribe: (audioPath: string) => Promise<string>;
  adminTelegramId?: number;
  isDev: boolean;
  log: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getAudioExtension = (filePath: string, audio?: Message['audio']) => {
  const audioFileName = audio && 'file_name' in audio && typeof audio.file_name === 'string' ? audio.file_name : '';

  return path.extname(filePath) || path.extname(audioFileName) || '.ogg';
};

export const startBot = ({ botToken, transcribe, adminTelegramId, isDev, log, error: logError }: StartBotParams) => {
  const bot = new TelegramBot(botToken, { polling: true });

  bot.on('message', async (msg: Message) => {
    const voice = msg.voice;

    if (!voice) {
      return;
    }

    const fileId = voice.file_id;

    if (!fileId) {
      return;
    }

    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const from = msg.from;
    const userId = from?.id;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'User';

    log('Voice message received', {
      chatId,
      messageId,
      userId,
      fullName,
      duration: voice.duration,
      mimeType: voice.mime_type,
    });

    try {
      await bot.sendChatAction(chatId, 'typing');

      const file = await bot.getFile(fileId);
      const filePath = file.file_path;
      if (!filePath) {
        throw new Error('Telegram file path missing');
      }

      log('Telegram file resolved', { fileId, filePath });

      const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
      const extension = getAudioExtension(filePath, undefined);

      const { tempDir, tempFilePath } = await downloadAudioToTemp(downloadUrl, extension);

      try {
        log('Audio downloaded', { tempFilePath, extension });
        const text = await transcribe(tempFilePath);
        if (!text) {
          await bot.sendMessage(chatId, 'No speech detected.');
          return;
        }

        const safeName = escapeHtml(fullName);
        const safeText = escapeHtml(text);
        const mention = userId ? `<a href="tg://user?id=${userId}">${safeName}</a>` : safeName;
        const replyText = `${mention}:\n<blockquote>${safeText}</blockquote>`;

        await bot.sendMessage(chatId, replyText, {
          parse_mode: 'HTML',
          reply_to_message_id: messageId,
          disable_web_page_preview: true,
        });

        log('Transcription sent', { chatId, messageId, textLength: text.length });
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      logError('Transcription error', {
        chatId,
        messageId,
        userId,
        errorMessage,
      });

      const userMessage = 'Не вдалося розпізнати аудіо. Спробуй ще раз або запиши коротше повідомлення.';
      await bot.sendMessage(chatId, userMessage, { reply_to_message_id: messageId });

      if (adminTelegramId) {
        const safeName = escapeHtml(fullName);
        const safeError = escapeHtml(errorMessage);
        const adminMessage = [
          '<b>Transcription error</b>',
          `User: <a href="tg://user?id=${userId ?? ''}">${safeName}</a>`,
          `Chat ID: ${chatId}`,
          `Message ID: ${messageId}`,
          `Details: <code>${safeError}</code>`,
          isDev ? '<i>Dev mode enabled</i>' : '',
        ]
          .filter(Boolean)
          .join('\n');

        await bot.sendMessage(adminTelegramId, adminMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      }
    }
  });

  return bot;
};
