/**
 * 模块入口文件：
 * 1. 暴露 createHttpClient 工厂方法。
 * 2. 提供默认单例 http。
 * 3. 统一转发子模块导出，供按需引用。
 */
import type { HttpClient, HttpClientOptions } from '../../types';
import { FetchHttpClient } from './client';

// 创建客户端实例，允许通过 options 覆盖默认行为。
export const createHttpClient = (options?: HttpClientOptions): HttpClient => {
	return new FetchHttpClient(options);
};

// 默认单例，适合全局直接使用。
export const http = createHttpClient();

export { FetchHttpClient };
export * from './abort';
export * from './body';
export * from './config';
export * from './constants';
export * from './error';
export * from './headers';
export * from './response';
export * from './retry';
export * from './url';

export default http;
