/**
 * 配置归一化模块：
 * 将实例默认配置与单次请求配置合并，输出可直接执行请求的标准配置对象。
 */
import type {
  HeadersMap,
  HttpClientOptions,
  HttpMethod,
  NormalizedRequestConfig,
  RequestConfig,
} from '../../types';
import { headersToMap } from './headers';

export type NormalizationDefaults = Required<
  Pick<
    HttpClientOptions,
    'timeout' | 'retries' | 'retryDelay' | 'validateStatus' | 'responseType'
  >
> & {
  baseURL?: string;
  headers: HeadersMap;
};

export const toNormalizedConfig = <TBody = unknown>(
  defaults: NormalizationDefaults,
  config: RequestConfig<TBody>,
): NormalizedRequestConfig<TBody> => {
  // 约定在内部统一使用大写 method 与已合并 headers。
  return {
    ...config,
    method: (config.method ?? 'GET').toUpperCase() as HttpMethod,
    baseURL: config.baseURL ?? defaults.baseURL,
    headers: {
      ...defaults.headers,
      ...headersToMap(config.headers),
    },
    timeout: config.timeout ?? defaults.timeout,
    retries: config.retries ?? defaults.retries,
    retryDelay: config.retryDelay ?? defaults.retryDelay,
    validateStatus: config.validateStatus ?? defaults.validateStatus,
    responseType: config.responseType ?? defaults.responseType,
  };
};