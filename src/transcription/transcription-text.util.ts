import type { AdditionalFormatResponseModel } from '@elevenlabs/elevenlabs-js/api/types';

export const PARAGRAPH_SILENCE_THRESHOLD_SECONDS = 1.5;

export function extractSegmentedText(
  additionalFormats?: (AdditionalFormatResponseModel | undefined)[],
): string | undefined {
  const txtFormat = additionalFormats?.find(format => format?.requestedFormat === 'txt');
  if (!txtFormat?.content) {
    return undefined;
  }

  const content = txtFormat.isBase64Encoded
    ? Buffer.from(txtFormat.content, 'base64').toString('utf-8')
    : txtFormat.content;

  return content.trim() || undefined;
}

export function normalizeParagraphBreaks(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
