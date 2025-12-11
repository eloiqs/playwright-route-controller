import type { Route } from '@playwright/test';

type RouteAction =
  | ['abort', Parameters<Route['abort']>]
  | ['continue', Parameters<Route['continue']>]
  | ['fulfill', Parameters<Route['fulfill']>]
  | ['fallback', Parameters<Route['fallback']>];

interface PendingRequest {
  resolve: (action: RouteAction) => void;
  route: Route;
  timestamp: number;
}

export interface RouteControllerOptions {
  /** Timeout in milliseconds. If set, pending requests will auto-continue after timeout. */
  timeout?: number;
}

/**
 * A Playwright utility for controlling network requests - intercept, abort, continue, and fulfill requests with ease.
 *
 * @example
 * ```ts
 * const controller = new RouteController({ method: 'POST' });
 * await page.route('** /api/messages', (route) => controller.handle(route));
 *
 * await sendMessage('Hello');
 * // Request is now pending
 *
 * controller.abort(); // Simulate failure
 * // OR
 * controller.continue(); // Let it through
 * ```
 */
export class RouteController {
  private pendingRequests: PendingRequest[] = [];
  private timeoutIds: Map<PendingRequest, NodeJS.Timeout> = new Map();

  constructor(private readonly config?: RouteControllerOptions) {}

  /**
   * Handle an intercepted route. Call this from page.route() callback.
   * Non-matching methods (if options.method is set) are automatically continued.
   */
  async handle(route: Route): Promise<void> {
    const request: PendingRequest = {
      resolve: () => {},
      route,
      timestamp: Date.now(),
    };

    const actionPromise = new Promise<RouteAction>((resolve) => {
      request.resolve = resolve;
    });

    this.pendingRequests.push(request);

    // Set up timeout if configured
    if (this.config?.timeout) {
      const timeoutId = setTimeout(() => {
        this.timeoutIds.delete(request);
        request.resolve(['continue', []]);
      }, this.config.timeout);
      this.timeoutIds.set(request, timeoutId);
    }

    const [action, args] = await actionPromise;

    // Clean up timeout if it exists
    const timeoutId = this.timeoutIds.get(request);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.timeoutIds.delete(request);
    }

    // Remove from pending
    const index = this.pendingRequests.indexOf(request);
    if (index > -1) {
      this.pendingRequests.splice(index, 1);
    }

    switch (action) {
      case 'abort':
        await route.abort(...args);
        break;
      case 'continue':
        await route.continue(...args);
        break;
      case 'fulfill':
        await route.fulfill(...args);
        break;
      case 'fallback':
        await route.fallback(...args);
        break;
    }
  }

  /**
   * Handle an intercepted get request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  get(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'GET')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted post request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  post(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'POST')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted put request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  put(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'PUT')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted delete request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  delete(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'DELETE')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted patch request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  patch(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'PATCH')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted head request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  head(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'HEAD')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted connect request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  connect(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'CONNECT')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted trace request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  trace(route: Route): Promise<void> {
    if (!this.isMethodMatch(route, 'TRACE')) {
      return route.continue();
    }
    return this.handle(route);
  }

  /**
   * Handle an intercepted options request. Call this from page.route() callback.
   * Non-matching methods are automatically continued.
   */
  options(route: Route): Promise<void> {
    if (this.isMethodMatch(route, 'OPTIONS')) {
      return this.handle(route);
    }
    return route.continue();
  }

  /**
   * Abort the oldest pending request.
   * @returns true if a request was aborted, false if no pending requests
   */
  abort(...args: Parameters<Route['abort']>): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve(['abort', args]);
      return true;
    }
    return false;
  }

  /**
   * Continue the oldest pending request.
   * @returns true if a request was continued, false if no pending requests
   */
  continue(...args: Parameters<Route['continue']>): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve(['continue', args]);
      return true;
    }
    return false;
  }

  /**
   * Fulfill the oldest pending request.
   * @returns true if a request was fulfilled, false if no pending requests
   */
  fulfill(...args: Parameters<Route['fulfill']>): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve(['fulfill', args]);
      return true;
    }
    return false;
  }

  /**
   * Fallback the oldest pending request.
   * @returns true if a request was fallbacked, false if no pending requests
   */
  fallback(...args: Parameters<Route['fallback']>): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve(['fallback', args]);
      return true;
    }
    return false;
  }

  /**
   * Abort all pending requests.
   * @returns number of requests aborted
   */
  abortAll(): number {
    const count = this.pendingRequests.length;
    for (const request of [...this.pendingRequests]) {
      request.resolve(['abort', []]);
    }
    return count;
  }

  /**
   * Continue all pending requests.
   * @returns number of requests continued
   */
  continueAll(): number {
    const count = this.pendingRequests.length;
    for (const request of [...this.pendingRequests]) {
      request.resolve(['continue', []]);
    }
    return count;
  }

  /**
   * Number of currently pending requests.
   */
  get pendingCount(): number {
    return this.pendingRequests.length;
  }

  /**
   * Whether there are any pending requests.
   */
  get hasPending(): boolean {
    return this.pendingRequests.length > 0;
  }

  /**
   * Wait for a request to become pending.
   * Useful when you need to ensure a request has been intercepted before aborting/continuing.
   * @param timeout Maximum time to wait in ms (default: 5000)
   */
  async waitForPending(timeout = 5000): Promise<void> {
    const start = Date.now();
    while (!this.hasPending && Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, 50));
    }
    if (!this.hasPending) {
      throw new Error(
        `No pending request after ${timeout}ms. Ensure the request was made.`
      );
    }
  }

  /**
   * Clean up any pending timeouts. Call this in test cleanup if using timeouts.
   */
  dispose(): void {
    for (const timeoutId of this.timeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.timeoutIds.clear();
    this.pendingRequests = [];
  }

  private isMethodMatch(
    route: Route,
    method:
      | 'GET'
      | 'POST'
      | 'PUT'
      | 'DELETE'
      | 'PATCH'
      | 'HEAD'
      | 'OPTIONS'
      | 'CONNECT'
      | 'TRACE'
  ): boolean {
    return route.request().method() === method;
  }
}
