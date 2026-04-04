export enum Role {
  VIEWER = 'VIEWER',
  ANALYST = 'ANALYST',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum RecordType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export const VALID_ROLES = [Role.VIEWER, Role.ANALYST, Role.ADMIN] as const;
export const VALID_STATUSES = [UserStatus.ACTIVE, UserStatus.INACTIVE] as const;
export const VALID_RECORD_TYPES = [RecordType.INCOME, RecordType.EXPENSE] as const;
