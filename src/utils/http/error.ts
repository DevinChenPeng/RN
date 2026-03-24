/**
 * 错误模型模块：
 * 定义统一的 HttpClientError，确保调用方可以稳定地拿到 code/status/config 等信息。
 */
import type {
  HttpError,
  HttpErrorCode,
  HttpResponse,
  NormalizedRequestConfig,
} from '../../types';

export class HttpClientError extends Error implements HttpError {
  public readonly name = 'HttpError' as const;

  public readonly isHttpError = true as const;

  public readonly code: HttpErrorCode;

  public readonly config: NormalizedRequestConfig;

  public readonly status?: number;

  public readonly response?: HttpResponse;

  public readonly attempt: number;

  public readonly raw?: unknown;

  public constructor(options: {
    message: string;
    code: HttpErrorCode;
    config: NormalizedRequestConfig;
    status?: number;
    response?: HttpResponse;
    raw?: unknown;
    attempt: number;
  }) {
    super(options.message);
    this.code = options.code;
    this.config = options.config;
    this.status = options.status;
    this.response = options.response;
    this.raw = options.raw;
    this.attempt = options.attempt;
  }
}

// 类型守卫：用于在 catch 中判断是否为本请求库产生的错误对象。
export const isHttpError = (error: unknown): error is HttpError => {
  return (
    Boolean(error) &&
    typeof error === 'object' &&
    'isHttpError' in error &&
    (error as { isHttpError?: boolean }).isHttpError === true
  );
};