# playwright-route-controller

## 0.3.0

### Minor Changes

- 8b3a91a: Add `expectedRequests` option to enforce request count limits and throw an error when exceeded.

  Add `RequestSelector` support to `abort()`, `continue()`, `fulfill()`, and `fallback()` methods, allowing targeting of specific pending requests by index or predicate function instead of only the oldest request.

## 0.2.3

### Patch Changes

- ca33f4d: test

## 0.2.2

### Patch Changes

- 2bb3882: test
- 40cf17e: test

## 0.2.1

### Patch Changes

- 8ca39c6: test

## 0.2.0

### Minor Changes

- 811427e: - refactored RouteController options?.method to controllerInstance.method()
  - let route actions accept args
  - minor tweeks in the readme

## 0.1.0

### Minor Changes

- e2c6184: Initial implementation
