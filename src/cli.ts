#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";

function showHelp() {
  console.log(`Documentation CLI

Usage:
  $ npx data-trails --documentation

Options:
  --documentation  Render documentation
  --help           Show this help menu`);
}

async function run() {
  const rawArgs = process.argv.slice(2);

  if (rawArgs.length === 0) {
    console.error("Error: No flags provided.\n");
    showHelp();
    process.exit(1);
  }

  const { values } = parseArgs({
    allowPositionals: false,
    args: process.argv.slice(2),
    options: {
      documentation: {
        type: "boolean",
      },
      help: {
        type: "boolean",
      },
    },
  });

  if (values.help) {
    showHelp();
    process.exit(0);
  }

  if (values.documentation) {
    const readme = await readFile(new URL("../README.md", import.meta.url), "utf-8");
    console.log(readme);
  }

  if (!values.help && !values.documentation) {
    console.error("Error: Missing required flag --documentation\n");
    showHelp();
    process.exit(1);
  }
}

run();
