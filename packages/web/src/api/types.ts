/**
 * Re-export shared types from @crm/shared for use in API layer.
 * All API files should import ApiResponse / PageResult / PaginationQuery from here
 * instead of defining their own copies.
 */
export type { ApiResponse, PageResult, PaginationQuery } from '@crm/shared'
