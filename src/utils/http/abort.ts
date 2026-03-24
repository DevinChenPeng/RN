/**
 * 中断控制模块：
 * 将外部 signal 与超时控制合并为一个内部 AbortController，
 * 并提供 cleanup 释放监听器和定时器，避免内存泄漏。
 */
export const createAbortController = (
  signal: AbortSignal | undefined,
  timeout: number,
): {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
} => {
  const controller = new AbortController();
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;

  // 外部取消时，同步取消内部 controller。
  const onAbort = () => {
    controller.abort();
  };

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onAbort);
    }
  }

  if (timeout > 0) {
    // 超时后触发中断，并记录超时状态，供错误分类使用。
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
  }

  const cleanup = () => {
    // 请求结束后清理监听和定时器。
    if (signal) {
      signal.removeEventListener('abort', onAbort);
    }
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return {
    signal: controller.signal,
    cleanup,
    didTimeout: () => timedOut,
  };
};