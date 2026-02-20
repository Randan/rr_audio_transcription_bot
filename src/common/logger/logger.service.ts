import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService {
  private readonly isDev: boolean;

  constructor(private readonly config: ConfigService) {
    this.isDev = this.config.get<string>('NODE_ENV') === 'development';
  }

  log(message: string, meta?: Record<string, unknown>): void {
    if (this.isDev) {
      if (meta) {
        console.log(message, meta);
      } else {
        console.log(message);
      }
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    if (meta) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  }
}
