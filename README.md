# Audio Transcription Bot

Telegram bot that downloads voice/audio messages, transcribes them with AssemblyAI, and replies with the text.

## Requirements

- Node.js 18+
- pnpm
- Telegram bot token
- AssemblyAI API key

## Setup

1. Install dependencies:
   - `pnpm install`
2. Create `.env` based on `.env.keep` and fill values.

## Run

- Development: `pnpm dev`
- Build: `pnpm build`
- Production: `pnpm start`

## Environment variables

See `.env.keep` for the full list. Required:

- `BOT_API_KEY`
- `ASSEMBLY_AI_API_KEY`
- `PORT`
