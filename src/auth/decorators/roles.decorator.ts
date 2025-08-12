import { UserRole } from './../../utils/StringConst';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: (keyof typeof UserRole)[]) => SetMetadata(ROLES_KEY, roles);