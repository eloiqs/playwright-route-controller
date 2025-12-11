import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RouteController } from '../src/route-controller.js';
import { createMockRoute } from './mocks/playwright-mocks.js';

describe('RouteController', () => {
  let controller: RouteController;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create instance without options', () => {
      controller = new RouteController();
      expect(controller.pendingCount).toBe(0);
      expect(controller.hasPending).toBe(false);
    });

    it('should create instance with timeout', () => {
      controller = new RouteController({ timeout: 5000 });
      expect(controller.pendingCount).toBe(0);
    });

    it('should create instance with method filter', () => {
      controller = new RouteController({ method: 'POST' });
      expect(controller.pendingCount).toBe(0);
    });

    it('should create instance with match function', () => {
      controller = new RouteController({
        match: (request) => request.url().includes('/api/'),
      });
      expect(controller.pendingCount).toBe(0);
    });

    it('should create instance with expectedRequests', () => {
      controller = new RouteController({ expectedRequests: 2 });
      expect(controller.pendingCount).toBe(0);
    });
  });

  describe('handle()', () => {
    it('should add request to pending', async () => {
      controller = new RouteController();
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);
      expect(controller.hasPending).toBe(true);

      controller.continue();
      await handlePromise;

      expect(controller.pendingCount).toBe(0);
    });
  });

  describe('method filter', () => {
    it('should add request to pending when method matches', async () => {
      controller = new RouteController({ method: 'GET' });
      const mockRoute = createMockRoute({ method: 'GET' });

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise;

      expect(controller.pendingCount).toBe(0);
    });

    it('should continue immediately when method does not match', async () => {
      controller = new RouteController({ method: 'GET' });
      const mockRoute = createMockRoute({ method: 'POST' });

      await controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(0);
      expect(mockRoute.continue).toHaveBeenCalled();
    });

    it('should filter POST requests', async () => {
      controller = new RouteController({ method: 'POST' });
      const mockRoute = createMockRoute({ method: 'POST' });

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise;

      expect(controller.pendingCount).toBe(0);
    });

    it('should filter PUT requests', async () => {
      controller = new RouteController({ method: 'PUT' });
      const mockRoute = createMockRoute({ method: 'PUT' });

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise;
    });

    it('should filter DELETE requests', async () => {
      controller = new RouteController({ method: 'DELETE' });
      const mockRoute = createMockRoute({ method: 'DELETE' });

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise;
    });

    it('should filter PATCH requests', async () => {
      controller = new RouteController({ method: 'PATCH' });
      const mockRoute = createMockRoute({ method: 'PATCH' });

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise;
    });
  });

  describe('match function', () => {
    it('should add request to pending when match returns true', async () => {
      controller = new RouteController({
        match: (request) => request.url().includes('/api/'),
      });
      const mockRoute = createMockRoute({ url: 'https://example.com/api/data' });

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise;

      expect(controller.pendingCount).toBe(0);
    });

    it('should continue immediately when match returns false', async () => {
      controller = new RouteController({
        match: (request) => request.url().includes('/api/'),
      });
      const mockRoute = createMockRoute({ url: 'https://example.com/other' });

      await controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(0);
      expect(mockRoute.continue).toHaveBeenCalled();
    });

    it('should work with method filter combined', async () => {
      controller = new RouteController({
        method: 'POST',
        match: (request) => request.url().includes('/api/'),
      });

      // Both method and match pass
      const mockRoute1 = createMockRoute({
        method: 'POST',
        url: 'https://example.com/api/data',
      });
      const handlePromise1 = controller.handle(mockRoute1);
      expect(controller.pendingCount).toBe(1);
      controller.continue();
      await handlePromise1;

      // Method fails
      const mockRoute2 = createMockRoute({
        method: 'GET',
        url: 'https://example.com/api/data',
      });
      await controller.handle(mockRoute2);
      expect(controller.pendingCount).toBe(0);
      expect(mockRoute2.continue).toHaveBeenCalled();

      // Match fails
      const mockRoute3 = createMockRoute({
        method: 'POST',
        url: 'https://example.com/other',
      });
      await controller.handle(mockRoute3);
      expect(controller.pendingCount).toBe(0);
      expect(mockRoute3.continue).toHaveBeenCalled();
    });

    it('should allow filtering by request ID in URL', async () => {
      const targetId = '12345';
      controller = new RouteController({
        match: (request) => request.url().includes(targetId),
      });

      // Matches
      const mockRoute1 = createMockRoute({
        url: `https://example.com/api/items/${targetId}`,
      });
      const handlePromise = controller.handle(mockRoute1);
      expect(controller.pendingCount).toBe(1);
      controller.continue();
      await handlePromise;

      // Does not match
      const mockRoute2 = createMockRoute({
        url: 'https://example.com/api/items/67890',
      });
      await controller.handle(mockRoute2);
      expect(controller.pendingCount).toBe(0);
      expect(mockRoute2.continue).toHaveBeenCalled();
    });
  });

  describe('abort()', () => {
    it('should abort the oldest pending request', async () => {
      controller = new RouteController();
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      const result = controller.abort();

      expect(result).toBe(true);
      await handlePromise;
      expect(mockRoute.abort).toHaveBeenCalledWith();
    });

    it('should return false when no pending requests', () => {
      controller = new RouteController();

      const result = controller.abort();

      expect(result).toBe(false);
    });

    it('should abort only the oldest request when multiple are pending', async () => {
      controller = new RouteController();
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);
      const handlePromise2 = controller.handle(mockRoute2);

      expect(controller.pendingCount).toBe(2);

      controller.abort();
      await handlePromise1;

      expect(controller.pendingCount).toBe(1);
      expect(mockRoute1.abort).toHaveBeenCalledWith();
      expect(mockRoute2.abort).not.toHaveBeenCalled();

      controller.continue();
      await handlePromise2;
    });
  });

  describe('continue()', () => {
    it('should continue the oldest pending request', async () => {
      controller = new RouteController();
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      const result = controller.continue();

      expect(result).toBe(true);
      await handlePromise;
      expect(mockRoute.continue).toHaveBeenCalled();
    });

    it('should return false when no pending requests', () => {
      controller = new RouteController();

      const result = controller.continue();

      expect(result).toBe(false);
    });
  });

  describe('fulfill()', () => {
    it('should fulfill the oldest pending request with response', async () => {
      controller = new RouteController();
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      const response = { status: 200, body: JSON.stringify({ ok: true }) };
      const result = controller.fulfill(response);

      expect(result).toBe(true);
      await handlePromise;
      expect(mockRoute.fulfill).toHaveBeenCalledWith(response);
    });

    it('should return false when no pending requests', () => {
      controller = new RouteController();

      const result = controller.fulfill({ status: 200 });

      expect(result).toBe(false);
    });
  });

  describe('abortAll()', () => {
    it('should abort all pending requests', async () => {
      controller = new RouteController();
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();
      const mockRoute3 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);
      const handlePromise2 = controller.handle(mockRoute2);
      const handlePromise3 = controller.handle(mockRoute3);

      expect(controller.pendingCount).toBe(3);

      const count = controller.abortAll();

      expect(count).toBe(3);
      await Promise.all([handlePromise1, handlePromise2, handlePromise3]);

      expect(mockRoute1.abort).toHaveBeenCalledWith();
      expect(mockRoute2.abort).toHaveBeenCalledWith();
      expect(mockRoute3.abort).toHaveBeenCalledWith();
      expect(controller.pendingCount).toBe(0);
    });

    it('should return 0 when no pending requests', () => {
      controller = new RouteController();

      const count = controller.abortAll();

      expect(count).toBe(0);
    });
  });

  describe('continueAll()', () => {
    it('should continue all pending requests', async () => {
      controller = new RouteController();
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);
      const handlePromise2 = controller.handle(mockRoute2);

      const count = controller.continueAll();

      expect(count).toBe(2);
      await Promise.all([handlePromise1, handlePromise2]);

      expect(mockRoute1.continue).toHaveBeenCalled();
      expect(mockRoute2.continue).toHaveBeenCalled();
      expect(controller.pendingCount).toBe(0);
    });

    it('should return 0 when no pending requests', () => {
      controller = new RouteController();

      const count = controller.continueAll();

      expect(count).toBe(0);
    });
  });

  describe('pendingCount', () => {
    it('should return correct count', async () => {
      controller = new RouteController();

      expect(controller.pendingCount).toBe(0);

      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      const p1 = controller.handle(mockRoute1);
      expect(controller.pendingCount).toBe(1);

      const p2 = controller.handle(mockRoute2);
      expect(controller.pendingCount).toBe(2);

      controller.continueAll();
      await Promise.all([p1, p2]);

      expect(controller.pendingCount).toBe(0);
    });
  });

  describe('hasPending', () => {
    it('should return true when requests are pending', async () => {
      controller = new RouteController();

      expect(controller.hasPending).toBe(false);

      const mockRoute = createMockRoute();
      const p = controller.handle(mockRoute);

      expect(controller.hasPending).toBe(true);

      controller.continue();
      await p;

      expect(controller.hasPending).toBe(false);
    });
  });

  describe('waitForPending()', () => {
    it('should resolve immediately when request is already pending', async () => {
      controller = new RouteController();
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      await controller.waitForPending();

      expect(controller.hasPending).toBe(true);

      controller.continue();
      await handlePromise;
    });

    it('should wait for request to become pending', async () => {
      vi.useRealTimers();
      controller = new RouteController();
      const mockRoute = createMockRoute();

      const waitPromise = controller.waitForPending(1000);

      setTimeout(() => {
        controller.handle(mockRoute);
      }, 100);

      await waitPromise;

      expect(controller.hasPending).toBe(true);

      controller.continue();
    });

    it('should throw error after timeout', async () => {
      vi.useRealTimers();
      controller = new RouteController();

      await expect(controller.waitForPending(100)).rejects.toThrow(
        'No pending request after 100ms'
      );
    });
  });

  describe('expectedRequests option', () => {
    it('should allow requests up to expected count', async () => {
      controller = new RouteController({ expectedRequests: 2 });
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);
      const handlePromise2 = controller.handle(mockRoute2);

      expect(controller.pendingCount).toBe(2);

      controller.continueAll();
      await Promise.all([handlePromise1, handlePromise2]);
    });

    it('should throw error when exceeding expected request count', async () => {
      controller = new RouteController({ expectedRequests: 1 });
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);

      expect(controller.pendingCount).toBe(1);

      await expect(controller.handle(mockRoute2)).rejects.toThrow(
        'Expected 1 request(s), but received more. Currently 1 pending request(s).'
      );

      controller.continue();
      await handlePromise1;
    });

    it('should throw error with expectedRequests of 0', async () => {
      controller = new RouteController({ expectedRequests: 0 });
      const mockRoute = createMockRoute();

      await expect(controller.handle(mockRoute)).rejects.toThrow(
        'Expected 0 request(s), but received more. Currently 0 pending request(s).'
      );
    });

    it('should not enforce limit when expectedRequests is not set', async () => {
      controller = new RouteController();
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();
      const mockRoute3 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);
      const handlePromise2 = controller.handle(mockRoute2);
      const handlePromise3 = controller.handle(mockRoute3);

      expect(controller.pendingCount).toBe(3);

      controller.continueAll();
      await Promise.all([handlePromise1, handlePromise2, handlePromise3]);
    });

    it('should allow new requests after previous ones are resolved', async () => {
      controller = new RouteController({ expectedRequests: 1 });
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      const handlePromise1 = controller.handle(mockRoute1);
      controller.continue();
      await handlePromise1;

      // Now we can add another request
      const handlePromise2 = controller.handle(mockRoute2);
      expect(controller.pendingCount).toBe(1);

      controller.continue();
      await handlePromise2;
    });

    it('should work with other options combined', async () => {
      controller = new RouteController({
        expectedRequests: 1,
        method: 'POST',
      });

      // Non-matching request should not count towards limit
      const mockRouteGet = createMockRoute({ method: 'GET' });
      await controller.handle(mockRouteGet);
      expect(mockRouteGet.continue).toHaveBeenCalled();

      // First matching request should work
      const mockRoutePost1 = createMockRoute({ method: 'POST' });
      const handlePromise = controller.handle(mockRoutePost1);
      expect(controller.pendingCount).toBe(1);

      // Second matching request should throw
      const mockRoutePost2 = createMockRoute({ method: 'POST' });
      await expect(controller.handle(mockRoutePost2)).rejects.toThrow(
        'Expected 1 request(s), but received more.'
      );

      controller.continue();
      await handlePromise;
    });
  });

  describe('timeout option', () => {
    it('should auto-continue after timeout', async () => {
      controller = new RouteController({ timeout: 1000 });
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      vi.advanceTimersByTime(1000);

      await handlePromise;

      expect(mockRoute.continue).toHaveBeenCalled();
      expect(controller.pendingCount).toBe(0);
    });

    it('should clear timeout when manually resolved', async () => {
      controller = new RouteController({ timeout: 5000 });
      const mockRoute = createMockRoute();

      const handlePromise = controller.handle(mockRoute);

      controller.abort();
      await handlePromise;

      expect(mockRoute.abort).toHaveBeenCalledWith();

      vi.advanceTimersByTime(5000);

      expect(mockRoute.continue).not.toHaveBeenCalled();
    });
  });

  describe('dispose()', () => {
    it('should clear all pending requests', async () => {
      controller = new RouteController();
      const mockRoute = createMockRoute();

      controller.handle(mockRoute);

      expect(controller.pendingCount).toBe(1);

      controller.dispose();

      expect(controller.pendingCount).toBe(0);
      expect(controller.hasPending).toBe(false);
    });

    it('should clear all timeouts', () => {
      controller = new RouteController({ timeout: 5000 });
      const mockRoute1 = createMockRoute();
      const mockRoute2 = createMockRoute();

      controller.handle(mockRoute1);
      controller.handle(mockRoute2);

      controller.dispose();

      vi.advanceTimersByTime(5000);

      expect(mockRoute1.continue).not.toHaveBeenCalled();
      expect(mockRoute2.continue).not.toHaveBeenCalled();
    });
  });
});
