import React, { ReactElement, useState } from 'react';
import {
  createAlova,
  GlobalFetch,
  useWatcher,
} from '../../../src';
import ReactHook from '../../../src/predefine/ReactHook';
import { AlovaRequestAdapterConfig } from '../../../typings';
import { Result } from '../result.type';
import server from '../../server';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';


function getInstance(
  beforeRequestExpect?: (config: AlovaRequestAdapterConfig<any, any, RequestInit, Headers>) => void,
  responseExpect?: (jsonPromise: Promise<any>) => void,
  resErrorExpect?: (err: Error) => void,
) {
  return createAlova({
    baseURL: 'http://localhost:3000',
    timeout: 3000,
    statesHook: ReactHook,
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


beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
describe('useWatcher hook with react', () => {
  test('should send request when change value', async () => {
    const alova = getInstance();
    const getter = (id1: number, id2: number) => alova.Get('/unit-test', {
      params: {
        id1,
        id2
      },
      timeout: 10000,
      transformData: ({ data }: Result<true>) => data,
      localCache: 100 * 1000,
    });
    const mockfn = jest.fn();
    function Page() {
      const [stateId1, setStateId1] = useState(0);
      const [stateId2, setStateId2] = useState(10);

      const {
        loading,
        data,
        onSuccess,
      } = useWatcher(() => getter(stateId1, stateId2), [stateId1, stateId2], {
        initialData: {
          path: '',
          params: { id1: '', id2: '' }
        },
      });
      onSuccess(mockfn);
      return (
        <div role="wrap">
          <span role="status">{ loading ? 'loading' : 'loaded' }</span>
          <span role="path">{ data.path }</span>
          <span role="id1">{ data.params.id1 }</span>
          <span role="id2">{ data.params.id2 }</span>
          <button onClick={() => {
            setStateId1(stateId1 + 1);
            setStateId2(stateId2 + 1);
          }}>btn</button>
        </div>
      );
    }
    
    render(<Page /> as ReactElement<any, any>);
    expect(screen.getByRole('status')).toHaveTextContent('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('');

    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test');
    expect(screen.getByRole('id1')).toHaveTextContent('1');
    expect(screen.getByRole('id2')).toHaveTextContent('11');

    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test');
    expect(screen.getByRole('id1')).toHaveTextContent('2');
    expect(screen.getByRole('id2')).toHaveTextContent('12');
    expect(mockfn).toHaveBeenCalledTimes(2);
  });

  test('should send request when init', async () => {
    const alova = getInstance();
    const getter = (id1: number, id2: number) => alova.Get('/unit-test', {
      params: {
        id1,
        id2
      },
      timeout: 10000,
      transformData: ({ data }: Result<true>) => data,
      localCache: 100 * 1000,
    });
    const mockfn = jest.fn();
    function Page() {
      const [stateId1, setStateId1] = useState(0);
      const [stateId2, setStateId2] = useState(10);

      const {
        loading,
        data,
        onSuccess,
        send,
      } = useWatcher(() => getter(stateId1, stateId2), [stateId1, stateId2], {
        immediate: true,
        initialData: {
          path: '',
          params: { id1: '', id2: '' }
        },
      });
      onSuccess(mockfn);
      return (
        <div role="wrap">
          <span role="status">{ loading ? 'loading' : 'loaded' }</span>
          <span role="path">{ data.path }</span>
          <span role="id1">{ data.params.id1 }</span>
          <span role="id2">{ data.params.id2 }</span>
          <button onClick={() => {
            setStateId1(stateId1 + 1);
            setStateId2(stateId2 + 1);
          }}>btn</button>
          <button role="btn2" onClick={send}>btn2</button>
        </div>
      );
    }
    
    render(<Page /> as ReactElement<any, any>);
    await screen.findByText('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test');
    expect(screen.getByRole('id1')).toHaveTextContent('0');
    expect(screen.getByRole('id2')).toHaveTextContent('10');

    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test');
    expect(screen.getByRole('id1')).toHaveTextContent('1');
    expect(screen.getByRole('id2')).toHaveTextContent('11');

    fireEvent.click(screen.getByRole('button'));
    await screen.findByText('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test');
    expect(screen.getByRole('id1')).toHaveTextContent('2');
    expect(screen.getByRole('id2')).toHaveTextContent('12');
    expect(mockfn).toHaveBeenCalledTimes(3);

    fireEvent.click(screen.getByRole('btn2'));
    await screen.findByText('loaded');
    expect(screen.getByRole('path')).toHaveTextContent('/unit-test');
    expect(screen.getByRole('id1')).toHaveTextContent('2');
    expect(screen.getByRole('id2')).toHaveTextContent('12');
    expect(mockfn).toHaveBeenCalledTimes(4);
  });
});