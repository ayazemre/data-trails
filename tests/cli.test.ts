import { equal, match, throws } from "assert";
import { execFileSync } from "child_process";
import { describe, test } from "node:test";

describe("CLI", () => {
  const cliPath = "./src/cli.ts";

  test("Help Flag", async () => {
    const output = execFileSync(process.execPath, [cliPath, "--help"], { encoding: "utf-8" });

    match(output, /Documentation CLI/);
    match(output, /--documentation/);
    match(output, /--help/);
  });

  test("Documentation Flag", async () => {
    const output = execFileSync(process.execPath, [cliPath, "--documentation"], { encoding: "utf-8" });

    match(output, /# Data Trails/);
    match(output, /npm install data-trails/);
  });

  test("No Flags", async () => {
    throws(
      () => {
        execFileSync(process.execPath, [cliPath], { encoding: "utf-8", stdio: "pipe" });
      },
      (error: any) => {
        equal(error.status, 1);
        match(error.stderr, /Error: No flags provided\./);
        return true;
      },
    );
  });
});
