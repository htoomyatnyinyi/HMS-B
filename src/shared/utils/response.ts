import type { ApiResponse, PaginatedResult } from "../types/common.types";

export function successResponse<T>(data: T, message?: string): ApiResponse<T> {
  return {
    success: true,
    message,
    data,
  };
}

export function errorResponse(error: string, message?: string): ApiResponse {
  return {
    success: false,
    message,
    error,
  };
}

export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): ApiResponse<PaginatedResult<T>> {
  return {
    success: true,
    data: {
      data: items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
