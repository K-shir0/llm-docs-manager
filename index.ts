#!/usr/bin/env bun

import { join } from "path";

const DEBUG = process.env.DEBUG === "1";

interface FileConfig {
  path: string;
  destination: string;
}

const FILES_TO_SYNC: FileConfig[] = [
  {
    path: "CLAUDE.md",
    destination: "CLAUDE.md",
  },
  {
    path: "docs/design.md.sample",
    destination: "docs/design.md.sample",
  },
];

const GITHUB_RAW_BASE_URL =
  "https://raw.githubusercontent.com/K-shir0/docs-boilerplate-llm/main";
const TIMEOUT_MS = 30000;

function debug(message: string): void {
  if (DEBUG) {
    console.log(`[DEBUG] ${message}`);
  }
}

function getProjectRoot(): string {
  // Use the current working directory where the command was executed
  // This ensures files are written to the user's project, not bunx's temp directory
  const projectRoot = process.cwd();
  debug(`Current working directory: ${projectRoot}`);
  return projectRoot;
}

async function fetchFile(filePath: string): Promise<string> {
  const url = `${GITHUB_RAW_BASE_URL}/${filePath}`;
  debug(`Fetching from: ${url}`);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`File not found: ${filePath}`);
      } else if (response.status === 403) {
        throw new Error(
          "GitHub API rate limit exceeded. Please try again later."
        );
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    const content = await response.text();
    debug(`Fetched ${content.length} bytes`);
    return content;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        throw new Error(`Request timed out after ${TIMEOUT_MS / 1000} seconds`);
      }
      throw error;
    }
    throw new Error("Unknown error occurred while fetching file");
  }
}

async function updateFile(
  projectRoot: string,
  destination: string,
  content: string
): Promise<void> {
  const targetPath = join(projectRoot, destination);
  debug(`Target path: ${targetPath}`);

  // Check if file exists and get current content for debug
  const file = Bun.file(targetPath);
  const exists = await file.exists();
  debug(`File exists: ${exists}`);

  if (exists) {
    const existingContent = await file.text();
    debug(`Existing content: ${existingContent.length} bytes`);
    debug(`New content: ${content.length} bytes`);
    debug(`Content differs: ${existingContent !== content}`);
  } else {
    debug(`New file will be created`);
  }

  // Write the file
  await Bun.write(targetPath, content);

  // Verify write
  const verifyFile = Bun.file(targetPath);
  const verifyContent = await verifyFile.text();
  debug(`Write verification: ${verifyContent.length} bytes written`);
  debug(
    `Write verification match: ${verifyContent === content ? "SUCCESS" : "FAILED"}`
  );
}

async function main(): Promise<void> {
  const projectRoot = getProjectRoot();
  debug(`Project root: ${projectRoot}`);

  console.log("Starting GitHub template synchronization...\n");

  const results: { file: string; success: boolean; error?: string }[] = [];

  for (const fileConfig of FILES_TO_SYNC) {
    try {
      console.log(`Updating ${fileConfig.destination}...`);

      const content = await fetchFile(fileConfig.path);
      await updateFile(projectRoot, fileConfig.destination, content);

      results.push({ file: fileConfig.destination, success: true });
      console.log(`✓ Updated ${fileConfig.destination}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      results.push({
        file: fileConfig.destination,
        success: false,
        error: errorMessage,
      });
      console.error(`✗ Failed to update ${fileConfig.destination}: ${errorMessage}`);
    }
  }

  // Summary
  console.log("\n" + "=".repeat(50));
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log(`Summary: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    console.log("\nFailed files:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  - ${r.file}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log("\nAll files updated successfully!");
    process.exit(0);
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
