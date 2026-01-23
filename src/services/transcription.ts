import { AssemblyAI } from 'assemblyai';

type TranscriberOptions = {
  log?: (message: string, meta?: Record<string, unknown>) => void;
};

export const createTranscriber = (apiKey: string, { log }: TranscriberOptions = {}) => {
  const client = new AssemblyAI({ apiKey });

  return async (audioPath: string) => {
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

    return transcript.text?.trim() || '';
  };
};
