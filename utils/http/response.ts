/**
 * 响应解析模块：
 * 根据 responseType 或 content-type 自动解析响应体，并统一抛出 PARSE_ERROR。
 */
import type { NormalizedRequestConfig } from '../../types';
import { HttpClientError } from './error';

// 安全解析 JSON：空字符串返回 null，避免 JSON.parse 抛错。
const parseAsJson = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }
  return JSON.parse(text);
};

export const parseResponseData = async <T = unknown>(
  response: Response,
  config: NormalizedRequestConfig,
  attempt: number,
): Promise<T> => {
  try {
    // 允许调用方提供自定义 parser 覆盖默认解析行为。
    if (config.parser) {
      return (await config.parser(response)) as T;
    }

    if (config.responseType === 'raw') {
      return response as unknown as T;
    }

    if (response.status === 204 || response.status === 205) {
      return null as T;
    }

    const type = config.responseType;

    if (type === 'text') {
      return (await response.text()) as T;
    }

    if (type === 'blob') {
      return (await response.blob()) as T;
    }

    if (type === 'arrayBuffer') {
      return (await response.arrayBuffer()) as T;
    }

    if (type === 'formData') {
      return (await response.formData()) as T;
    }

    if (type === 'json') {
      return (await parseAsJson(response)) as T;
    }

    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';

    // 未显式指定 responseType 时，按 content-type 推断是否按 JSON 解析。
    if (contentType.includes('application/json') || contentType.includes('+json')) {
      return (await parseAsJson(response)) as T;
    }

    return (await response.text()) as T;
  } catch (error) {
    // 解析失败统一归类为 PARSE_ERROR，方便上层统一处理。
    throw new HttpClientError({
      message: 'Failed to parse response body.',
      code: 'PARSE_ERROR',
      config,
      attempt,
      raw: error,
      status: response.status,
    });
  }
};