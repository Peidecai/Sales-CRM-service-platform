/**
 * 统一 API 响应格式
 */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}

/**
 * 分页结果
 */
export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * 分页查询参数
 */
export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * 创建成功响应
 */
export function createSuccessResponse<T>(data: T, message = 'success'): ApiResponse<T> {
  return { code: 0, message, data };
}

/**
 * 创建错误响应
 */
export function createErrorResponse(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}
