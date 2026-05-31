export type ErrorLogLevel = 'error' | 'warn';

export interface ErrorLogEntry {
  id: string;
  ts: string;
  level: ErrorLogLevel;
  source: string;
  message: string;
  detail?: string;
}

export interface AppendErrorLogInput {
  level: ErrorLogLevel;
  source: string;
  message: string;
  detail?: string;
}
