import { AssemblyAI } from 'assemblyai';

export type TranscriptionResult = {
  text: string;
  paragraphs?: string[];
};

type TranscriberOptions = {
  log?: (message: string, meta?: Record<string, unknown>) => void;
  baseUrl?: string;
};

export const createTranscriber = (apiKey: string, { log, baseUrl }: TranscriberOptions = {}) => {
  const client = new AssemblyAI({ apiKey, baseUrl });

  return async (audioPath: string): Promise<TranscriptionResult> => {
    const transcript = await client.transcripts.transcribe({
      audio: audioPath,
      speech_models: ['universal'],
      language_detection: true,
    });

    if (transcript.language_code) {
      log?.('Language detected', {
        languageCode: transcript.language_code,
        confidence: transcript.language_confidence,
      });
    }

    let text = transcript.text?.trim() || '';
    let paragraphs: string[] | undefined;

    if (transcript.id) {
      try {
        const paragraphResult = await client.transcripts.paragraphs(transcript.id);
        paragraphs = paragraphResult.paragraphs.map(paragraph => paragraph.text.trim()).filter(Boolean);
        const paragraphText = paragraphs.join('\n\n');

        if (paragraphText) {
          text = paragraphText;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        log?.('Paragraph fetch failed', { errorMessage });
      }
    }

    return { text, paragraphs };
  };
};
