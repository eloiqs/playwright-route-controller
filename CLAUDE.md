# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

playwright-route-controller is a Playwright utility for controlling network requests in tests. It intercepts routes and queues them, allowing tests to manually abort, continue, or fulfill requests to simulate various network conditions (failures, delays, custom responses).

## Commands

```bash
npm run build        # Build with tsup (outputs ESM + CJS to dist/)
npm test             # Run vitest in watch mode
npm run test:run     # Run tests once
npm run test:coverage # Run tests with coverage (80% threshold)
npm run lint         # Run ESLint
npm run lint:fix     # Fix lint issues
npm run typecheck    # TypeScript type checking
npm run format       # Format with Prettier
```

## Architecture

The library exports a single class `RouteController` from `src/route-controller.ts`:

- **Request queue pattern**: Intercepted routes are stored as promises in `pendingRequests` array. Each pending request has a `resolve` function that completes with the desired action (abort/continue/fulfill/fallback).
- **FIFO processing**: Actions like `abort()`, `continue()`, `fulfill()` operate on the oldest pending request (index 0).
- **Filtering**: Requests can be filtered by HTTP method (`method` option) or custom match function (`match` option). Non-matching requests auto-continue.
- **Timeout handling**: Optional auto-continue after timeout, tracked in `timeoutIds` Map per request.
- **Request count enforcement**: Optional `expectedRequests` limit throws an error when exceeded, helping catch duplicate request bugs.

Tests use Vitest with mocked Playwright types (`tests/mocks/playwright-mocks.ts`) rather than actual browser automation.

## Key Conventions

- ESM-first (`"type": "module"`) with `.js` extensions in imports
- Strict TypeScript with `noUncheckedIndexedAccess`
- Uses changesets for versioning
- Husky + lint-staged for pre-commit hooks
