export const VALID_ROLES = ['VIEWER', 'ANALYST', 'ADMIN'] as const;

export type Role = typeof VALID_ROLES[number];

export const VALID_STATUSES = ['ACTIVE', 'INACTIVE'] as const;

export type Status = typeof VALID_STATUSES[number];
