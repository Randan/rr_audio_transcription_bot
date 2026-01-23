import type { Message } from 'node-telegram-bot-api';

export const MAX_MEDIA_DURATION_SECONDS = 15 * 60;

export const isDurationTooLong = (duration?: number) => Boolean(duration && duration > MAX_MEDIA_DURATION_SECONDS);
