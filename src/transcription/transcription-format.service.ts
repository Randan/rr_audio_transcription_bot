const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const MAX_MESSAGE_LENGTH = 4096;
const ELLIPSIS = '...';

function buildHeader(userId: number | undefined, fullName: string): string {
  const safeName = escapeHtml(fullName);
  const mention = userId
    ? `<a href="tg://user?id=${userId}">${safeName}</a>`
    : safeName;
  return `${mention}:\n`;
}

function buildMessage(
  header: string,
  chunk: string,
  hasPrefix: boolean,
  hasSuffix: boolean,
): string {
  const prefix = hasPrefix ? ELLIPSIS : '';
  const suffix = hasSuffix ? ELLIPSIS : '';
  return `${header}<blockquote>${prefix}${chunk}${suffix}</blockquote>`;
}

function messageLengthForChunk(
  header: string,
  chunk: string,
  hasPrefix: boolean,
  hasSuffix: boolean,
): number {
  return buildMessage(header, chunk, hasPrefix, hasSuffix).length;
}

function splitLongChunk(
  text: string,
  header: string,
  isFirst: boolean,
): string[] {
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
      const hasPrefix = !isFirst || parts.length > 0;
      const hasSuffix = cursor + mid < text.length;
      const messageLength = messageLengthForChunk(
        header,
        escaped,
        hasPrefix,
        hasSuffix,
      );

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
}

function normalizeParagraphs(
  text: string,
  paragraphs?: string[],
): string[] {
  if (paragraphs && paragraphs.length > 0) {
    return paragraphs.map((p) => p.trim()).filter(Boolean);
  }
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function splitTranscription(
  paragraphList: string[],
  firstHeader: string,
  nextHeader: string,
): string[] {
  const parts: string[] = [];

  for (const paragraph of paragraphList) {
    const isFirst = parts.length === 0;
    const header = isFirst ? firstHeader : nextHeader;
    const escapedParagraph = escapeHtml(paragraph);
    const hasPrefix = !isFirst;
    const hasSuffix = false;
    const paragraphLength = messageLengthForChunk(
      header,
      escapedParagraph,
      hasPrefix,
      hasSuffix,
    );

    if (paragraphLength <= MAX_MESSAGE_LENGTH) {
      if (parts.length === 0) {
        parts.push(escapedParagraph);
      } else {
        const candidate = `${parts[parts.length - 1]}\n\n${escapedParagraph}`;
        const candidateLength = messageLengthForChunk(
          header,
          candidate,
          parts.length > 0,
          false,
        );

        if (candidateLength <= MAX_MESSAGE_LENGTH) {
          parts[parts.length - 1] = candidate;
        } else {
          parts.push(escapedParagraph);
        }
      }
    } else {
      const chunks = splitLongChunk(paragraph, header, isFirst);
      parts.push(...chunks);
    }
  }

  return parts;
}

export interface FormatRepliesParams {
  userId?: number;
  fullName: string;
  text: string;
  paragraphs?: string[];
}

export function formatTranscriptionReplies(params: FormatRepliesParams): string[] {
  const { userId, fullName, text, paragraphs } = params;
  const firstHeader = buildHeader(userId, fullName);
  const nextHeader = '';
  const paragraphList = normalizeParagraphs(text, paragraphs);
  const chunks = splitTranscription(paragraphList, firstHeader, nextHeader);

  return chunks.map((chunk, index) => {
    const hasPrefix = index > 0;
    const hasSuffix = index < chunks.length - 1;
    const header = hasPrefix ? nextHeader : firstHeader;
    return buildMessage(header, chunk, hasPrefix, hasSuffix);
  });
}

export interface FormatAdminErrorParams {
  userId?: number;
  fullName: string;
  chatId: number | string;
  messageId: number;
  errorMessage: string;
  isDev: boolean;
}

export function formatAdminErrorMessage(params: FormatAdminErrorParams): string {
  const { userId, fullName, chatId, messageId, errorMessage, isDev } = params;
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
}
