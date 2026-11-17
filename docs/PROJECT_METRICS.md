# HaiHire Platform Metrics

This inventory is generated from the Prisma schema, API controllers, AppModule, Playwright spec files, CI gate definitions, dependency manifests, and the local environment template. Playwright test declarations are counted statically. Use the output of `pnpm test` and `pnpm test:e2e` for execution results.

<!-- STATS:START -->

| Metric                                           |                  Count |
| ------------------------------------------------ | ---------------------: |
| Prisma models                                    |                     27 |
| Prisma enums                                     |                     18 |
| Project modules registered directly in AppModule |                     16 |
| Backend controllers                              |                     13 |
| API endpoints                                    | 114 (113 REST + 1 SSE) |
| Playwright spec files                            |                     13 |
| Playwright test declarations                     |                     67 |
| CI gates defined in check-all                    |                     18 |
| Keys in the local environment template           |                     56 |
| Pre-release dependency declarations              |                      0 |

<!-- STATS:END -->

Run `pnpm docs:stats:write` to regenerate the table. The `pnpm lint:doc-sync` gate checks it against the source inventory.
