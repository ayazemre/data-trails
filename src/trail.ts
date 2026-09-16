import { Result } from "./result.ts";

export type Trail<T> = {
  readonly steps: ReadonlyArray<(value: T) => Promise<unknown>>;
  chain: <U>(fn: (value: T) => Promise<U>) => Trail<U>;
  run(): Promise<Result<T, Error>>;
};

function createTrail<T>(initialData: T, steps: ReadonlyArray<(value: unknown) => Promise<unknown>> = []): Trail<T> {
  return {
    chain<U>(fn: (value: T) => Promise<U>): Trail<U> {
      return createTrail<U>(initialData as unknown as U, [...steps, fn as (value: unknown) => Promise<unknown>]);
    },
    async run(): Promise<Result<T, Error>> {
      let current: unknown = initialData;
      let lastResult: Result<unknown, Error> = Result.wrap(current as unknown as T) as unknown as Result<unknown, Error>;
      for (const step of steps) {
        lastResult = await Result.from(() => step(current));
        if (lastResult.isError()) return lastResult as unknown as Result<T, Error>;
        current = lastResult.unwrap();
      }
      return lastResult as unknown as Result<T, Error>;
    },
    steps,
  };
}

export const Trail = {
  from<T>(initialData: T) {
    return createTrail(initialData);
  },
};
