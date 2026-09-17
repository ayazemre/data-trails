# Changelog

## [0.9.0] - 2026-09-17

- Restrict `Trail` to async `Result`-only chaining with `StepResult` and `Step` aliases and direct `await` single `Result` state.
- Forbid throwing inside chain functions by convention and keep `run` total for returned `Result` values.
- Update trail tests to `Result`-only helpers without throws.

## [0.8.3] - 2026-09-16

- Trim `README.md` implementation details and keep behavior focused usage and API sections.

## [0.8.2] - 2026-09-16

- Rename error normalizer to `toErrorResult` with explicit return type and antipattern message for non error throws.
- Normalize async thenables with `Promise.resolve` and reorder `Result` exports to the top.
- Remove `as any` from `unwrap` paths.

## [0.8.1] - 2026-09-07

- Remove implementation details from `Trail` documentation and add workflow rail explanation for success and error encapsulation.

## [0.8.0] - 2026-09-07

- Simplify `Trail` to async-only with `initialData` first: `Trail.from<T>(initialData: T)`, `chain<U>((value: T) => Promise<U>)`, `run(): Promise<Result<T, Error>>` and always-await `run` via `Result.from`.
- Unify `Result` to `Result.from` with `then` detection and `Result.void`/`wrap` semantics, remove `Result.sync`/`async` split.
- Update documentation and tests for async-only trail including empty, batch and immutability cases.

## [0.7.1] - 2026-08-18

- Added documentation CLI tool with section filtering (--documentation).

## [0.7.0] - 2026-06-03

- Added type guard to `Result.isError()` to improve type narrowing and cross-type compatibility.

## [0.6.0] - 2026-05-15

- Added `Result.void` helper for successful operations without return values.

## [0.5.0] - 2026-05-15

- Integrated Oxc linting and formatting tooling.
- Updated project dependencies.

## [0.4.0] - 2026-03-04

- Update project configuration and metadata.
- Refactor type system and finalize `Result` implementation.

## [0.3.0] - 2025-10-18

- Update project metadata, license, and package configuration.

## [0.2.0] - 2025-10-17

- Add `mapError` support to `Result` type.
- Refactor package structure and CI/CD workflows (GitHub Actions).

## [0.1.0] - 2025-09-20

- Initial implementation of library features and CI/CD pipelines.

## [0.0.1] - 2024-05-06

- Initial project setup.
