import type { Route } from '@playwright/test';

type RouteAction =
  | 'abort'
  | 'continue'
  | ['fulfill', Parameters<Route['fulfill']>[0]];

interface PendingRequest {
  resolve: (action: RouteAction) => void;
  route: Route;
  timestamp: number;
}

export interface RouteControllerOptions {
  /** HTTP method to intercept (e.g., 'POST', 'GET'). If not set, intercepts all methods. */
  method?: string;
  /** Timeout in milliseconds. If set, pending requests will auto-continue after timeout. */
  timeout?: number;
}

/**
 * Controls network requests for testing optimistic updates and error scenarios.
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

  constructor(private readonly options?: RouteControllerOptions) {}

  /**
   * Handle an intercepted route. Call this from page.route() callback.
   * Non-matching methods (if options.method is set) are automatically continued.
   */
  async handle(route: Route): Promise<void> {
    // If method filter is set and doesn't match, continue immediately
    if (
      this.options?.method &&
      route.request().method() !== this.options.method
    ) {
      return route.continue();
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
    if (this.options?.timeout) {
      const timeoutId = setTimeout(() => {
        this.timeoutIds.delete(request);
        request.resolve('continue');
      }, this.options.timeout);
      this.timeoutIds.set(request, timeoutId);
    }

    const action = await actionPromise;

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

    if (action === 'abort') {
      await route.abort('failed');
    } else if (action === 'continue') {
      await route.continue();
    } else {
      const [method, args] = action;
      if (method === 'fulfill') {
        await route.fulfill(args);
      }
    }
  }

  /**
   * Abort the oldest pending request.
   * @returns true if a request was aborted, false if no pending requests
   */
  abort(): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve('abort');
      return true;
    }
    return false;
  }

  /**
   * Continue the oldest pending request.
   * @returns true if a request was continued, false if no pending requests
   */
  continue(): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve('continue');
      return true;
    }
    return false;
  }

  fulfill(response: Parameters<Route['fulfill']>[0]): boolean {
    const request = this.pendingRequests[0];
    if (request) {
      request.resolve(['fulfill', response]);
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
      request.resolve('abort');
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
      request.resolve('continue');
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
