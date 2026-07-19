import type { AuthUser } from '../auth-session.js';

export interface AuthLoginResponse {
  status?: string;
  token?: string;
  user?: AuthUser;
  error?: string;
}

export interface AuthSessionResponse {
  user: AuthUser;
}
