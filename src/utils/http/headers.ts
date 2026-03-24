/**
 * 请求头工具模块：
 * 1. 统一 Header key 为小写，避免大小写差异导致的覆盖问题。
 * 2. 将不同 HeadersInit 形态转换为普通对象，便于后续合并。
 */
import type { HeadersMap } from '../../types';

// 统一 key 大小写，内部以小写作为标准形态。
export const normalizeHeaderKey = (key: string): string => key.toLowerCase();

export const headersToMap = (headers?: HeadersInit): HeadersMap => {
  if (!headers) {
    return {};
  }

  const map: HeadersMap = {};

  // Headers 实例
  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      map[normalizeHeaderKey(key)] = value;
    });
    return map;
  }

  // 元组数组
  if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      map[normalizeHeaderKey(key)] = value;
    });
    return map;
  }

  // 普通对象
  Object.entries(headers).forEach(([key, value]) => {
    if (value !== undefined) {
      map[normalizeHeaderKey(key)] = String(value);
    }
  });

  return map;
};

// 将响应头转换为普通对象，便于业务层直接访问。
export const responseHeadersToMap = (headers: Headers): HeadersMap => {
  const result: HeadersMap = {};
  headers.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};