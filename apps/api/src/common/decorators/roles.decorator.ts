import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export enum Role {
  ADMIN = 'admin',
  SUPERVISOR = 'supervisor',
  CASHIER = 'cashier',
  SELLER = 'seller',
}

export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
