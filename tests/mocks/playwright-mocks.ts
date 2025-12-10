import { vi } from 'vitest';
import type { Route, Request } from '@playwright/test';

export interface MockRouteOptions {
  method?: string;
  url?: string;
}

export function createMockRequest(options: MockRouteOptions = {}): Request {
  return {
    url: vi.fn().mockReturnValue(options.url ?? 'https://example.com/api/data'),
    method: vi.fn().mockReturnValue(options.method ?? 'GET'),
    headers: vi.fn().mockReturnValue({}),
    allHeaders: vi.fn().mockResolvedValue({}),
    postData: vi.fn().mockReturnValue(null),
    postDataBuffer: vi.fn().mockReturnValue(null),
    postDataJSON: vi.fn().mockReturnValue(null),
    resourceType: vi.fn().mockReturnValue('fetch'),
    frame: vi.fn().mockReturnValue(null),
    isNavigationRequest: vi.fn().mockReturnValue(false),
    redirectedFrom: vi.fn().mockReturnValue(null),
    redirectedTo: vi.fn().mockReturnValue(null),
    failure: vi.fn().mockReturnValue(null),
    timing: vi.fn().mockReturnValue({}),
    sizes: vi.fn().mockResolvedValue({}),
    response: vi.fn().mockResolvedValue(null),
    serviceWorker: vi.fn().mockReturnValue(null),
    headerValue: vi.fn().mockResolvedValue(null),
  } as unknown as Request;
}

export function createMockRoute(options: MockRouteOptions = {}): Route {
  const mockRequest = createMockRequest(options);

  return {
    abort: vi.fn().mockResolvedValue(undefined),
    continue: vi.fn().mockResolvedValue(undefined),
    fulfill: vi.fn().mockResolvedValue(undefined),
    fallback: vi.fn().mockResolvedValue(undefined),
    fetch: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockReturnValue(mockRequest),
  } as unknown as Route;
}
