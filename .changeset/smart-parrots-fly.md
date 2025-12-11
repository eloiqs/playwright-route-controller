---
'playwright-route-controller': minor
---

Add `expectedRequests` option to enforce request count limits and throw an error when exceeded.

Add `RequestSelector` support to `abort()`, `continue()`, `fulfill()`, and `fallback()` methods, allowing targeting of specific pending requests by index or predicate function instead of only the oldest request.
