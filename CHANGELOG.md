# Changelog

All notable changes to the HaiHire Enterprise ATS platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Unified Zod validation schemas across `@haihire/shared` and NestJS `DtoPipe`.
- Modularized Kanban pipeline state machine hook (`usePipelineKanban`).
- Sourcing query layer decomposition (`SourcingQueryService` and `SourcingMetricsService`).
- Explicit PostgreSQL connection pool management in `PrismaService`.

### Changed

- Streamlined domain sourcing attribution parsing via declarative domain lookup.
- Optimized jobs filtering and pagination executed directly at PostgreSQL layer.
- Cleaned and consolidated architecture documentation and removed legacy release logs.

### Fixed

- Resolved transitive CVE vulnerabilities in `qs` and `stream-json`.
- Eliminated Node 22+ shell spawn deprecation warnings.
