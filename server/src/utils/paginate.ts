/**
 * Standard pagination parameters accepted by list endpoints.
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
}

/**
 * Standard pagination metadata returned in list responses.
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Compute skip/limit values and return a pagination metadata builder.
 *
 * Usage:
 *   const { skip, limit, buildMeta } = paginate(params);
 *   const [data, total] = await Promise.all([
 *     Model.find(query).skip(skip).limit(limit).lean(),
 *     Model.countDocuments(query),
 *   ]);
 *   return { data, pagination: buildMeta(total) };
 */
export const paginate = (params: PaginationParams = {}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 25));
  const skip = (page - 1) * limit;

  return {
    skip,
    limit,
    buildMeta: (total: number): PaginationMeta => ({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    }),
  };
};
