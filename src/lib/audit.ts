// Shared audit-field helpers for tenant/master mutations.
// Convention (every table): createdAt/createdBy, updatedAt/updatedBy,
// deletedAt/deletedBy, isDeleted (0 = live, 1 = soft-deleted).
// createdAt/updatedAt are managed by Prisma (@default(now()) / @updatedAt);
// these helpers stamp the *By + soft-delete fields consistently.

/** Fields to spread into a Prisma `create` data object. */
export function auditCreate(actor: string) {
  return { createdBy: actor };
}

/** Fields to spread into a Prisma `update` data object. */
export function auditUpdate(actor: string) {
  return { updatedBy: actor };
}

/** Fields to spread into a Prisma `update` for a SOFT delete. */
export function auditSoftDelete(actor: string) {
  return {
    isDeleted: 1,
    deletedAt: new Date(),
    deletedBy: actor,
    updatedBy: actor,
  };
}

/** Standard "not deleted" filter fragment. */
export const NOT_DELETED = { isDeleted: 0 } as const;
