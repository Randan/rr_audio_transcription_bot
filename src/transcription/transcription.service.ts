import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@randan/tg-logger';

import {
  extractSegmentedText,
  normalizeParagraphBreaks,
  PARAGRAPH_SILENCE_THRESHOLD_SECONDS,
} from './transcription-text.util';

export interface TranscriptionResult {
  text: string;
}

export function buildTelegramFileUrl(botToken: string, filePath: string): string {
  return `https://api.telegram.org/file/bot${botToken}/${filePath}`;
}

@Injectable()
export class TranscriptionService {
  private readonly client: ElevenLabsClient;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {
    const apiKey = this.config.get<string>('ELEVENLABS_API_KEY');
    if (!apiKey) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }
    this.client = new ElevenLabsClient({ apiKey });
  }

  async downloadAudio(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.status} ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async transcribe(audioBuffer: Buffer, mimeType?: string): Promise<TranscriptionResult> {
    const file = new Blob([new Uint8Array(audioBuffer)], { type: mimeType || 'audio/ogg' });

    const result = await this.client.speechToText.convert({
      file,
      modelId: 'scribe_v2',
      tagAudioEvents: false,
      additionalFormats: [
        {
          format: 'txt',
          includeSpeakers: false,
          includeTimestamps: false,
          segmentOnSilenceLongerThanS: PARAGRAPH_SILENCE_THRESHOLD_SECONDS,
        },
      ],
    });

    if ('languageCode' in result) {
      this.logger.log('Language detected', {
        languageCode: result.languageCode,
        confidence: result.languageProbability,
      });
    }

    const rawText = 'text' in result ? result.text?.trim() || '' : '';
    const segmentedText = 'additionalFormats' in result ? extractSegmentedText(result.additionalFormats) : undefined;
    const text = normalizeParagraphBreaks(segmentedText || rawText);

    if (segmentedText) {
      this.logger.log('Paragraph segmentation applied', {
        silenceThresholdSeconds: PARAGRAPH_SILENCE_THRESHOLD_SECONDS,
      });
    }

    return { text };
  }
}
