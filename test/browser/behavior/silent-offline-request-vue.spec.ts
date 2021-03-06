import {
  createAlova,
  useRequest,
  GlobalFetch,
} from '../../../src';
import VueHook from '../../../src/predefine/VueHook';
import { getResponseCache } from '../../../src/storage/responseCache';
import { key } from '../../../src/utils/helper';
import { AlovaRequestAdapterConfig } from '../../../typings';
import { Result } from '../result.type';
import server from '../../server';
import { getSilentRequest } from '../../../src/storage/silentStorage';

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
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
class NetworkController {
  private win: Window;
  private onLine: boolean;
  constructor(win: Window) { 
    this.win = win; 
    this.onLine = win.navigator.onLine; 

    // Replace the default onLine implementation with our own. 
    Object.defineProperty(win.navigator.constructor.prototype, 'onLine', {
      get:() => {
        return this.onLine;
      },
    });
  }

  setOnline() { 
    const was = this.onLine;
    this.onLine = true;
    // Fire only on transitions.
    if (!was) {
      this.fire('online'); 
    } 
  } 

  setOffline() { 
    const was = this.onLine; 
    this.onLine = false; 

    // Fire only on transitions. 
    if (was) { 
      this.fire('offline'); 
    } 
  }

  fire(event: string) { 
   this.win.dispatchEvent(new (this.win as any).Event(event));
  } 
}

describe('use useRequest to send silent request', function() {
  test('send a silent\'s post', done => {
    const alova = getInstance();
    const Post = alova.Post<Result<string>>('/unit-test', { postData: 'abc' }, {
      silent: true,
    });
    const {
      loading,
      data,
      downloading,
      error,
      send,
      onSuccess,
      onComplete,
    } = useRequest(Post, { immediate: false });
    expect(loading.value).toBeFalsy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    send();
    // ??????????????????????????????????????????onSuccess
    let flag = 0;
    onSuccess(() => {
      expect(loading.value).toBeFalsy();
      expect(data.value).toBeUndefined();
      expect(downloading.value).toEqual({ total: 0, loaded: 0 });
      expect(error.value).toBeUndefined();
      const cacheData = getResponseCache(alova.id, key(Post));
      expect(cacheData).toBeUndefined();
      flag++;
    });
    onComplete(() => flag++);
    // ??????????????????????????????
    setTimeout(() => {
      expect(flag).toBe(2);
      done();
    }, 10);
  });

  test('should push to localStorage when silent\'s post is failed', done => {
    let throwError = 0;
    const alova = getInstance(undefined, () => {
      throwError++;
      if (throwError < 3) {
        setTimeout(() => {
          const { serializedMethod } = getSilentRequest(alova.id, alova.storage);
          expect(serializedMethod).not.toBeUndefined();
        }, 0);
        throw new Error('custom error');
      }
      setTimeout(() => {
        const { serializedMethod } = getSilentRequest(alova.id, alova.storage);
        expect(serializedMethod).toBeUndefined();
        done();
      }, 1000);
    });
    const Post = alova.Post<Result<string>>('/unit-test', { postData: 'abc' }, {
      silent: true,
    });
    const {
      loading,
      data,
      downloading,
      error,
      send,
    } = useRequest(Post, { immediate: false });
    expect(loading.value).toBeFalsy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    send().catch(() => {});
  });

  test('should push to localStorage instead send request when network offline', async () => {
    const requestHookMock = jest.fn(() => {});
    const responsedHookMock = jest.fn(() => {});
    const networkCtrl = new NetworkController(window);
    const alova = getInstance(requestHookMock, responsedHookMock);
    const Post = alova.Post<Result<string>>('/unit-test', { postData: 'abc' }, {
      silent: true,
    });
    networkCtrl.setOffline();
    const {
      loading,
      data,
      downloading,
      error,
    } = useRequest(Post);
    expect(loading.value).toBeFalsy();
    expect(data.value).toBeUndefined();
    expect(downloading.value).toEqual({ total: 0, loaded: 0 });
    expect(error.value).toBeUndefined();
    let persisted = getSilentRequest(alova.id, alova.storage);
    const serializedMethod = persisted.serializedMethod || { url: '', type: '', requestBody: {} };
    expect(serializedMethod.url).toBe('/unit-test');
    expect(serializedMethod.type).toBe('POST');
    expect(serializedMethod.requestBody).toEqual({ postData: 'abc' });
    expect(requestHookMock.mock.calls.length).toBe(0);
    expect(responsedHookMock.mock.calls.length).toBe(0);

    // ????????????????????????????????????????????????????????????post??????????????????
    networkCtrl.setOnline();
    await new Promise(resolve => setTimeout(resolve, 2500));
    persisted = getSilentRequest(alova.id, alova.storage);
    expect(persisted.serializedMethod).toBeUndefined();
    expect(requestHookMock.mock.calls.length).toBe(1);
    expect(responsedHookMock.mock.calls.length).toBe(1);
  });
});