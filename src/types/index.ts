export type HttpMethod =
	| 'GET'
	| 'POST'
	| 'PUT'
	| 'PATCH'
	| 'DELETE'
	| 'HEAD'
	| 'OPTIONS';

export type ResponseType =
	| 'json'
	| 'text'
	| 'blob'
	| 'arrayBuffer'
	| 'formData'
	| 'raw';

export type QueryPrimitive = string | number | boolean | null | undefined | Date;

export type QueryValue = QueryPrimitive | QueryPrimitive[];

export type QueryParams = Record<string, QueryValue>;

export type HeadersMap = Record<string, string>;

export type RetryDelayValue = number | ((attempt: number, error: HttpError) => number);

export type ValidateStatus = (status: number) => boolean;

export type RequestParser<T = unknown> = (response: Response) => Promise<T>;

export interface RequestConfig<TBody = unknown> {
	url: string;
	method?: HttpMethod;
	baseURL?: string;
	params?: QueryParams;
	data?: TBody;
	headers?: HeadersInit;
	timeout?: number;
	signal?: AbortSignal;
	credentials?: RequestCredentials;
	mode?: RequestMode;
	cache?: RequestCache;
	redirect?: RequestRedirect;
	referrerPolicy?: ReferrerPolicy;
	integrity?: string;
	keepalive?: boolean;
	parser?: RequestParser;
	responseType?: ResponseType;
	retries?: number;
	retryDelay?: RetryDelayValue;
	retryCondition?: (error: HttpError) => boolean;
	validateStatus?: ValidateStatus;
}

export interface NormalizedRequestConfig<TBody = unknown>
	extends Omit<RequestConfig<TBody>, 'method' | 'headers'> {
	method: HttpMethod;
	headers: HeadersMap;
}

export interface HttpResponse<T = unknown, TBody = unknown> {
	data: T;
	status: number;
	statusText: string;
	headers: HeadersMap;
	config: NormalizedRequestConfig<TBody>;
	raw: Response;
}

export type HttpErrorCode =
	| 'HTTP_ERROR'
	| 'TIMEOUT_ERROR'
	| 'NETWORK_ERROR'
	| 'ABORT_ERROR'
	| 'PARSE_ERROR';

export interface HttpError extends Error {
	name: 'HttpError';
	code: HttpErrorCode;
	isHttpError: true;
	status?: number;
	response?: HttpResponse;
	config: NormalizedRequestConfig;
	attempt: number;
	raw?: unknown;
}

export type RequestInterceptor = <TBody = unknown>(
	config: NormalizedRequestConfig<TBody>,
) => NormalizedRequestConfig<TBody> | Promise<NormalizedRequestConfig<TBody>>;

export type ResponseInterceptor = <T = unknown, TBody = unknown>(
	response: HttpResponse<T, TBody>,
) => HttpResponse<T, TBody> | Promise<HttpResponse<T, TBody>>;

export type ErrorInterceptor = (
	error: HttpError,
) => HttpError | Promise<HttpError> | void | Promise<void>;

export interface HttpClientOptions {
	baseURL?: string;
	headers?: HeadersInit;
	timeout?: number;
	retries?: number;
	retryDelay?: RetryDelayValue;
	validateStatus?: ValidateStatus;
	responseType?: ResponseType;
	fetcher?: typeof fetch;
}

export interface HttpClient {
	request<TResponse = unknown, TBody = unknown>(
		config: RequestConfig<TBody>,
	): Promise<HttpResponse<TResponse, TBody>>;
	get<TResponse = unknown>(
		url: string,
		config?: Omit<RequestConfig<never>, 'url' | 'method' | 'data'>,
	): Promise<HttpResponse<TResponse>>;
	delete<TResponse = unknown>(
		url: string,
		config?: Omit<RequestConfig<never>, 'url' | 'method' | 'data'>,
	): Promise<HttpResponse<TResponse>>;
	post<TResponse = unknown, TBody = unknown>(
		url: string,
		data?: TBody,
		config?: Omit<RequestConfig<TBody>, 'url' | 'method' | 'data'>,
	): Promise<HttpResponse<TResponse, TBody>>;
	put<TResponse = unknown, TBody = unknown>(
		url: string,
		data?: TBody,
		config?: Omit<RequestConfig<TBody>, 'url' | 'method' | 'data'>,
	): Promise<HttpResponse<TResponse, TBody>>;
	patch<TResponse = unknown, TBody = unknown>(
		url: string,
		data?: TBody,
		config?: Omit<RequestConfig<TBody>, 'url' | 'method' | 'data'>,
	): Promise<HttpResponse<TResponse, TBody>>;
	setBaseURL(baseURL: string): void;
	setHeader(key: string, value: string): void;
	removeHeader(key: string): void;
	clearHeaders(): void;
	useRequestInterceptor(interceptor: RequestInterceptor): () => void;
	useResponseInterceptor(interceptor: ResponseInterceptor): () => void;
	useErrorInterceptor(interceptor: ErrorInterceptor): () => void;
}
