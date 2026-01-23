import { AssemblyAI } from 'assemblyai';

const languagePriority = ['uk', 'en', 'ru'];

export const createTranscriber = (apiKey: string) => {
  const client = new AssemblyAI({ apiKey });

  return async (audioPath: string) => {
    for (const languageCode of languagePriority) {
      const transcript = await client.transcripts.transcribe({
        audio: audioPath,
        speech_models: ['universal'],
        language_code: languageCode,
      });

      const text = transcript.text?.trim();
      if (text) {
        return text;
      }
    }

    return '';
  };
};
