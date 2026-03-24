/**
 * 客户端核心模块：
 * 负责组织请求完整生命周期：配置合并 -> 拦截器 -> fetch 执行 -> 响应解析 -> 错误处理 -> 重试。
 */
import type {
  ErrorInterceptor,
  HeadersMap,
  HttpClient,
  HttpClientOptions,
  HttpError,
  HttpErrorCode,
  HttpResponse,
  NormalizedRequestConfig,
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
  RetryDelayValue,
  ValidateStatus,
} from '../../types';
import {
  DEFAULT_RETRY_DELAY,
  DEFAULT_TIMEOUT,
  DEFAULT_VALIDATE_STATUS,
} from './constants';
import { headersToMap, normalizeHeaderKey, responseHeadersToMap } from './headers';
import { toNormalizedConfig } from './config';
import { createAbortController } from './abort';
import { parseResponseData } from './response';
import { HttpClientError, isHttpError } from './error';
import { buildURL } from './url';
import { buildBodyAndHeaders } from './body';
import { resolveRetryDelay, shouldRetryByDefault, sleep } from './retry';

export class FetchHttpClient implements HttpClient {
  private baseURL?: string;

  private defaultHeaders: HeadersMap;

  private timeout: number;

  private retries: number;

  private retryDelay: RetryDelayValue;

  private validateStatus: ValidateStatus;

  private responseType: HttpClientOptions['responseType'];

  private readonly fetcher: typeof fetch;

  private readonly requestInterceptors: RequestInterceptor[] = [];

  private readonly responseInterceptors: ResponseInterceptor[] = [];

  private readonly errorInterceptors: ErrorInterceptor[] = [];

  // 构造时注入默认配置，作为每个 request 的兜底参数。
  public constructor(options: HttpClientOptions = {}) {
    this.baseURL = options.baseURL;
    this.defaultHeaders = headersToMap(options.headers);
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retries = options.retries ?? 0;
    this.retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
    this.validateStatus = options.validateStatus ?? DEFAULT_VALIDATE_STATUS;
    this.responseType = options.responseType ?? 'json';
    this.fetcher = options.fetcher ?? fetch;
  }

  public setBaseURL(baseURL: string): void {
    this.baseURL = baseURL;
  }

  public setHeader(key: string, value: string): void {
    this.defaultHeaders[normalizeHeaderKey(key)] = value;
  }

  public removeHeader(key: string): void {
    delete this.defaultHeaders[normalizeHeaderKey(key)];
  }

  public clearHeaders(): void {
    this.defaultHeaders = {};
  }

  public useRequestInterceptor(interceptor: RequestInterceptor): () => void {
    this.requestInterceptors.push(interceptor);
    // 返回卸载函数，便于业务按需移除拦截器。
    return () => {
      const index = this.requestInterceptors.indexOf(interceptor);
      if (index >= 0) {
        this.requestInterceptors.splice(index, 1);
      }
    };
  }

  public useResponseInterceptor(interceptor: ResponseInterceptor): () => void {
    this.responseInterceptors.push(interceptor);
    return () => {
      const index = this.responseInterceptors.indexOf(interceptor);
      if (index >= 0) {
        this.responseInterceptors.splice(index, 1);
      }
    };
  }

  public useErrorInterceptor(interceptor: ErrorInterceptor): () => void {
    this.errorInterceptors.push(interceptor);
    return () => {
      const index = this.errorInterceptors.indexOf(interceptor);
      if (index >= 0) {
        this.errorInterceptors.splice(index, 1);
      }
    };
  }

  public async request<TResponse = unknown, TBody = unknown>(
    config: RequestConfig<TBody>,
  ): Promise<HttpResponse<TResponse, TBody>> {
    // 先组装本次请求的默认配置快照。
    const defaults = {
      baseURL: this.baseURL,
      headers: this.defaultHeaders,
      timeout: this.timeout,
      retries: this.retries,
      retryDelay: this.retryDelay,
      validateStatus: this.validateStatus,
      responseType: this.responseType,
    };

    // 归一化后，配置字段具备稳定结构。
    let normalized = toNormalizedConfig<TBody>(defaults, config);

    // 依次执行请求拦截器，可修改请求配置。
    for (const interceptor of this.requestInterceptors) {
      normalized = await interceptor(normalized);
    }

    const retries = Math.max(0, normalized.retries ?? 0);
    let attempt = 0;

    while (attempt <= retries) {
      try {
        return await this.executeRequest<TResponse, TBody>(normalized, attempt);
      } catch (caught) {
        // 统一错误对象，再根据策略判断是否重试。
        const error = await this.resolveError(caught, normalized, attempt);

        const shouldRetry =
          attempt < retries &&
          (normalized.retryCondition
            ? normalized.retryCondition(error)
            : shouldRetryByDefault(error));

        if (!shouldRetry) {
          throw error;
        }

        const delay = resolveRetryDelay(normalized.retryDelay, attempt + 1, error);
        await sleep(delay);
        attempt += 1;
      }
    }

    throw new HttpClientError({
      message: 'Request failed after retries.',
      code: 'NETWORK_ERROR',
      config: normalized,
      attempt,
    });
  }

