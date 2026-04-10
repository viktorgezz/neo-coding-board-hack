/**
 * Маппинг на существующие эндпоинты core-service (без /admin):
 * GET  /api/v1/users/staff
 * POST /api/v1/auth/register  (SUPERUSER)
 * PUT  /api/v1/users/{id}
 * DELETE /api/v1/users/{id}
 */

import type { AdminUser } from '@/components/UserRow';

/** Элемент из Spring Page.content для UserResponse. */
export interface StaffUserJson {
  id:       number;
  username: string;
  role:     string;
}

export function mapStaffUserToAdminUser(r: StaffUserJson): AdminUser {
  return {
    id:        String(r.id),
    name:      r.username,
    email:     r.username,
    role:      r.role as AdminUser['role'],
    createdAt: null,
  };
}
