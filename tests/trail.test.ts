import { equal } from "assert";
import { describe, test } from "node:test";

import { Trail } from "#src/trail.ts";

describe("Trail", () => {
  async function testAsyncObject<T extends object>(object: T) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return object;
  }

  async function testAsyncThrows(message: string) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    throw new Error(message);
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
      .chain((value) => Promise.resolve(value + "-a"))
      .chain((value) => Promise.resolve(value + "-b"))
      .chain((value) => Promise.resolve(value + "-c"))
      .chain((value) => Promise.resolve(value + "-d"));
    const result = await trail.run();
    equal(result.unwrap(), "base-a-b-c-d");
  });

  test("Throw Sync", async () => {
    const trail = Trail.from("start").chain(() => {
      throw new Error("sync throw");
    });
    const result = await trail.run();
    equal(result.isError(), true);
    equal(result.unwrapError().message, "sync throw");
  });

  test("Immutability", async () => {
    const base = Trail.from("base");
    const chained = base.chain((value) => Promise.resolve(value + "-chained"));
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

    const trail2 = trail.chain((previousValue) => testAsyncThrows(previousValue));
    const trailResult2 = await trail2.run();
    equal(trailResult2.isError(), true);
    equal(trailResult2.unwrapError().message, "testString");
  });

  test("Async Early Return", async () => {
    const trail = Trail.from("testString");
    const trailResult = await trail.run();
    equal(trailResult.unwrap(), "testString");

    const trail2 = trail.chain((previousValue) => testAsyncThrows(previousValue));
    const trailResult2 = await trail2.run();
    equal(trailResult2.isError(), true);
    equal(trailResult2.unwrapError().message, "testString");

    const trail3 = trail2.chain((previousValue) => testAsyncObject({ propertyA: 12345, propertyB: previousValue }));
    const trailResult3 = await trail3.run();
    equal(trailResult3.isError(), true);
    equal(trailResult3.unwrapError().message, "testString");
  });
});
