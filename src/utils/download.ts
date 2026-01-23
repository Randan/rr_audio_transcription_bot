import fs from 'fs/promises';
import os from 'os';
import path from 'path';

export const downloadAudioToTemp = async (url: string, extension: string) => {
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
};
