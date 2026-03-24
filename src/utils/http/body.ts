/**
 * 请求体构建模块：
 * 根据 method 与 data 类型生成 fetch 可识别的 body，并处理 content-type 默认值。
 */
import type { HeadersMap, HttpMethod } from '../../types';
import { METHODS_WITHOUT_BODY } from './constants';

// 判断是否为普通对象，用于决定是否进行 JSON 序列化。
const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object') {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
};

export const buildBodyAndHeaders = (
  method: HttpMethod,
  data: unknown,
  sourceHeaders: HeadersMap,
): { body?: BodyInit; headers: HeadersInit } => {
  // 克隆 headers，避免修改外部入参对象。
  const headers: HeadersMap = {
    ...sourceHeaders,
  };

  // 无 body 的方法或无 data 时，直接返回 headers。
  if (METHODS_WITHOUT_BODY.includes(method) || data === undefined) {
    return { headers };
  }

  // 原生可直接透传给 fetch 的 body 类型。
  if (
    typeof data === 'string' ||
    data instanceof Blob ||
    data instanceof FormData ||
    data instanceof URLSearchParams ||
    data instanceof ArrayBuffer
  ) {
    return {
      body: data as BodyInit,
      headers,
    };
  }

  // TypedArray/DataView 等视图类型。
  if (ArrayBuffer.isView(data)) {
    return {
      body: data as unknown as BodyInit,
      headers,
    };
  }

  // 对常见 JSON 数据自动序列化并补 content-type。
  if (isPlainObject(data) || Array.isArray(data) || typeof data === 'number' || typeof data === 'boolean') {
    if (!headers['content-type']) {
      headers['content-type'] = 'application/json';
    }

    return {
      body: JSON.stringify(data),
      headers,
    };
  }

  return {
    body: data as BodyInit,
    headers,
  };
};