  public get<TResponse = unknown>(
    url: string,
    config: Omit<RequestConfig<never>, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<TResponse>> {
    return this.request<TResponse>({
      ...config,
      url,
      method: 'GET',
    });
  }

  public delete<TResponse = unknown>(
    url: string,
    config: Omit<RequestConfig<never>, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<TResponse>> {
    return this.request<TResponse>({
      ...config,
      url,
      method: 'DELETE',
    });
  }

  public post<TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config: Omit<RequestConfig<TBody>, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<TResponse, TBody>> {
    return this.request<TResponse, TBody>({
      ...config,
      url,
      data,
      method: 'POST',
    });
  }

  public put<TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config: Omit<RequestConfig<TBody>, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<TResponse, TBody>> {
    return this.request<TResponse, TBody>({
      ...config,
      url,
      data,
      method: 'PUT',
    });
  }

  public patch<TResponse = unknown, TBody = unknown>(
    url: string,
    data?: TBody,
    config: Omit<RequestConfig<TBody>, 'url' | 'method' | 'data'> = {},
  ): Promise<HttpResponse<TResponse, TBody>> {
    return this.request<TResponse, TBody>({
      ...config,
      url,
      data,
      method: 'PATCH',
    });
  }

  private async executeRequest<TResponse = unknown, TBody = unknown>(
    config: NormalizedRequestConfig<TBody>,
    attempt: number,
  ): Promise<HttpResponse<TResponse, TBody>> {
    // 构建最终 URL 与请求体。
    const url = buildURL(config);
    const { body, headers } = buildBodyAndHeaders(config.method, config.data, config.headers);

    // 合并 signal 与 timeout 的中断控制。
    const { signal, cleanup, didTimeout } = createAbortController(config.signal, config.timeout ?? 0);

    try {
      // 执行原生 fetch。
      const response = await this.fetcher(url, {
        method: config.method,
        headers,
        body,
        signal,
        cache: config.cache,
        credentials: config.credentials,
        integrity: config.integrity,
        keepalive: config.keepalive,
        mode: config.mode,
        redirect: config.redirect,
        referrerPolicy: config.referrerPolicy,
      });

      const data = await parseResponseData<TResponse>(response, config, attempt);
      const normalizedResponse: HttpResponse<TResponse, TBody> = {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeadersToMap(response.headers),
        config,
        raw: response,
      };

      if (!config.validateStatus?.(response.status)) {
        // 非预期状态码归类为 HTTP_ERROR。
        throw new HttpClientError({
          message: `Request failed with status ${response.status}.`,
          code: 'HTTP_ERROR',
          status: response.status,
          response: normalizedResponse,
          config,
          attempt,
        });
      }

      let finalResponse = normalizedResponse;
      // 依次执行响应拦截器。
      for (const interceptor of this.responseInterceptors) {
        finalResponse = await interceptor(finalResponse);
      }

      return finalResponse;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw error;
      }

      // 对非库内异常按超时/中断/网络错误分类。
      const code: HttpErrorCode = didTimeout()
        ? 'TIMEOUT_ERROR'
        : signal.aborted
          ? 'ABORT_ERROR'
          : 'NETWORK_ERROR';

      const message =
        code === 'TIMEOUT_ERROR'
          ? `Request timed out after ${config.timeout ?? 0}ms.`
          : code === 'ABORT_ERROR'
            ? 'Request was aborted.'
            : 'Network request failed.';

      throw new HttpClientError({
        message,
        code,
        config,
        raw: error,
        attempt,
      });
    } finally {
      // 无论成功失败都做清理，避免泄漏。
      cleanup();
    }
  }

  private async resolveError(
    caught: unknown,
    config: NormalizedRequestConfig,
    attempt: number,
  ): Promise<HttpError> {
    // 先将未知异常收敛为统一 HttpError 对象。
    let error: HttpError;

    if (caught instanceof HttpClientError) {
      error = caught;
    } else if (isHttpError(caught)) {
      error = caught;
    } else {
      error = new HttpClientError({
        message: 'Unexpected request error.',
        code: 'NETWORK_ERROR',
        config,
        raw: caught,
        attempt,
      });
    }

    // 依次执行错误拦截器，允许增强或替换错误。
    for (const interceptor of this.errorInterceptors) {
      const maybeNewError = await interceptor(error);
      if (maybeNewError && isHttpError(maybeNewError)) {
        error = maybeNewError;
      }
    }

    return error;
  }
}