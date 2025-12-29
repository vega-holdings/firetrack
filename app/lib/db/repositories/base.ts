/**
 * Base Repository Interface
 * All repositories should implement this interface for consistency
 */

import type { PaginationParams, PaginatedResult } from "../types";

export interface BaseRepository<T, CreateInput, UpdateInput> {
  /**
   * Find a single entity by ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Find multiple entities with optional pagination
   */
  findMany(params?: PaginationParams): Promise<PaginatedResult<T>>;

  /**
   * Create a new entity
   */
  create(data: CreateInput): Promise<T>;

  /**
   * Update an existing entity
   */
  update(id: string, data: UpdateInput): Promise<T>;

  /**
   * Delete an entity by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Check if an entity exists
   */
  exists(id: string): Promise<boolean>;

  /**
   * Count total entities (optionally with filters)
   */
  count(filters?: Record<string, unknown>): Promise<number>;
}

/**
 * Helper to create paginated results
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/**
 * Default pagination values
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

/**
 * Normalize pagination params
 */
export function normalizePagination(params?: PaginationParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, params?.page ?? DEFAULT_PAGE);
  const limit = Math.min(MAX_LIMIT, Math.max(1, params?.limit ?? DEFAULT_LIMIT));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
