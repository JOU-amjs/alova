import { setupServer } from 'msw/node';
import { rest } from 'msw';
import fetch from 'node-fetch';
import 'web-streams-polyfill';

(global as any).fetch = (window as any).fetch = fetch;

// 防止Vue warn打印
const warn = console.warn;
console.warn = (...args: any[]) => {
  args = args.filter((a: any) => !/vue warn/i.test(a));
  if (args.length > 0) {
    warn.apply(console, args);
  }
};

const result = (code: number, req: any, res: any, ctx: any, hasBody = false, extraParams = {}) => {
  const ret = {
    code,
    msg: '',
    data: {
      path: req.url.pathname,
      method: req.method,
      params: {
        ...(req.url.search || '').replace('?', '').split('&').reduce((p: Record<string, any>, c: string) => {
          const [k, v] = c.split('=');
          p[k] = v;
          return p;
        }, {} as Record<string, any>),
        ...extraParams,
      },
    } as Record<string, any>,
  };
  if (hasBody) {
    ret.data.data = req.body;
  }
  return res(ctx.json(ret));
}

const baseURL = 'http://localhost:3000';
const countMap = {} as Record<string, number>;
export default setupServer(
  rest.get(baseURL + '/unit-test', (req, res, ctx) => result(200, req, res, ctx)),
  rest.get(baseURL + '/unit-test-10s', (req, res, ctx) => {
    return new Promise(r => setTimeout(() => r(result(200, req, res, ctx)), 10000));
  }),
  rest.get(baseURL + '/unit-test-count', (req, res, ctx) => {
    const key = req.url.searchParams.get('countKey') || '';
    countMap[key] = countMap[key] || 0;
    return result(200, req, res, ctx, false, { count: countMap[key]++ });
  }),
  rest.get(baseURL + '/unit-test-404', () => {
    throw new Error('404');
  }),
  rest.post(baseURL + '/unit-test', (req, res, ctx) => result(200, req, res, ctx, true)),
  rest.delete(baseURL + '/unit-test', (req, res, ctx) => result(200, req, res, ctx, true)),
  rest.put(baseURL + '/unit-test', (req, res, ctx) => result(200, req, res, ctx, true)),
  rest.head(baseURL + '/unit-test', (_, res, ctx) => res(ctx.json({}))),
  rest.patch(baseURL + '/unit-test', (req, res, ctx) => result(200, req, res, ctx, true)),
  rest.options(baseURL + '/unit-test', (_, res, ctx) => res(ctx.json({}))),
);


export const untilCbCalled = <T>(
  setCb: (cb: (arg: T) => void, ...others: any[]) => void,
  ...args: any[]
) => new Promise<T>(resolve => {
  setCb(d => {
    resolve(d);
  }, ...args);
});