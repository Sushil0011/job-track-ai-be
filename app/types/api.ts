export type ApiSuccess<T = unknown> = {
  success: true;
  statusCode: number;
  data?: T;
  message?: string;
};

export type ApiErrorDetail = {
  field: string;
  message: string;
};

export type ApiError = {
  success: false;
  statusCode: number;
  message: string;
  details?: ApiErrorDetail[];
};
