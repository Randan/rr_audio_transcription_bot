const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

type TranscriptionReplyParams = {
  userId?: number;
  fullName: string;
  text: string;
};

const MAX_MESSAGE_LENGTH = 4096;
const ELLIPSIS = '...';

const buildHeader = (userId: number | undefined, fullName: string) => {
  const safeName = escapeHtml(fullName);
  const mention = userId ? `<a href="tg://user?id=${userId}">${safeName}</a>` : safeName;

  return `${mention}:\n`;
};

const buildMessage = (header: string, chunk: string, hasPrefix: boolean, hasSuffix: boolean) => {
  const prefix = hasPrefix ? ELLIPSIS : '';
  const suffix = hasSuffix ? ELLIPSIS : '';

  return `${header}<blockquote>${prefix}${chunk}${suffix}</blockquote>`;
};

const messageLengthForChunk = (header: string, chunk: string, hasPrefix: boolean, hasSuffix: boolean) =>
  buildMessage(header, chunk, hasPrefix, hasSuffix).length;

const splitTranscription = (text: string, header: string) => {
  const parts: string[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let left = 1;
    let right = text.length - cursor;
    let bestEscaped = '';
    let bestRawLength = 0;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const slice = text.slice(cursor, cursor + mid);
      const escaped = escapeHtml(slice);
      const hasPrefix = parts.length > 0;
      const hasSuffix = cursor + mid < text.length;
      const messageLength = messageLengthForChunk(header, escaped, hasPrefix, hasSuffix);

      if (messageLength <= MAX_MESSAGE_LENGTH) {
        bestEscaped = escaped;
        bestRawLength = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    if (!bestEscaped) {
      const fallback = escapeHtml(text.slice(cursor, cursor + 1));
      parts.push(fallback);
      cursor += 1;
      continue;
    }

    parts.push(bestEscaped);
    cursor += bestRawLength;
  }

  return parts;
};

export const formatTranscriptionReplies = ({ userId, fullName, text }: TranscriptionReplyParams) => {
  const header = buildHeader(userId, fullName);
  const chunks = splitTranscription(text, header);

  return chunks.map((chunk, index) => {
    const hasPrefix = index > 0;
    const hasSuffix = index < chunks.length - 1;

    return buildMessage(header, chunk, hasPrefix, hasSuffix);
  });
};

type AdminErrorParams = {
  userId?: number;
  fullName: string;
  chatId: number | string;
  messageId: number;
  errorMessage: string;
  isDev: boolean;
};

export const formatAdminErrorMessage = ({
  userId,
  fullName,
  chatId,
  messageId,
  errorMessage,
  isDev,
}: AdminErrorParams) => {
  const safeName = escapeHtml(fullName);
  const safeError = escapeHtml(errorMessage);

  return [
    '<b>Transcription error</b>',
    `User: <a href="tg://user?id=${userId ?? ''}">${safeName}</a>`,
    `Chat ID: ${chatId}`,
    `Message ID: ${messageId}`,
    `Details: <code>${safeError}</code>`,
    isDev ? '<i>Dev mode enabled</i>' : '',
  ]
    .filter(Boolean)
    .join('\n');
};
