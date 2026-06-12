import { Router, type NextFunction, type Request, type Response } from 'express';
import {
  appendErrorLog,
  clearErrorLogs,
  listErrorLogs,
} from '../../core/error-log/store.js';
import {
  appendTextfillDiagnostics,
  clearTextfillDiagnostics,
  getTextfillDiagnosticsPath,
  listTextfillDiagnostics,
  textfillDiagnosticsMeta,
} from '../../core/textfill-diagnostics/store.js';
import type { AppendTextfillDiagnosticInput } from '../../core/textfill-diagnostics/types.js';
import { listSystemFonts } from '../../core/fonts/system-fonts.js';
import { getPrimaryLocalIpv4 } from '../../core/network/local-ipv4.js';
import type { ErrorLogLevel } from '../../core/error-log/types.js';
import { requireOperatorAccess } from '../middleware/auth.js';
import { allowCors, jsonError } from '../middleware/common.js';

function parseLevel(value: unknown): ErrorLogLevel | null {
  if (value === 'error' || value === 'warn') return value;
  return null;
}

export function createSystemRouter(): Router {
  const api = Router();

  api.get('/local-ip', (_req: Request, res: Response) => {
    res.json({
      status: 'successo',
      ipv4: getPrimaryLocalIpv4(),
    });
  });

  api.get('/fonts', requireOperatorAccess, async (_req: Request, res: Response) => {
    const items = await listSystemFonts();
    res.json({ status: 'successo', items });
  });

  api.get('/error-log', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const limitRaw = Number(req.query.limit ?? 200);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, Math.trunc(limitRaw)), 500)
      : 200;
    res.json({
      status: 'Sucesso',
      items: listErrorLogs(limit),
    });
  });

  api.post('/error-log', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const level = parseLevel(req.body.level) ?? 'error';
    const message = String(req.body.message ?? '').trim();
    const source = String(req.body.source ?? 'client').trim() || 'client';
    const detail =
      req.body.detail === undefined || req.body.detail === null
        ? undefined
        : String(req.body.detail).trim();

    if (!message) {
      jsonError(res, 400, 'Mensagem obrigatória');
      return;
    }

    const entry = appendErrorLog({ level, source, message, detail });
    res.status(201).json({ status: 'Sucesso', entry });
  });

  api.delete('/error-log', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    clearErrorLogs();
    res.json({ status: 'Sucesso' });
  });

  api.get('/textfill-diagnostics/meta', requireOperatorAccess, (_req: Request, res: Response) => {
    const meta = textfillDiagnosticsMeta();
    res.json({
      status: 'Sucesso',
      path: meta.path,
      count: meta.count,
      bytes: meta.bytes,
    });
  });

  api.get('/textfill-diagnostics', requireOperatorAccess, (req: Request, res: Response) => {
    const limitRaw = Number(req.query.limit ?? 200);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(Math.max(1, Math.trunc(limitRaw)), 800)
      : 200;
    res.json({
      status: 'Sucesso',
      path: getTextfillDiagnosticsPath(),
      items: listTextfillDiagnostics(limit),
    });
  });

  api.post('/textfill-diagnostics', requireOperatorAccess, (req: Request, res: Response) => {
    allowCors(req, res, () => {});
    const body = req.body as { entries?: AppendTextfillDiagnosticInput[] };
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!entries.length) {
      jsonError(res, 400, 'entries obrigatório');
      return;
    }
    const saved = appendTextfillDiagnostics(entries.slice(0, 20));
    res.status(201).json({ status: 'Sucesso', count: saved.length });
  });

  api.delete('/textfill-diagnostics', requireOperatorAccess, (_req: Request, res: Response) => {
    clearTextfillDiagnostics();
    res.json({ status: 'Sucesso' });
  });

  return api;
}

/** Middleware Express — regista falhas 5xx e excepções de rota. */
export function errorLogMiddleware() {
  return (
    err: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const message =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Erro interno';
    const detail =
      err instanceof Error && err.stack
        ? err.stack.split('\n').slice(0, 8).join('\n')
        : `${req.method} ${req.originalUrl}`;

    try {
      appendErrorLog({
        level: 'error',
        source: 'api',
        message,
        detail,
      });
    } catch {
      // Não falhar a resposta HTTP se o log em disco falhar.
    }

    jsonError(res, 500, 'Erro interno do servidor');
  };
}

/** Regista erros não tratados do processo Node. */
export function registerProcessErrorHandlers(): void {
  process.on('uncaughtException', (err) => {
    try {
      appendErrorLog({
        level: 'error',
        source: 'process',
        message: err.message,
        detail: err.stack,
      });
    } catch {
      console.error('[livepraise] uncaughtException (log falhou):', err);
    }
  });

  process.on('unhandledRejection', (reason) => {
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Promise rejeitada';
    const detail = reason instanceof Error ? reason.stack : undefined;
    try {
      appendErrorLog({
        level: 'error',
        source: 'process',
        message,
        detail,
      });
    } catch {
      console.error('[livepraise] unhandledRejection (log falhou):', reason);
    }
  });
}
