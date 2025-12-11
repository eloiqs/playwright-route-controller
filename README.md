# playwright-route-controller

A Playwright utility for controlling network requests - intercept, abort, continue, and fulfill requests with ease.

[![npm version](https://img.shields.io/npm/v/playwright-route-controller.svg)](https://www.npmjs.com/package/playwright-route-controller)
[![CI](https://github.com/yourusername/playwright-route-controller/actions/workflows/ci.yml/badge.svg)](https://github.com/yourusername/playwright-route-controller/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Simple API** - Queue and control intercepted requests manually
- **Method filtering** - Intercept only specific HTTP methods (GET, POST, etc.)
- **Timeout support** - Auto-continue requests after a configurable timeout
- **Full TypeScript support** - Complete type definitions included
- **ESM & CJS** - Works with both module systems

## Installation

```bash
npm install playwright-route-controller
# or
pnpm add playwright-route-controller
# or
yarn add playwright-route-controller
```

**Note:** This package requires `@playwright/test` as a peer dependency.

## Quick Start

```typescript
import { test, expect } from '@playwright/test';
import { RouteController } from 'playwright-route-controller';

test('test optimistic updates with network failure', async ({ page }) => {
  const controller = new RouteController();

  // Set up route interception
  await page.route('**/api/messages', (route) => controller.post(route));

  await page.goto('https://example.com');

  // Trigger a POST request (e.g., submit a form)
  await page.click('button[type="submit"]');

  // Wait for the request to be intercepted
  await controller.waitForPending();

  // Simulate network failure
  controller.abort();

  // Assert optimistic UI was rolled back
  await expect(page.locator('.error-message')).toBeVisible();

  // Clean up
  controller.dispose();
});
```

## API Reference

### `new RouteController(config?)`

Create a new RouteController instance.

#### Config

| Option    | Type     | Description                                                  |
| --------- | -------- | ------------------------------------------------------------ |
| `timeout` | `number` | Auto-continue pending requests after this many milliseconds. |

### `controller.handle(route)`

Handle an intercepted route. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.handle(route));
```

### `controller.abort()`

Abort the oldest pending request.

```typescript
const aborted = controller.abort(); // Returns true if a request was aborted
```

### `controller.continue()`

Continue the oldest pending request.

```typescript
const continued = controller.continue(); // Returns true if a request was continued
```

### `controller.fulfill(response)`

Fulfill the oldest pending request with a custom response.

```typescript
controller.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ success: true }),
});
```

### `controller.get(route)`

Handle an intercepted get request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.get(route));
```

Non-matching methods are automatically continued.

### `controller.post(route)`

Handle an intercepted post request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.post(route));
```

Non-matching methods are automatically continued.

### `controller.put(route)`

Handle an intercepted put request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.put(route));
```

Non-matching methods are automatically continued.

### `controller.delete(route)`

Handle an intercepted delete request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.delete(route));
```

Non-matching methods are automatically continued.

### `controller.patch(route)`

Handle an intercepted patch request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.patch(route));
```

Non-matching methods are automatically continued.

### `controller.head(route)`

Handle an intercepted head request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.head(route));
```

Non-matching methods are automatically continued.

### `controller.connect(route)`

Handle an intercepted connect request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.connect(route));
```

Non-matching methods are automatically continued.

### `controller.trace(route)`

Handle an intercepted trace request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.trace(route));
```

Non-matching methods are automatically continued.

### `controller.options(route)`

Handle an intercepted options request. Call this from `page.route()` callback.

```typescript
await page.route('**/api/**', (route) => controller.options(route));
```

Non-matching methods are automatically continued.

### `controller.abortAll()`

Abort all pending requests.

```typescript
const count = controller.abortAll(); // Returns number of requests aborted
```

### `controller.continueAll()`

Continue all pending requests.

```typescript
const count = controller.continueAll(); // Returns number of requests continued
```

### `controller.waitForPending(timeout?)`

Wait for a request to become pending. Useful to ensure a request has been intercepted before aborting/continuing.

```typescript
await controller.waitForPending(5000); // Throws after 5000ms if no request
```

### `controller.pendingCount`

Number of currently pending requests.

```typescript
console.log(controller.pendingCount); // 2
```

### `controller.hasPending`

Whether there are any pending requests.

```typescript
if (controller.hasPending) {
  controller.abort();
}
```

### `controller.dispose()`

Clean up any pending timeouts. Call this in test cleanup if using timeouts.

```typescript
test.afterEach(async () => {
  controller.dispose();
});
```

## Examples

### Testing Optimistic Updates

```typescript
test('optimistic update rolls back on failure', async ({ page }) => {
  const controller = new RouteController();
  await page.route('**/api/todos', (route) => controller.handle(route));

  await page.goto('/todos');

  // Add a todo (triggers POST)
  await page.fill('input[name="title"]', 'New Todo');
  await page.click('button[type="submit"]');

  // Todo appears optimistically
  await expect(page.locator('.todo-item')).toContainText('New Todo');

  // Simulate server failure
  await controller.waitForPending();
  controller.abort();

  // Todo should be removed after rollback
  await expect(page.locator('.todo-item')).not.toContainText('New Todo');
  await expect(page.locator('.error')).toBeVisible();
});
```

### Testing Loading States

```typescript
test('shows loading spinner during request', async ({ page }) => {
  const controller = new RouteController();
  await page.route('**/api/data', (route) => controller.handle(route));

  await page.goto('/dashboard');

  // Loading state should be visible
  await expect(page.locator('.spinner')).toBeVisible();

  // Complete the request
  controller.fulfill({
    status: 200,
    body: JSON.stringify({ items: [] }),
  });

  // Loading state should be hidden
  await expect(page.locator('.spinner')).not.toBeVisible();
});
```

### Auto-Continue with Timeout

```typescript
test('request auto-continues after timeout', async ({ page }) => {
  const controller = new RouteController({ timeout: 1000 });
  await page.route('**/api/**', (route) => controller.handle(route));

  // Request will automatically continue after 1 second
  // Useful for tests where you only want to delay, not block
});
```

## Contributing

Contributions are welcome! Please read our contributing guidelines first.

```bash
# Clone the repository
git clone https://github.com/yourusername/playwright-route-controller.git
cd playwright-route-controller

# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Lint
npm run lint
```

## License

MIT
