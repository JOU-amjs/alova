/// <reference types="svelte" />
export type RequestBody = Record<string, any> | FormData | string;
export type Progress = {
  total: number,
  loaded: number,
};
type AlovaRequestAdapter<R, T, RC, RE, RH> = (adapterConfig: AlovaRequestAdapterConfig<R, T, RC, RH>) => {
  response: () => Promise<RE>,
  headers: () => Promise<RH>,
  onDownload?: (handler: (progress: Progress) => void) => void,
  onUpload?: (handler: (progress: Progress) => void) => void,
  abort: () => void,
};

type FrontRequestState<L = any, R = any, E = any, D = any, U = any> = {
  loading: L,
  data: R,
  error: E,
  downloading: D,
  uploading: U,
};
export type MethodType = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS' | 'PATCH';

export type SerializedMethod<R, T, RC, RE, RH> = {
  type: MethodType,
  url: string,
  config?: AlovaMethodConfig<R, T, RC, RE, RH>
  requestBody?: RequestBody
};
export interface Storage {
  setItem: (key: string, value: string) => void,
  getItem(key: string): string | null,
  removeItem(key: string): void,
}

// 获取fetch的第二个参数类型
// type RequestInit = NonNullable<Parameters<typeof fetch>[1]>;
// 通用的请求配置
type CommonMethodConfig = {
  readonly url: string,
  readonly method: MethodType,
  data?: RequestBody,
};


// 请求缓存设置
// expire: 过期时间，如果大于0则首先返回缓存数据，过期时间单位为毫秒，小于等于0不缓存，Infinity为永不过期
// mode: 缓存模式，可选值为MEMORY、STORAGE_PLACEHOLDER、STORAGE_RESTORE
type LocalCacheConfig = {
  expire: number,
  mode?: number,
  tag?: string|number,    // 持久化缓存标签，标签改变后原有持久化数据将会失效
};
type LocalCacheConfigParam = number | LocalCacheConfig;
export type AlovaMethodConfig<R, T, RC, RH> = {
  name?: string,    // method对象名称，在updateState、invalidateCache中可以通过名称或通配符获取对应method对象
  params?: Record<string, any>,
  headers?: Record<string, any>,
  silent?: boolean,    // 静默请求，onSuccess将会立即触发，如果请求失败则会保存到缓存中后续继续轮询请求
  timeout?: number,    // 当前中断时间
  localCache?: LocalCacheConfigParam,   // 响应数据在缓存时间内则不再次请求。get、head请求默认保鲜5分钟（300000毫秒），其他请求默认不缓存
  enableDownload?: boolean,   // 是否启用下载进度信息，启用后每次请求progress才会有进度值，否则一致为0，默认不开启
  enableUpload?: boolean,   // 是否启用上传进度信息，启用后每次请求progress才会有进度值，否则一致为0，默认不开启
  transformData?: (data: T, headers: RH) => R,   // 响应数据转换，转换后的数据将转换为data状态，没有转换数据则直接用响应数据作为data状态
} & RC;
type AlovaRequestAdapterConfig<R, T, RC, RH> = CommonMethodConfig & AlovaMethodConfig<R, T, RC, RH>;

type ResponsedHandler<RE> = (response: RE) => any;
type ResponseErrorHandler = (error: any) => void;
type ResponsedHandlerRecord<RE> = {
  success: ResponsedHandler<RE>, 
  error: ResponseErrorHandler
};
type WatchingParams = {
  states?: any[],
  immediate: boolean,
};

// 泛型类型解释：
// S: create函数创建的状态组的类型
// E: export函数返回的状态组的类型
// RC(RequestConfig): requestAdapter的请求配置类型，自动推断
// RE(Response): 类型requestAdapter的响应配置类型，自动推断
// RH(ResponseHeader): requestAdapter的响应头类型，自动推断
export interface AlovaOptions<S, E, RC, RE, RH> {
  // base地址
  baseURL: string,
  
