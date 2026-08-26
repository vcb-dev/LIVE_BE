import type { UserRole } from '@prisma/client';

/** JWT payload sau khi JwtAuthGuard verify. */
export interface JwtPayloadUser {
  id: string;
  email: string;
  role: UserRole;
}

/** User trả về cho FE sau login / me / refresh. */
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}
