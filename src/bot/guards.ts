import type { Message } from 'node-telegram-bot-api';

export const MAX_VOICE_DURATION_SECONDS = 15 * 60;

export const getVoiceMessage = (msg: Message) => msg.voice;

export const isVoiceTooLong = (voice: Message['voice']) =>
  Boolean(voice && voice.duration > MAX_VOICE_DURATION_SECONDS);
