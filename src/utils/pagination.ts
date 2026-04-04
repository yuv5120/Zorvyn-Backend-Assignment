export interface PaginationParams {
  page: number;
  limit: number;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  [key: string]: unknown;
}

/**
 * Parse and validate page / limit query params.
 * Defaults: page=1, limit=20, max limit=100.
 */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit ?? '20'), 10) || 20));
  return { page, limit };
}

/**
 * Build Prisma skip/take values from pagination params.
 */
export function toPrismaPagination(params: PaginationParams) {
  return {
    skip: (params.page - 1) * params.limit,
    take: params.limit,
  };
}

/**
 * Build pagination meta for API response.
 */
export function buildMeta(total: number, params: PaginationParams): PaginationMeta {
  return {
    page: params.page,
    limit: params.limit,
    total,
    totalPages: Math.ceil(total / params.limit),
  };
}
