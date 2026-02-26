import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@randan/tg-logger';
import { AssemblyAI } from 'assemblyai';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export interface TranscriptionResult {
  text: string;
  paragraphs?: string[];
}

export function buildTelegramFileUrl(botToken: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

export function getMediaExtension(filePath: string): string {
  return path.extname(filePath) || '.ogg';
}

@Injectable()
export class TranscriptionService {
  private readonly client: AssemblyAI;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const apiKey = this.config.get<string>('ASSEMBLY_AI_API_KEY');
    if (!apiKey) {
      throw new Error('ASSEMBLY_AI_API_KEY is required');
    }
    const baseUrl = this.config.get<string>('ASSEMBLY_AI_BASE_URL');
    this.client = new AssemblyAI({ apiKey, baseUrl });
  }

  async downloadAudioToTemp(url: string, extension: string): Promise<{ tempDir: string; tempFilePath: string }> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tg-audio-'));
    const safeExtension = extension && extension.startsWith('.') ? extension : '.ogg';
    const tempFilePath = path.join(tempDir, `audio${safeExtension}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(tempFilePath, buffer);

    return { tempDir, tempFilePath };
  }

  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    const transcript = await this.client.transcripts.transcribe({
      audio: audioPath,
      speech_models: ['universal-2'],
      language_detection: true,
    });

    if (transcript.language_code) {
      this.logger.log('Language detected', {
        languageCode: transcript.language_code,
        confidence: transcript.language_confidence,
      });
    }

    let text = transcript.text?.trim() || '';
    let paragraphs: string[] | undefined;

    if (transcript.id) {
      try {
        const paragraphResult = await this.client.transcripts.paragraphs(transcript.id);
        paragraphs = paragraphResult.paragraphs.map(p => p.text.trim()).filter(Boolean);
        const paragraphText = paragraphs.join('\n\n');

        if (paragraphText) {
          text = paragraphText;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        this.logger.log('Paragraph fetch failed', { errorMessage });
      }
    }

    return { text, paragraphs };
  }
}
