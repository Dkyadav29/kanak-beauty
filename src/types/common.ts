export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PageQuery {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export type ISODateString = string;
