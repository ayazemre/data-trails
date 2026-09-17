import { equal } from "assert";
import { describe, test } from "node:test";

import { Result } from "#src/result.ts";
import { Trail } from "#src/trail.ts";

describe("Trail", () => {
  async function testAsyncObject<ExtendedObject extends object>(object: ExtendedObject): Promise<Result<ExtendedObject, Error>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return Result.wrap(object);
  }

  async function testAsyncError(message: string): Promise<Result<never, Error>> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return Result.wrap(new Error(message));
  }

  test("Async Success", async () => {
    const trail = Trail.from("testString");
    const trailResult = await trail.run();
    equal(trailResult.unwrap(), "testString");

    const trail2 = trail.chain((previousValue) => testAsyncObject({ propertyA: 12345, propertyB: previousValue }));
    const trailResult2 = await trail2.run();
    equal(trailResult2.unwrap().propertyA, 12345);
    equal(trailResult2.unwrap().propertyB, "testString");
  });

  test("Empty", async () => {
    const trail = Trail.from("initial");
    const result = await trail.run();
    equal(result.isError(), false);
    equal(result.unwrap(), "initial");
  });

  test("Batch Sync In Async", async () => {
    const trail = Trail.from("base")
      .chain(async (value) => Result.wrap(value + "-a"))
      .chain(async (value) => Result.wrap(value + "-b"))
      .chain(async (value) => Result.wrap(value + "-c"))
      .chain(async (value) => Result.wrap(value + "-d"));
    const result = await trail.run();
    equal(result.unwrap(), "base-a-b-c-d");
  });

  test("Sync Error", async () => {
    const trail = Trail.from("start").chain(async () => Result.wrap(new Error("sync throw")));
    const result = await trail.run();
    equal(result.isError(), true);
    equal(result.unwrapError().message, "sync throw");
  });

  test("Immutability", async () => {
    const base = Trail.from("base");
    const chained = base.chain(async (value) => Result.wrap(value + "-chained"));
    const baseResult = await base.run();
    const chainedResult = await chained.run();
    equal(baseResult.unwrap(), "base");
    equal(chainedResult.unwrap(), "base-chained");
    const baseAgain = await base.run();
    equal(baseAgain.unwrap(), "base");
  });

  test("Async Error", async () => {
    const trail = Trail.from("testString");
    const trailResult = await trail.run();
    equal(trailResult.unwrap(), "testString");

    const trail2 = trail.chain((previousValue) => testAsyncError(previousValue));
    const trailResult2 = await trail2.run();
    equal(trailResult2.isError(), true);
    equal(trailResult2.unwrapError().message, "testString");
  });

  test("Async Early Return", async () => {
    const trail = Trail.from("testString");
    const trailResult = await trail.run();
    equal(trailResult.unwrap(), "testString");

    const trail2 = trail.chain((previousValue) => testAsyncError(previousValue));
    const trailResult2 = await trail2.run();
    equal(trailResult2.isError(), true);
    equal(trailResult2.unwrapError().message, "testString");

    const trail3 = trail2.chain((previousValue) => testAsyncObject({ propertyA: 12345, propertyB: previousValue }));
    const trailResult3 = await trail3.run();
    equal(trailResult3.isError(), true);
    equal(trailResult3.unwrapError().message, "testString");
  });
});
