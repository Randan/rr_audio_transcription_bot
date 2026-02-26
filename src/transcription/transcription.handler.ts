import { rm } from 'node:fs/promises';

import { ConfigService } from '@nestjs/config';
import { LoggerService, NotifyAdminService } from '@randan/tg-logger';
import { Ctx, On, Update } from 'nestjs-telegraf';
import type { Context } from 'telegraf';
import type { Message } from 'telegraf/types';

import {
  MAX_MEDIA_DURATION_SECONDS,
  NO_SPEECH_MESSAGE,
  TOO_LONG_MESSAGE,
  TRANSCRIPTION_FAILED_MESSAGE,
} from './transcription.constants';
import { buildTelegramFileUrl, getMediaExtension, TranscriptionService } from './transcription.service';
import { formatAdminErrorMessage, formatTranscriptionReplies } from './transcription-format.service';

function isDurationTooLong(duration?: number): boolean {
  return Boolean(duration && duration > MAX_MEDIA_DURATION_SECONDS);
}

@Update()
export class TranscriptionHandler {
  constructor(
    private readonly transcription: TranscriptionService,
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly notifyAdmin: NotifyAdminService,
  ) {}

  @On('voice')
  async onVoice(@Ctx() ctx: Context): Promise<void> {
    const msg = ctx.message as Message.VoiceMessage;
    await this.handleMedia(ctx, msg.voice.file_id, msg.voice.duration, msg.voice.mime_type, 'voice', msg.message_id);
  }

  @On('video_note')
  async onVideoNote(@Ctx() ctx: Context): Promise<void> {
    const msg = ctx.message as Message.VideoNoteMessage;
    await this.handleMedia(
      ctx,
      msg.video_note.file_id,
      msg.video_note.duration,
      (msg.video_note as { mime_type?: string }).mime_type,
      'video_note',
      msg.message_id,
    );
  }

  private async handleMedia(
    ctx: Context,
    fileId: string,
    duration: number | undefined,
    mimeType: string | undefined,
    mediaType: string,
    messageId: number,
  ): Promise<void> {
    const chatId = ctx.chat?.id;
    if (!chatId) {
      return;
    }

    if (isDurationTooLong(duration)) {
      await ctx.telegram.sendMessage(chatId, TOO_LONG_MESSAGE, {
        reply_parameters: { message_id: messageId },
      });
      return;
    }

    const from = ctx.from;
    const msgAny = ctx.message as Message & {
      forward_from?: { id: number; first_name?: string; last_name?: string };
      forward_sender_name?: string;
    };
    const forwardFrom = msgAny.forward_from;
    const forwardedName = msgAny.forward_sender_name;
    const displayUser = forwardFrom ?? from;
    const userId = displayUser?.id;
    const fullName =
      [displayUser?.first_name, (displayUser as { last_name?: string })?.last_name].filter(Boolean).join(' ') ||
      forwardedName ||
      'User';

    this.logger.log('Voice message received', {
      chatId,
      messageId,
      userId,
      fullName,
      mediaType,
      duration,
      mimeType,
    });

    try {
      await ctx.telegram.sendChatAction(chatId, 'typing');

      const botToken = this.config.get<string>('BOT_TOKEN');
      if (!botToken) {
        throw new Error('BOT_TOKEN missing');
      }

      const file = await ctx.telegram.getFile(fileId);
      const filePath = file.file_path;
      if (!filePath) {
        throw new Error('Telegram file path missing');
      }

      this.logger.log('Telegram file resolved', { fileId, filePath });

      const downloadUrl = buildTelegramFileUrl(botToken, filePath);
      const extension = getMediaExtension(filePath);

      const { tempDir, tempFilePath } = await this.transcription.downloadAudioToTemp(downloadUrl, extension);

      try {
        this.logger.log('Audio downloaded', { tempFilePath, extension });
        const result = await this.transcription.transcribe(tempFilePath);

        if (!result.text) {
          await ctx.telegram.sendMessage(chatId, NO_SPEECH_MESSAGE, {
            reply_parameters: { message_id: messageId },
          });
          return;
        }

        const replyChunks = formatTranscriptionReplies({
          userId,
          fullName,
          text: result.text,
          paragraphs: result.paragraphs,
        });

        for (let index = 0; index < replyChunks.length; index++) {
          await ctx.telegram.sendMessage(chatId, replyChunks[index], {
            parse_mode: 'HTML',
            ...(index === 0 ? { reply_parameters: { message_id: messageId } } : {}),
            link_preview_options: { is_disabled: true },
          });
        }

        this.logger.log('Transcription sent', {
          chatId,
          messageId,
          textLength: result.text.length,
        });
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      this.logger.error('Transcription error', {
        chatId,
        messageId,
        userId,
        errorMessage,
      });

      await ctx.telegram.sendMessage(chatId, TRANSCRIPTION_FAILED_MESSAGE, {
        reply_parameters: { message_id: messageId },
      });

      const adminId = this.config.get<string>('ADMIN_TELEGRAM_ID');
      if (adminId) {
        const isDev = this.config.get<string>('NODE_ENV') === 'development';
        const adminMessage = formatAdminErrorMessage({
          userId,
          fullName,
          chatId,
          messageId,
          errorMessage,
          isDev,
        });
        this.notifyAdmin.send(adminMessage, { parse_mode: 'HTML' });
      }
    }
  }
}