  // 状态hook函数，用于定义和更新指定MVVM库的状态
  statesHook: {
    create: <D>(data: D) => S,
    export: (state: S) => E,

    // 将状态转换为普通数据
    dehydrate: (state: S) => any,
    update: (newVal: Partial<FrontRequestState>, state: FrontRequestState) => void,

    // 控制执行请求的函数，此函数将在useRequest、useWatcher被调用时执行一次
    // 在useFetcher中的fetch函数中执行一次
    // 当watchedStates为空数组时，执行一次handleRequest函数
    // 当watchedStates为非空数组时，当状态变化时调用，immediate为true时，需立即调用一次
    // 在vue中直接执行即可，而在react中需要在useEffect中执行
    // removeStates函数为清除当前状态的函数，应该在组件卸载时调用
    effectRequest: (handleRequest: () => void, removeStates: () => void, watchingParams: WatchingParams) => void,
  },

  // 请求适配器
  requestAdapter: AlovaRequestAdapter<any, any, RC, RE, RH>,

  // 请求超时时间
  timeout?: number,
  
  // 全局的请求本地缓存设置
  // expire: 过期时间，如果大于0则首先返回缓存数据，过期时间单位为毫秒，小于等于0不缓存，Infinity为永不过期
  // mode: 缓存模式，可选值为MEMORY、STORAGE_PLACEHOLDER、STORAGE_RESTORE
  // get、head请求默认缓存5分钟（300000毫秒），其他请求默认不缓存
  localCache?: LocalCacheConfigParam,

  // 持久化缓存接口，用于静默请求、响应数据持久化等
  storageAdapter?: Storage,

  // 全局的请求前置钩子
  beforeRequest?: (config: AlovaRequestAdapterConfig<any, any, RC, RH>) => AlovaRequestAdapterConfig<any, any, RC, RH> | void,

  // 全局的响应钩子，可传一个数组表示正常响应和响应出错的钩子
  // 如果正常响应的钩子抛出错误也将进入响应失败的钩子函数
  responsed?: ResponsedHandler<RE> | ResponsedHandlerRecord<RE>,
}

/** 三种缓存模式 */
export declare const cacheMode: {
  // 只在内存中缓存，默认是此选项
  MEMORY: number,
  // 缓存会持久化，但当内存中没有缓存时，持久化缓存只会作为响应数据的占位符，且还会发送请求更新缓存
  STORAGE_PLACEHOLDER: number,
  // 缓存会持久化，且每次刷新会读取持久化缓存到内存中，这意味着内存一直会有缓存
  STORAGE_RESTORE: number,
};


// methods
interface Method<S, E, R, T, RC, RE, RH> {
  type: MethodType;
  url: string;
  config: AlovaMethodConfig<R, T, RC, RH>;
  requestBody?: RequestBody;
  context: Alova<S, E, RC, RE, RH>;
  response: R;
}

