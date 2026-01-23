import fs from 'fs/promises';

import TelegramBot from 'node-telegram-bot-api';
import type { Message } from 'node-telegram-bot-api';

import { buildTelegramFileUrl, getMediaExtension } from './audio';
import { formatAdminErrorMessage, formatTranscriptionReplies } from './format';
import { isDurationTooLong } from './guards';
import { NO_SPEECH_MESSAGE, TOO_LONG_MESSAGE, TRANSCRIPTION_FAILED_MESSAGE } from './messages';
import { downloadAudioToTemp } from '../utils/download';

type StartBotParams = {
  botToken: string;
  transcribe: (audioPath: string) => Promise<string>;
  adminTelegramId?: number;
  isDev: boolean;
  log: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
};

export const startBot = ({ botToken, transcribe, adminTelegramId, isDev, log, error: logError }: StartBotParams) => {
  const bot = new TelegramBot(botToken, { polling: true });

  bot.on('message', async (msg: Message) => {
    const voice = msg.voice;
    const videoNote = msg.video_note;
    const media = voice ?? videoNote;
    const mediaType = voice ? 'voice' : 'video_note';

    if (!media) {
      return;
    }

    if (isDurationTooLong(media.duration)) {
      await bot.sendMessage(msg.chat.id, TOO_LONG_MESSAGE, {
        reply_to_message_id: msg.message_id,
      });
      return;
    }

    const fileId = media.file_id;

    if (!fileId) {
      return;
    }

    const chatId = msg.chat.id;
    const messageId = msg.message_id;
    const from = msg.from;
    const userId = from?.id;
    const fullName = [from?.first_name, from?.last_name].filter(Boolean).join(' ') || 'User';

    const mimeType = 'mime_type' in media ? media.mime_type : undefined;

    log('Voice message received', {
      chatId,
      messageId,
      userId,
      fullName,
      mediaType,
      duration: media.duration,
      mimeType,
    });

    try {
      await bot.sendChatAction(chatId, 'typing');

      const file = await bot.getFile(fileId);
      const filePath = file.file_path;
      if (!filePath) {
        throw new Error('Telegram file path missing');
      }

      log('Telegram file resolved', { fileId, filePath });

      const downloadUrl = buildTelegramFileUrl(botToken, filePath);
      const extension = getMediaExtension(filePath);

      const { tempDir, tempFilePath } = await downloadAudioToTemp(downloadUrl, extension);

      try {
        log('Audio downloaded', { tempFilePath, extension });
        const text = await transcribe(tempFilePath);
        if (!text) {
          await bot.sendMessage(chatId, NO_SPEECH_MESSAGE, { reply_to_message_id: messageId });
          return;
        }

        const replyChunks = formatTranscriptionReplies({ userId, fullName, text });

        for (const [index, replyText] of replyChunks.entries()) {
          await bot.sendMessage(chatId, replyText, {
            parse_mode: 'HTML',
            reply_to_message_id: index === 0 ? messageId : undefined,
            disable_web_page_preview: true,
          });
        }

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

      await bot.sendMessage(chatId, TRANSCRIPTION_FAILED_MESSAGE, { reply_to_message_id: messageId });

      if (adminTelegramId) {
        const adminMessage = formatAdminErrorMessage({
          userId,
          fullName,
          chatId,
          messageId,
          errorMessage,
          isDev,
        });

        await bot.sendMessage(adminTelegramId, adminMessage, {
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        });
      }
    }
  });

  return bot;
};
