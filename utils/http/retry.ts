/**
 * 重试策略模块：
 * 提供重试间隔计算、默认是否可重试判断，以及异步等待工具。
 */
import type { HttpError, RetryDelayValue } from '../../types';
import { DEFAULT_RETRY_DELAY } from './constants';

export const resolveRetryDelay = (
  retryDelay: RetryDelayValue | undefined,
  attempt: number,
  error: HttpError,
): number => {
  // 支持函数式间隔，按重试次数动态返回 delay。
  if (typeof retryDelay === 'function') {
    const value = retryDelay(attempt, error);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  // 否则走固定间隔，并对异常值兜底为 0。
  const delay = retryDelay ?? DEFAULT_RETRY_DELAY;
  return Number.isFinite(delay) && delay > 0 ? delay : 0;
};

export const shouldRetryByDefault = (error: HttpError): boolean => {
  // 网络类异常默认可重试。
  if (error.code === 'TIMEOUT_ERROR' || error.code === 'NETWORK_ERROR') {
    return true;
  }

  // 服务端 5xx 默认可重试。
  if (error.code === 'HTTP_ERROR' && typeof error.status === 'number') {
    return error.status >= 500;
  }

  return false;
};

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    // 非正数时不等待，立即继续。
    if (ms <= 0) {
      resolve();
      return;
    }
    setTimeout(resolve, ms);
  });