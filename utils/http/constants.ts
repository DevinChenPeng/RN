/**
 * 常量模块：集中维护 HTTP 客户端的默认配置。
 * 这些常量会在 client/config/retry 等模块中复用，避免魔法值分散。
 */
import type { HttpMethod, ValidateStatus } from '../../types';

// 默认超时时间（毫秒）
export const DEFAULT_TIMEOUT = 15000;

// 默认重试间隔（毫秒）
export const DEFAULT_RETRY_DELAY = 300;

// 默认状态码校验：仅 2xx 视为成功
export const DEFAULT_VALIDATE_STATUS: ValidateStatus = (status) => status >= 200 && status < 300;

// 这些方法按规范通常不携带请求体
export const METHODS_WITHOUT_BODY: HttpMethod[] = ['GET', 'HEAD'];