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

export const formatTranscriptionReply = ({ userId, fullName, text }: TranscriptionReplyParams) => {
  const safeName = escapeHtml(fullName);
  const safeText = escapeHtml(text);
  const mention = userId ? `<a href="tg://user?id=${userId}">${safeName}</a>` : safeName;

  return `${mention}:\n<blockquote>${safeText}</blockquote>`;
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