declare class Alova<S, E, RC, RE, RH> {
  public options: AlovaOptions<S, E, RC, RE, RH>;
  public id: string;
  public storage: Storage;
  Get<R, T = unknown>(url: string, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
  Post<R, T = unknown>(url: string, requestBody?: RequestBody, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
  Put<R, T = unknown>(url: string, requestBody?: RequestBody, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
  Delete<R, T = unknown>(url: string, requestBody?: RequestBody, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
  Head<R, T = unknown>(url: string, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
  Options<R, T = unknown>(url: string, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
  Patch<R, T = unknown>(url: string, requestBody?: RequestBody, config?: AlovaMethodConfig<R, T, RC, RH>): Method<S, E, R, T, RC, RE, RH>;
}

type SuccessHandler<R> = (data: R, ...args: any[]) => void;
type ErrorHandler = (error: any, ...args: any[]) => void;
type CompleteHandler = (...args: any[]) => void;
// hook通用配置
interface UseHookConfig<R> {
  force?: boolean,   // 强制请求
  initialData?: any,     // 初始数据
}
// useRequest配置类型
interface RequestHookConfig<R> extends UseHookConfig<R> {
  immediate?: boolean,   // 开启immediate后，useRequest会立即发起一次请求
}
// useWatcher配置类型
interface WatcherHookConfig<R> extends UseHookConfig<R> {
  immediate?: boolean,  // 开启immediate后，useWatcher初始化时会自动发起一次请求
  debounce?: number, // 延迟多少毫秒后再发起请求
}
// useFetcher配置类型
interface FetcherHookConfig<R> extends Omit<UseHookConfig<R>, 'initialData'> {}

// Vue状态类型
interface Ref<T = any> {
  value: T;
}
// react状态类型
type Dispatch<A> = (value: A) => void;
type SetStateAction<S> = S | ((prevState: S) => S);
type ReactState<D> = [D, Dispatch<SetStateAction<D>>];

// Svelte状态类型
interface Readable<T = any> {
  subscribe(
    this: void, 
    run: (value: T) => void, 
    invalidate?: (value?: T) => void
  ): () => void;
}

// 以支持React和Vue的方式定义类型，后续需要其他类型再在这个基础上变化
type ExportedType<R, S> = S extends Ref 
  ? Ref<R> 
  : S extends Readable 
    ? Readable<R> : R;
type UseHookReturnType<R, S> = FrontRequestState<
  ExportedType<boolean, S>,
  ExportedType<R, S>,
  ExportedType<Error|null, S>,
  ExportedType<Progress, S>,
  ExportedType<Progress, S>
> & {
  abort: () => void,
  send: (...args: any[]) => Promise<R>,
  onSuccess: (handler: SuccessHandler<R>) => void,
  onError: (handler: ErrorHandler) => void,
  onComplete: (handler: CompleteHandler) => void,
}
type UseFetchHookReturnType<S, E, RC, RE, RH> = {
  fetching: UseHookReturnType<any, S>['loading'];
  error: UseHookReturnType<any, S>['error'],
  downloading: UseHookReturnType<any, S>['downloading'],
  uploading: UseHookReturnType<any, S>['uploading'],
  fetch: <R, T>(methodInstance: Method<S, E, R, T, RC, RE, RH>) => void;
}


type MethodFilterHandler = (
  method: Method<any, any, any, any, any, any, any>, 
  index: number, 
  methods: Method<any, any, any, any, any, any, any>[]
) => boolean;
type MethodFilter = string | RegExp | {
  name: string | RegExp;
  filter: MethodFilterHandler;
};
type MethodMatcher<S, E, R, T, RC, RE, RH> = Method<S, E, R, T, RC, RE, RH> | MethodFilter;


// *************************************
// 导出类型
export declare function createAlova<S, E, RC, RE, RH>(options: AlovaOptions<S, E, RC, RE, RH>): Alova<S, E, RC, RE, RH>;
export declare  function useRequest<S, E, R, T, RC, RE, RH>(methodHandler: Method<S, E, R, T, RC, RE, RH> | (() => Method<S, E, R, T, RC, RE, RH>), config?: RequestHookConfig<R>): UseHookReturnType<R, S>;
export declare function useWatcher<S, E, R, T, RC, RE, RH>(handler: () => Method<S, E, R, T, RC, RE, RH>, watchingStates: E[], config?: WatcherHookConfig<R>): UseHookReturnType<R, S>;
export declare function useFetcher<S, E, RC, RE, RH>(alova: Alova<S, E, RC, RE, RH>, config?: FetcherHookConfig<any>): UseFetchHookReturnType<S, E, RC, RE, RH>;
export declare function invalidateCache<S, E, R, T, RC, RE, RH>(matcher?: MethodMatcher<S, E, R, T, RC, RE, RH>): void;
export declare function updateState<S, E, R, T, RC, RE, RH>(matcher: MethodMatcher<S, E, R, T, RC, RE, RH>, handleUpdate: (data: R) => any): void;
// 手动设置缓存响应数据
export declare function setCacheData<S, E, R, T, RC, RE, RH>(methodInstance: Method<S, E, R, T, RC, RE, RH>, data: R): void;

// 混合多个响应器，并在这些响应器都成功时调用成功回调，如果其中一个错误则调用失败回调
// 类似Promise.all
// export declare function all<T extends unknown[] | []>(responsers: T): Responser<{ -readonly [P in keyof T]: T[P] extends Responser<infer R> ? R : never }>;

// 预定义的fetch配置
export declare function GlobalFetch(defaultRequestInit?: RequestInit): <R, T, RequestInit>(adapterConfig: AlovaRequestAdapterConfig<R, T, RequestInit>) => {
  response: () => Promise<Response>;
  headers: () => Promise<void | Headers>;
  onDownload: (handler: (progress: Progress) => void) => void;
  abort: () => void;
};