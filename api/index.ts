import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../backend/src/server';

export default async (req: VercelRequest, res: VercelResponse) => {
  return app(req, res);
};
