/** Sanitização mínima de HTML na fila de aprovação (M2). */
export function sanitizeApprovalHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\son\w+\s*=\s*(['"])[^'"]*\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

export function sanitizeApprovalPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const next = { ...payload };
  if (typeof next.html === 'string') {
    next.html = sanitizeApprovalHtml(next.html);
  }
  return next;
}
