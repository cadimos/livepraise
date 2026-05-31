export type UserRole = 'operator' | 'remote' | 'admin';

export interface UserRecord extends Record<string, unknown> {
  id: number;
  username: string;
  password_hash: string;
  role: UserRole;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface PublicUser {
  id: number;
  username: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord extends Record<string, unknown> {
  token: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface AuthContext {
  token: string;
  user: PublicUser;
}
