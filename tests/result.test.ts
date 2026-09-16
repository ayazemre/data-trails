import { equal, throws } from "assert";
import { describe, test } from "node:test";

import { Result } from "#src/result.ts";

describe("Result", () => {
  function testFunctionSync(params: { throws?: boolean; returns?: string | null | undefined }) {
    if (params.throws) throw new Error("Test Error");
    if (params.returns) return params.returns;
    return null;
  }

  async function testFunctionAsync(params: { throws?: boolean; returns?: string | null | undefined }) {
    if (params.throws) throw new Error("Test Error");
    if (params.returns) return params.returns;
    return null;
  }

  test("Wrap Success", async () => {
    const wrapped = Result.wrap("Data");

    equal(wrapped.unwrap(), "Data");
    throws(() => wrapped.unwrapError());
    equal(wrapped.isError(), false);
  });

  test("Wrap Error", async () => {
    const wrapped = Result.wrap(new Error("Test Error"));

    equal(wrapped.unwrapError().message, "Test Error");
    throws(() => wrapped.unwrap());
    equal(wrapped.isError(), true);
  });

  test("Sync Success", async () => {
    const result = Result.from(() => testFunctionSync({ returns: "Data" }));

    equal(result.unwrap(), "Data");
    throws(() => result.unwrapError());
    equal(result.isError(), false);
  });

  test("Sync Void Success", async () => {
    const result = Result.from(() => {});

    equal(result.unwrap(), undefined);
    throws(() => result.unwrapError());
    equal(result.isError(), false);
  });

  test("Void Result", async () => {
    const result = Result.void();

    equal(result.unwrap(), undefined);
    throws(() => result.unwrapError());
    equal(result.isError(), false);
  });

  test("Sync Throw Capture", async () => {
    const result = Result.from(() => testFunctionSync({ throws: true }));

    throws(() => result.unwrap());
    equal(result.unwrapError().message, "Test Error");
    equal(result.isError(), true);
  });

  test("Sync Map Error", async () => {
    const result = Result.from(() => testFunctionSync({ throws: true }));

    throws(() => result.unwrap());
    equal(result.unwrapError().message, "Test Error");
    equal(result.isError(), true);

    const mappedResult = result.mapError((error) => {
      error.message = "Transformed Error";
      return error;
    });

    equal(mappedResult.unwrapError().message, "Transformed Error");
  });

  // Async Test

  test("Async Success", async () => {
    const result = await Result.from(() => testFunctionAsync({ returns: "Data" }));

    equal(result.unwrap(), "Data");
    throws(() => result.unwrapError());
    equal(result.isError(), false);
  });

  test("Async Throw Capture", async () => {
    const result = await Result.from(() => testFunctionAsync({ throws: true }));

    throws(() => result.unwrap());
    equal(result.unwrapError().message, "Test Error");
    equal(result.isError(), true);
  });

  test("Async Map Error", async () => {
    const result = await Result.from(() => testFunctionAsync({ throws: true }));

    throws(() => result.unwrap());
    equal(result.unwrapError().message, "Test Error");
    equal(result.isError(), true);
    const mappedError = result.mapError((error) => {
      error.message = "Transformed Error";
      return error;
    });
    equal(mappedError.unwrapError().message, "Transformed Error");
  });

  test("Sync Map Error on Success", async () => {
    const result = Result.from(() => "Success");
    throws(() => result.mapError((e) => e), {
      message: "Wrapped result is not an error. Use isError helper.",
    });
  });

  test("Custom Error Subclass Preservation", async () => {
    class CustomError extends Error {
      code = 404;
    }
    const result = Result.wrap(new CustomError("Not Found"));

    equal(result.isError(), true);
    equal(result.unwrapError() instanceof CustomError, true);
    equal(result.unwrapError().code, 404);
  });

  test("Non-Error Capture", async () => {
    const result = await Result.from(() => {
      throw "Non-Error Value";
    });

    equal(result.isError(), true);
    equal(result.unwrapError().cause, "Non-Error Value");
  });

  test("Type Guard", async () => {
    function typeGuardTest(): Result<number, Error> {
      const result = Result.from((): string => {
        throw new Error("Test Error");
      });

      if (result.isError()) {
        return result;
      }

      const wrappedResult = Result.wrap(1);
      return wrappedResult;
    }

    const result = typeGuardTest();
    equal(result.isError(), true);
  });
});
