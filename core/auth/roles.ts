import type { DisplayRole } from '../../shared/types/live.js';
import type { UserRole } from './types.js';

export const USER_ROLES: readonly UserRole[] = ['operator', 'remote', 'admin'];

/** Papéis de monitor que cada tipo de conta pode atribuir (CAD-119). */
export const DISPLAY_ROLES_ALL: readonly DisplayRole[] = [
  'operator',
  'projection',
  'stage-return',
  'off',
];

export const DISPLAY_ROLES_OPERATOR: readonly DisplayRole[] = [
  'operator',
  'off',
];

export function isStaffRole(role: UserRole): boolean {
  return role === 'operator' || role === 'admin';
}

/** Envio remoto (UI `/remote`, API `/api/remote/*`, WS `remote-operator`). */
export function canAccessRemote(role: UserRole): boolean {
  return role === 'remote' || role === 'admin';
}

export function allowedDisplayRolesForUser(role: UserRole): DisplayRole[] {
  if (role === 'admin') return [...DISPLAY_ROLES_ALL];
  if (role === 'operator') return [...DISPLAY_ROLES_OPERATOR];
  return [];
}

export function canAssignDisplayRole(
  userRole: UserRole,
  displayRole: DisplayRole,
): boolean {
  return allowedDisplayRolesForUser(userRole).includes(displayRole);
}

export function isValidUserRole(value: string): value is UserRole {
  return (USER_ROLES as readonly string[]).includes(value);
}
