# Data Trails

[![npm version](https://badge.fury.io/js/data-trails.svg)](https://badge.fury.io/js/data-trails)

Data Trails is a lightweight TypeScript library that provides a robust and elegant way to handle operations that might fail, such as network requests, file system operations, or any function that can throw an error. It's built around two core concepts: `Result` and `Trail`.

- **`Result`**: A wrapper for functions that might fail. It prevents exceptions from being thrown, catches them, and forces you to handle errors explicitly at the point of failure.
- **`Trail`**: An async-only utility for chaining multiple fallible async operations together, inspired by railway-oriented programming. Initial data is provided first, then `chain` steps are appended.

This approach helps you write more predictable and maintainable code by making error handling a first-class citizen.

## Installation

```bash
npm install data-trails
```

## Core Concept: `Result`

The `Result<T, E = Error>` type is a wrapper that represents one of two outcomes:

- `T`: The operation succeeded, containing a value of type `T`.
- `E`: The operation failed, containing an error.

This pattern prevents your application from crashing due to unhandled exceptions and makes error flow explicit. Non `Error` throws become error results with a fixed antipattern message and the original value preserved in `cause`.

### `Result.wrap`

Automatically wraps any value into a `Result`. If the value is an `Error` instance, it creates an error result. Otherwise, it creates a success result.

```typescript
import { Result } from "data-trails";

const success = Result.wrap("Hello"); // Result<string, never>
const failure = Result.wrap(new Error("Fail")); // Result<never, Error>
```

Signature: `wrap<T>(value: T): T extends Error ? Result<never, T> : Result<T, never>`

### `Result.from`

Wraps sync and async functions into a `Result`. Sync throws and async rejections both become error results.

```typescript
function from<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
function from<T>(fn: () => T): Result<T, Error>;
function from<T>(fn: () => T | Promise<T>): Result<T, Error> | Promise<Result<T, Error>>;
```

Example sync:

```typescript
import { Result } from "data-trails";

function parseJSON(jsonString: string): { message: string } {
  if (!jsonString) throw new Error("Input string cannot be empty!");
  return JSON.parse(jsonString);
}

const successResult = Result.from(() => parseJSON('{ "message": "Hello World" }'));
if (!successResult.isError()) console.log(successResult.unwrap().message);

const errorResult = Result.from(() => parseJSON("invalid-json"));
if (errorResult.isError()) console.error(errorResult.unwrapError().message);
```

Example async:

```typescript
import { Result } from "data-trails";

async function fetchUserData(userId: string): Promise<{ id: string; name: string }> {
  const response = await fetch(`https://api.example.com/users/${userId}`);
  if (!response.ok) throw new Error(`Failed to fetch user: ${response.statusText}`);
  return response.json();
}

async function getUser(id: string) {
  const userResult = await Result.from(() => fetchUserData(id));
  if (!userResult.isError()) console.log(`Welcome, ${userResult.unwrap().name}!`);
  else console.error(`Error: ${userResult.unwrapError().message}`);
}
```

### `Result.void`

`Result.void(): Result<void, Error>` creates a successful void result.

### Result instance

```typescript
export type Result<T, E = Error> = {
  unwrap(): T;
  unwrapError(): E;
  mapError(fn: (error: E) => E): Result<T, E>;
  isError(): this is Result<never, E>;
};
```

Use `isError` to narrow, then `unwrap` or `unwrapError`. `mapError` transforms the error side and throws if called on success.

## Core Concept: `Trail`

`Trail` is async-only. Provide initial data first, then chain async steps. If any step throws or rejects, the trail short-circuits and returns the first error.

```typescript
export type Trail<T> = {
  readonly steps: ReadonlyArray<(value: T) => Promise<unknown>>;
  chain: <U>(fn: (value: T) => Promise<U>) => Trail<U>;
  run(): Promise<Result<T, Error>>;
};
```

`Trail` encapsulates the success and error rails of a workflow in one go. You build the happy path with `Trail.from(initialData)` and `chain` steps, and `run` executes the entire workflow at once. If every step succeeds it stays on the success rail and returns the final value, if any step throws or rejects it switches to the error rail, short-circuits the remaining steps, and returns the first error as a single `Result`.

### `Trail` Usage

```typescript
import { Trail } from "data-trails";

declare function fetchUser(userId: string): Promise<{ email: string }>;
declare function validateUser(user: { email: string }): Promise<{ email: string; valid: boolean }>;
declare function saveUser(user: { email: string }): Promise<boolean>;

async function onboardUser(userId: string) {
  const user = await fetchUser(userId);
  const finalResult = await Trail.from(user)
    .chain(async (u) => validateUser(u))
    .chain(async (validated) => saveUser(validated))
    .run();

  if (!finalResult.isError()) console.log("User onboarding successful!");
  else console.error("Onboarding failed:", finalResult.unwrapError().message);
}
```

Batch sync work in async flow:

```typescript
const result = await Trail.from("base")
  .chain((value) => Promise.resolve(value + "-a"))
  .chain((value) => Promise.resolve(value + "-b"))
  .chain((value) => Promise.resolve(value + "-c"))
  .run(); // Promise<Result<string, Error>> with "base-a-b-c"
```

All `chain` functions must be `async` or return `Promise`. Sync ` (value) => value + 1` will not type-check.

## API

### `Result<T, E = Error>`

- `Result.wrap<T>(value: T): T extends Error ? Result<never, T> : Result<T, never>`
- `Result.from<T>(fn: () => Promise<T>): Promise<Result<T, Error>>`
- `Result.from<T>(fn: () => T): Result<T, Error>`
- `Result.void(): Result<void, Error>`
- `Result` instance: `isError()`, `unwrap()`, `unwrapError()`, `mapError(fn)`

### `Trail<T>`

- `Trail.from<T>(initialData: T): Trail<T>`
- `.chain<U>(fn: (value: T) => Promise<U>): Trail<U>` — append async step.
- `.run(): Promise<Result<T, Error>>` — run all steps in order, short-circuit on first error.
- `.steps: ReadonlyArray<(value: T) => Promise<unknown>>` — appended steps in order.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

MIT
