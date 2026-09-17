import { Result } from "./result.ts";

export const Trail = {
  from<T>(initialData: T) {
    return createTrail(initialData);
  },
};

function createTrail<T>(initialData: T, steps: ReadonlyArray<Step<unknown, unknown>> = []): Trail<T> {
  return {
    chain<U>(fn: Step<T, U>): Trail<U> {
      return createTrail<U>(initialData as unknown as U, [...steps, fn as Step<unknown, unknown>]);
    },
    async run(): Promise<Result<T, Error>> {
      if (steps.length === 0) {
        return Result.wrap(initialData);
      }
      let current: Result<unknown, Error> = Result.wrap(initialData);
      for (const step of steps) {
        if (current.isError()) {
          return current as unknown as Result<T, Error>;
        }
        current = await step(current.unwrap());
      }
      return current as unknown as Result<T, Error>;
    },
    steps,
  };
}

type Trail<T> = {
  readonly steps: ReadonlyArray<Step<T, unknown>>;
  chain: <U>(fn: Step<T, U>) => Trail<U>;
  run(): Promise<Result<T, Error>>;
};

type StepResult<U> = Promise<Result<U, Error>>;

type Step<T, U> = (value: T) => StepResult<U>;
