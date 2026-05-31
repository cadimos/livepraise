import type { Request, Response, NextFunction } from 'express';

export function allowCors(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', 'Origin');
  next();
}

export function jsonError(
  res: Response,
  status: number,
  message: string,
  code?: string,
): Response {
  return res.status(status).json(code ? { error: message, code } : { error: message });
}
