export const Result = { from, void: (): Result<void, Error> => wrap(undefined as unknown as void), wrap };

export type Result<T, E = Error> = {
  unwrap(): T;
  unwrapError(): E;
  mapError(fn: (error: E) => E): Result<T, E>;
  isError(): this is Result<never, E>;
};

function wrap<T>(value: T): T extends Error ? Result<never, T> : Result<T, never> {
  return {
    isError() {
      return Error.isError(value);
    },

    mapError(fn: (error: Error) => Error) {
      if (Error.isError(value)) {
        return wrap(fn(value));
      } else {
        throw new Error("Wrapped result is not an error. Use isError helper.");
      }
    },

    unwrap() {
      if (Error.isError(value)) {
        throw new Error("Wrapped result is an error. Use isError helper.");
      }
      return value;
    },

    unwrapError() {
      if (Error.isError(value)) {
        return value;
      }
      throw new Error("Wrapped result is not an error. Use isError helper.");
    },
  } as any;
}

function from<T>(fn: () => Promise<T>): Promise<Result<T, Error>>;
function from<T>(fn: () => T): Result<T, Error>;
function from<T>(fn: () => T | Promise<T>): Result<T, Error> | Promise<Result<T, Error>> {
  try {
    const value = fn();
    if (value && typeof (value as Promise<T>).then === "function") {
      return Promise.resolve(value).then(
        (resolvedValue) => wrap(resolvedValue),
        (error) => toErrorResult(error),
      ) as Promise<Result<T, Error>>;
    }
    return wrap(value as T);
  } catch (error) {
    return toErrorResult(error);
  }
}

function toErrorResult(error: unknown): Result<never, Error> {
  return Error.isError(error)
    ? wrap(error)
    : wrap(new Error("Non error object thrown. This is an antipattern. Please throw a normal error object or an extension of it.", { cause: error }));
}
