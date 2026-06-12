import {
  BadRequestException,
  Controller,
  InternalServerErrorException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoggerService } from '@randan/tg-logger';

import { TranscriptionService } from './transcription.service';

@Controller('transcribe')
export class TranscriptionController {
  constructor(
    private readonly transcription: TranscriptionService,
    private readonly logger: LoggerService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async transcribe(@UploadedFile() file?: Express.Multer.File): Promise<{ text: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Audio file is required. Upload it as multipart field "file".');
    }

    this.logger.log('HTTP transcription request received', {
      fileName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    });

    try {
      const result = await this.transcription.transcribe(file.buffer, file.mimetype);
      return { text: result.text };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error('HTTP transcription failed', { errorMessage });
      throw new InternalServerErrorException('Transcription failed');
    }
  }
}
