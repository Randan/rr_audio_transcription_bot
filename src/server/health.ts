import express from 'express';
import type { Request, Response } from 'express';

export const startHealthServer = (port: number) => {
  const app = express();

  app.get('/health', (req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`Health server listening on port ${port}`);
  });
};
