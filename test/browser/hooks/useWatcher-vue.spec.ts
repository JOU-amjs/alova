import {
  createAlova,
  GlobalFetch,
  useWatcher,
} from '../../../src';
import VueHook from '../../../src/predefine/VueHook';
import { getResponseCache } from '../../../src/storage/responseCache';
import { key } from '../../../src/utils/helper';
import { AlovaRequestAdapterConfig } from '../../../typings';
import { Result } from '../result.type';
import server from '../../server';
import { ref } from 'vue';
import Method from '../../../src/Method';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
function getInstance(
  beforeRequestExpect?: (config: AlovaRequestAdapterConfig<any, any, RequestInit, Headers>) => void,
  responseExpect?: (jsonPromise: Promise<any>) => void,
  resErrorExpect?: (err: Error) => void,
) {
  return createAlova({
    baseURL: 'http://localhost:3000',
    timeout: 3000,
    statesHook: VueHook,
    requestAdapter: GlobalFetch(),
    storageAdapter: localStorage,
    beforeRequest(config) {
      beforeRequestExpect && beforeRequestExpect(config);
      return config;
    },
    responsed: {
      success: response => {
        const jsonPromise = response.json();
        responseExpect && responseExpect(jsonPromise);
        return jsonPromise;
      },
      error: err => {
        resErrorExpect && resErrorExpect(err);
      }
    }
  });
}

describe('use useController hook to send GET with vue', function() {
  test('should specify at least one watching state', () => {
    const alova = getInstance();
    expect(() => useWatcher(() => alova.Get<Result>('/unit-test'), [])).toThrowError();
  });
  test('should send request when change value', done => {
    const alova = getInstance();
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess,
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 100 * 1000,
      });
      return get;
    }, [mutateNum, mutateStr]);
    const initialData = () => {
      expect(loading.value).toBeFalsy();
      expect(data.value).toBeUndefined();
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
    };
    // ?????????????????????????????????????????????????????????????????????????????????????????????
    initialData();
    setTimeout(() => {
      initialData();
      // ???????????????????????????????????????????????????????????????????????????????????????
      mutateNum.value = 1;
      mutateStr.value = 'b';
    }, 1000);
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);

    const successTimesFns = [() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('1');
      expect(data.value.params.str).toBe('b');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // ????????????
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData.path).toBe('/unit-test');
      expect(cacheData.params).toEqual({ num: '1', str: 'b' });
      expect(mockCallback.mock.calls.length).toBe(1);
      mutateNum.value = 2;
      mutateStr.value = 'c';
    }, () => {
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData.params).toEqual({ num: '2', str: 'c' });
      expect(mockCallback.mock.calls.length).toBe(2);
      done();
    }];

    // ?????????????????????????????????????????????
    let watchTimes = 0;
    onSuccess(() => {
      successTimesFns[watchTimes]();
      watchTimes++;
    });
  });

  test('should send request one time when value change\'s time less then debounce', done => {
    const alova = getInstance();
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 100 * 1000,
      });
      return get;
    }, [mutateNum, mutateStr], { debounce: 2000 });

    // ????????????????????????????????????????????????????????????
    setTimeout(() => {
      mutateNum.value = 1;
      mutateStr.value = 'b';
      expect(loading.value).toBeFalsy();
      expect(data.value).toBeUndefined();
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      setTimeout(() => {
        mutateNum.value = 2;
        mutateStr.value = 'c';
        expect(loading.value).toBeFalsy();
        expect(data.value).toBeUndefined();
        expect(downloading.value).toEqual({ total: 0, loaded: 0 });
        expect(error.value).toBeUndefined();
      }, 500);
    }, 500);
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);
    onSuccess(() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // ????????????
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData.path).toBe('/unit-test');
      expect(cacheData.params).toEqual({ num: '2', str: 'c' });
      expect(mockCallback.mock.calls.length).toBe(1);
      done();
    });
  });

  test('should send request when set the param `immediate`', done => {
    const alova = getInstance();
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 0,
      });
      return get;
    }, [mutateNum, mutateStr], { immediate: true });
    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);
    const successTimesFns = [() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('0');
      expect(data.value.params.str).toBe('a');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // ????????????
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(1);
      mutateNum.value = 2;
      mutateStr.value = 'c';
    }, () => {
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(2);
      done();
    }];

    // ?????????????????????????????????????????????
    let watchTimes = 0;
    onSuccess(() => {
      successTimesFns[watchTimes]();
      watchTimes++;
    });
  });

  test('initial request shouldn\'t delay when set the `immediate` and `debounce`', done => {
    const alova = getInstance();
    const mutateNum = ref(0);
    const mutateStr = ref('a');
    let currentGet: Method<any, any, any, any, any, any, any>;
    const {
      loading,
      data,
      downloading,
      error,
      onSuccess,
    } = useWatcher(() => {
      const get = currentGet = alova.Get('/unit-test', {
        params: { num: mutateNum.value, str: mutateStr.value },
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
        transformData: (result: Result) => result.data,
        localCache: 0,
      });
      return get;
    }, [mutateNum, mutateStr], { immediate: true, debounce: 1000 });

    // ??????????????????????????????????????????loading?????????true
    expect(loading.value).toBeTruthy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    const mockCallback = jest.fn(() => {});
    onSuccess(mockCallback);
    const successTimesFns = [() => {
      expect(loading.value).toBeFalsy();
      expect(data.value.path).toBe('/unit-test');
      expect(data.value.params.num).toBe('0');
      expect(data.value.params.str).toBe('a');
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      // ????????????
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(1);
      mutateNum.value = 2;
      mutateStr.value = 'c';

      // ????????????????????????1000???????????????????????????500??????????????????????????????
      setTimeout(() => {
        expect(data.value.params.num).toBe('0');
        expect(data.value.params.str).toBe('a');
      }, 500);
    }, () => {
      expect(data.value.params.num).toBe('2');
      expect(data.value.params.str).toBe('c');
      const cacheData = getResponseCache(alova.id, key(currentGet));
      expect(cacheData).toBeUndefined();
      expect(mockCallback.mock.calls.length).toBe(2);
      done();
    }];

    // ?????????????????????????????????????????????
    let watchTimes = 0;
    onSuccess(() => {
      successTimesFns[watchTimes]();
      watchTimes++;
    });
  });
});