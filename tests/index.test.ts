import { describe } from "node:test";

describe("Tests", async function () {
  await import("./cli.test.ts");
  await import("./result.test.ts");
  await import("./trail.test.ts");
});
