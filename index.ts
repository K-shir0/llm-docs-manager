#!/usr/bin/env bun

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import packageJson from "./package.json";

const DEBUG = process.env.DEBUG === "1";
const VERSION = packageJson.version;

interface FileConfig {
	path: string;
	destination: string;
	isDirectory?: boolean;
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
	{
		path: ".claude/skills",
		destination: ".claude/skills",
		isDirectory: true,
	},
	{
		path: ".claude/agents",
		destination: ".claude/agents",
		isDirectory: true,
	},
	{
		path: ".claude/commands",
		destination: ".claude/commands",
		isDirectory: true,
	},
];

const GITHUB_RAW_BASE_URL =
	"https://raw.githubusercontent.com/K-shir0/docs-boilerplate-llm/main";
const GITHUB_API_BASE_URL =
	"https://api.github.com/repos/K-shir0/docs-boilerplate-llm/contents";
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
					"GitHub API rate limit exceeded. Please try again later.",
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
	content: string,
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
		`Write verification match: ${verifyContent === content ? "SUCCESS" : "FAILED"}`,
	);
}

interface GitHubContentItem {
	name: string;
	path: string;
	type: "file" | "dir";
	download_url: string | null;
}

async function fetchDirectoryTree(dirPath: string): Promise<string[]> {
	const url = `${GITHUB_API_BASE_URL}/${dirPath}`;
	debug(`Fetching directory tree from: ${url}`);

	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

		const response = await fetch(url, {
			signal: controller.signal,
			headers: {
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "docs-manager",
			},
		});

		clearTimeout(timeoutId);

		if (!response.ok) {
			if (response.status === 404) {
				throw new Error(`Directory not found: ${dirPath}`);
			} else if (response.status === 403) {
				throw new Error(
					"GitHub API rate limit exceeded. Please try again later.",
				);
			} else {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
		}

		const items: GitHubContentItem[] = await response.json();
		const filePaths: string[] = [];

		for (const item of items) {
			if (item.type === "file") {
				filePaths.push(item.path);
			} else if (item.type === "dir") {
				// Recursively process subdirectories
				const subFiles = await fetchDirectoryTree(item.path);
				filePaths.push(...subFiles);
			}
		}

		debug(
			`Found ${filePaths.length} file(s) in ${dirPath}: ${JSON.stringify(filePaths)}`,
		);

		return filePaths;
	} catch (error) {
		if (error instanceof Error) {
			if (error.name === "AbortError") {
				throw new Error(
					`Request timed out while fetching directory tree for ${dirPath}`,
				);
			}
			throw error;
		}
		throw new Error("Unknown error occurred while fetching directory tree");
	}
}

async function ensureDirectoryExists(filePath: string): Promise<void> {
	const dir = dirname(filePath);

	try {
		await mkdir(dir, { recursive: true });
		debug(`Ensured directory exists: ${dir}`);
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to create directory ${dir}: ${error.message}`);
		}
		throw new Error(`Failed to create directory ${dir}`);
	}
}

async function syncDirectory(
	projectRoot: string,
	dirConfig: FileConfig,
): Promise<void> {
	console.log(`Syncing directory ${dirConfig.destination}...`);

	// Fetch directory tree
	const filePaths = await fetchDirectoryTree(dirConfig.path);

	if (filePaths.length === 0) {
		console.log(`Warning: Directory ${dirConfig.path} is empty. Skipping.`);
		return;
	}

	console.log(`Found ${filePaths.length} file(s) in ${dirConfig.destination}`);

	// Sync each file
	for (const filePath of filePaths) {
		debug(`Syncing file: ${filePath}`);

		const content = await fetchFile(filePath);

		// Calculate relative path from source repository
		const relativePath = filePath.replace(
			dirConfig.path,
			dirConfig.destination,
		);

		// Ensure parent directory exists
		const targetPath = join(projectRoot, relativePath);
		await ensureDirectoryExists(targetPath);

		// Update file
		await updateFile(projectRoot, relativePath, content);

		console.log(`  ✓ Synced ${relativePath}`);
	}
}

async function main(): Promise<void> {
	const projectRoot = getProjectRoot();
	debug(`Version: ${VERSION}`);
	debug(`Project root: ${projectRoot}`);

	console.log("Starting GitHub template synchronization...\n");

	const results: { file: string; success: boolean; error?: string }[] = [];

	for (const fileConfig of FILES_TO_SYNC) {
		try {
			if (fileConfig.isDirectory) {
				// Directory synchronization
				await syncDirectory(projectRoot, fileConfig);
				results.push({ file: fileConfig.destination, success: true });
				console.log(`✓ Synced directory ${fileConfig.destination}`);
			} else {
				// File synchronization (existing logic)
				console.log(`Updating ${fileConfig.destination}...`);

				const content = await fetchFile(fileConfig.path);
				await updateFile(projectRoot, fileConfig.destination, content);

				results.push({ file: fileConfig.destination, success: true });
				console.log(`✓ Updated ${fileConfig.destination}`);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			results.push({
				file: fileConfig.destination,
				success: false,
				error: errorMessage,
			});
			console.error(
				`✗ Failed to update ${fileConfig.destination}: ${errorMessage}`,
			);
		}
	}

	// Summary
	console.log(`\n${"=".repeat(50)}`);
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
