import type { Route, Request } from '@playwright/test';

type RouteAction =
  | ['abort', Parameters<Route['abort']>]
  | ['continue', Parameters<Route['continue']>]
  | ['fulfill', Parameters<Route['fulfill']>]
  | ['fallback', Parameters<Route['fallback']>];

type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE';

interface PendingRequest {
  resolve: (action: RouteAction) => void;
  route: Route;
  timestamp: number;
}

/**
 * Selector for targeting a specific pending request.
 * - `number`: Index into the pending requests array (0 = oldest)
 * - `function`: Predicate function that receives the Request and returns true for the target
 */
export type RequestSelector = number | ((request: Request) => boolean);

export interface RouteControllerOptions {
  /** Timeout in milliseconds. If set, pending requests will auto-continue after timeout. */
  timeout?: number;
  /** HTTP method to filter requests. If set, only requests with this method will be handled. */
  method?: HttpMethod;
  /** Custom match function for additional request filtering. If the function returns false, the request will be automatically continued. */
  match?: (request: Request) => boolean;
  /** Expected number of requests. If set, throws an error when more requests than expected are pending. */
  expectedRequests?: number;
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
   * Find a pending request by selector.
   * @param selector - Index or predicate function. Defaults to 0 (oldest request).
   * @returns The pending request or undefined if not found.
   */
  private findRequest(
    selector: RequestSelector = 0
  ): PendingRequest | undefined {
    if (typeof selector === 'number') {
      return this.pendingRequests[selector];
    }
    return this.pendingRequests.find((req) => selector(req.route.request()));
  }

  /**
   * Handle an intercepted route. Call this from page.route() callback.
   * Non-matching requests (based on method and match options) are automatically continued.
   */
  async handle(route: Route): Promise<void> {
    // Check method filter
    if (
      this.config?.method &&
      route.request().method() !== this.config.method
    ) {
      return route.continue();
    }

    // Check custom match function
    if (this.config?.match && !this.config.match(route.request())) {
      return route.continue();
    }

    // Check expected requests limit before adding
    if (
      this.config?.expectedRequests !== undefined &&
      this.pendingRequests.length >= this.config.expectedRequests
    ) {
      throw new Error(
        `Expected ${this.config.expectedRequests} request(s), but received more. ` +
          `Currently ${this.pendingRequests.length} pending request(s).`
      );
    }

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
   * Abort a pending request.
   * @param errorCode - Optional error code to pass to route.abort()
   * @param selector - Optional index or predicate to select which request. Defaults to oldest (index 0).
   * @returns true if a request was aborted, false if no matching request
   */
  abort(
    errorCode?: Parameters<Route['abort']>[0],
    selector?: RequestSelector
  ): boolean {
    const request = this.findRequest(selector);
    if (request) {
      const args: Parameters<Route['abort']> =
        errorCode !== undefined ? [errorCode] : [];
      request.resolve(['abort', args]);
      return true;
    }
    return false;
  }

  /**
   * Continue a pending request.
   * @param overrides - Optional overrides to pass to route.continue()
   * @param selector - Optional index or predicate to select which request. Defaults to oldest (index 0).
   * @returns true if a request was continued, false if no matching request
   */
  continue(
    overrides?: Parameters<Route['continue']>[0],
    selector?: RequestSelector
  ): boolean {
    const request = this.findRequest(selector);
    if (request) {
      const args: Parameters<Route['continue']> =
        overrides !== undefined ? [overrides] : [];
      request.resolve(['continue', args]);
      return true;
    }
    return false;
  }

  /**
   * Fulfill a pending request with a custom response.
   * @param response - Response to pass to route.fulfill()
   * @param selector - Optional index or predicate to select which request. Defaults to oldest (index 0).
   * @returns true if a request was fulfilled, false if no matching request
   */
  fulfill(
    response: Parameters<Route['fulfill']>[0],
    selector?: RequestSelector
  ): boolean {
    const request = this.findRequest(selector);
    if (request) {
      request.resolve(['fulfill', [response]]);
      return true;
    }
    return false;
  }

  /**
   * Fallback a pending request to the next route handler.
   * @param overrides - Optional overrides to pass to route.fallback()
   * @param selector - Optional index or predicate to select which request. Defaults to oldest (index 0).
   * @returns true if a request was fallbacked, false if no matching request
   */
  fallback(
    overrides?: Parameters<Route['fallback']>[0],
    selector?: RequestSelector
  ): boolean {
    const request = this.findRequest(selector);
    if (request) {
      const args: Parameters<Route['fallback']> =
        overrides !== undefined ? [overrides] : [];
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
}
