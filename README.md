# Data Trails

[![npm version](https://badge.fury.io/js/data-trails.svg)](https://badge.fury.io/js/data-trails)

Data Trails is a small TypeScript library for operations that can fail, like network requests, file system work, or parsing. It centers on two pieces that work together, `Result` and `Trail`.

- **`Result`**: Holds either a value or an error for one operation, so you check the outcome in one place with `isError`, then read it with `unwrap` or `unwrapError`.
- **`Trail`**: Chains several async `Result` steps in order. You give it starting data with `Trail.from`, add stages with `chain`, and execute everything with `run`.

You use this when you want the happy path to read top to bottom, with early exit on the first error instead of nested `try` blocks.

## Installation

```bash
npm install data-trails
```

## Core Concept: `Result`

The `Result<T, E = Error>` type models two outcomes explicitly, so the compiler and the reader both see what can happen:

- `T`: The call produced a value you can use downstream.
- `E`: The call produced an error you need to handle.

You branch with `isError`, which narrows the type for you. If thrown content is not an `Error`, it is converted to an error `Result` with a fixed antipattern message and the original value kept in `cause`, so downstream code always sees an `Error`.

### `Result.wrap`

`Result.wrap` lifts an existing value into a `Result` so it flows through the same checks. It inspects the value with `Error.isError`, which is why an `Error` instance becomes an error `Result` and any other value becomes a success `Result` you can unwrap directly.

```typescript
import { Result } from "data-trails";

const success = Result.wrap("Hello"); // Result<string, never>
const failure = Result.wrap(new Error("Fail")); // Result<never, Error>
```

Signature: `wrap<T>(value: T): T extends Error ? Result<never, T> : Result<T, never>`

### `Result.from`

`Result.from` runs your function and captures the failure for you, so you do not need a local `try` block. If the function throws synchronously you get back a `Result`, and if it returns a `Promise` that rejects you get back a `Promise<Result>`. That is why the same helper covers both sync parsing and async fetching.

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

`Result.void(): Result<void, Error>` returns a success with no value. You use it when the work itself matters, like completing a write, and there is nothing useful to pass downstream.

### Result instance

```typescript
export type Result<T, E = Error> = {
  unwrap(): T;
  unwrapError(): E;
  mapError(fn: (error: E) => E): Result<T, E>;
  isError(): this is Result<never, E>;
};
```

Call `isError` first because it narrows the union for TypeScript. On the success branch you read with `unwrap`, on the error branch you read with `unwrapError`. Use `mapError` when you want to add context or remap the error, and note it expects an error `Result` so calling it on success throws.

## Core Concept: `Trail`

`Trail` chains async stages where each stage already returns a `Result`, so you do not unwrap and rewrap at every step. You provide the starting value once with `Trail.from`, then each `chain` receives the unwrapped value from the previous success and returns `Promise<Result<U, Error>>` for the next type. When you call `run`, it awaits each stage in order and passes the unwrapped value forward. If a stage returns an error `Result`, `run` stops there and returns that error, so later stages never execute. Chain functions should return errors instead of throwing, because `run` treats the returned `Result` as the control signal.

```typescript
export type Trail<T> = {
  readonly steps: ReadonlyArray<Step<T, unknown>>;
  chain: <U>(fn: Step<T, U>) => Trail<U>;
  run(): Promise<Result<T, Error>>;
};

export type StepResult<U> = Promise<Result<U, Error>>;
export type Step<T, U> = (value: T) => StepResult<U>;
```

Think of `Trail` as two rails where only one runs. You stay on success while each `chain` returns success, with the unwrapped type changing from `T` to `U` as you transform. Building with `Trail.from` plus `chain` only records stages, which is why `steps` stays immutable and reusable. Calling `run` executes the recording, and the first error `Result` switches you to the error rail, meaning remaining stages are skipped and that error is returned directly.

### `Trail` Usage

```typescript
import { Result, Trail } from "data-trails";

declare function fetchUser(userId: string): Promise<{ email: string }>;
declare function validateUser(user: { email: string }): Promise<Result<{ email: string; valid: boolean }, Error>>;
declare function saveUser(user: { email: string; valid: boolean }): Promise<Result<boolean, Error>>;

async function onboardUser(userId: string) {
  const user = await fetchUser(userId);
  const finalResult = await Trail.from(user)
    .chain((u) => validateUser(u))
    .chain((validated) => saveUser(validated))
    .run();

  if (!finalResult.isError()) console.log("User onboarding successful!");
  else console.error("Onboarding failed:", finalResult.unwrapError().message);
}
```

Batch sync work in async flow:

```typescript
const result = await Trail.from("base")
  .chain(async (value) => Result.wrap(value + "-a"))
  .chain(async (value) => Result.wrap(value + "-b"))
  .chain(async (value) => Result.wrap(value + "-c"))
  .run(); // Promise<Result<string, Error>> with "base-a-b-c"
```

Write each `chain` as `async` returning `Promise<Result>`, even for sync style transforms, so the signature stays uniform and `U` infers from the inner `Result`. Wrap plain values with `Result.wrap` because returning `U` directly will not type check against `Step<T, U>`. Return `Result.wrap(new Error(...))` for expected failures instead of throwing, since throwing escapes `run` instead of producing an error `Result`.

## API

### `Result<T, E = Error>`

- `Result.wrap<T>(value: T): T extends Error ? Result<never, T> : Result<T, never>`
- `Result.from<T>(fn: () => Promise<T>): Promise<Result<T, Error>>`
- `Result.from<T>(fn: () => T): Result<T, Error>`
- `Result.void(): Result<void, Error>`
- `Result` instance: `isError()`, `unwrap()`, `unwrapError()`, `mapError(fn)`

### `Trail<T>`

- `Trail.from<T>(initialData: T): Trail<T>` stores the starting value and an empty stage list you extend with `chain`.
- `.chain<U>(fn: Step<T, U>): Trail<U>` appends `fn` and changes the tracked type to `U`, inferred from the returned `Result<U, Error>`.
- `.run(): Promise<Result<T, Error>>` awaits stages in order, feeds unwrapped successes forward, and returns early on the first error `Result`.
- `.steps: ReadonlyArray<Step<T, unknown>>` holds appended stages in order, so you can inspect length or reuse the base trail.
- `StepResult<U> = Promise<Result<U, Error>>` is the only accepted return shape, which keeps sync style and async stages consistent.
- `Step<T, U> = (value: T) => StepResult<U>` maps the previous unwrapped value to the next async `Result`.

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue.

## License

MIT
