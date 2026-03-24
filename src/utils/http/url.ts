/**
 * URL 工具模块：
 * 负责 query 序列化、baseURL 与 path 拼接，以及最终请求 URL 生成。
 */
import type {
  NormalizedRequestConfig,
  QueryParams,
  QueryPrimitive,
} from '../../types';

// 将可序列化的查询值转为字符串。
const toQueryStringPrimitive = (value: QueryPrimitive): string => {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value);
};

// 将对象参数序列化为 querystring，自动跳过 null/undefined。
export const serializeParams = (params?: QueryParams): string => {
  if (!params) {
    return '';
  }

  const items: string[] = [];

  Object.entries(params).forEach(([key, rawValue]) => {
    if (rawValue === null || rawValue === undefined) {
      return;
    }

    const encodedKey = encodeURIComponent(key);
    const values = Array.isArray(rawValue) ? rawValue : [rawValue];

    values.forEach((value) => {
      if (value === null || value === undefined) {
        return;
      }

      const encodedValue = encodeURIComponent(toQueryStringPrimitive(value));
      items.push(`${encodedKey}=${encodedValue}`);
    });
  });

  return items.join('&');
};

// 将 baseURL 和相对路径进行安全拼接；若 url 已是绝对地址则直接返回。
export const combineURL = (baseURL: string | undefined, url: string): string => {
  if (/^https?:\/\//i.test(url) || /^\/\//.test(url)) {
    return url;
  }

  if (!baseURL) {
    return url;
  }

  return `${baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
};

// 构建最终请求地址，自动处理 '?' 与 '&' 的连接关系。
export const buildURL = (config: NormalizedRequestConfig): string => {
  const base = combineURL(config.baseURL, config.url);
  const query = serializeParams(config.params);

  if (!query) {
    return base;
  }

  return `${base}${base.includes('?') ? '&' : '?'}${query}`;
};