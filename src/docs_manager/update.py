"""GitHub template file synchronization module."""

import sys
from pathlib import Path
from typing import Tuple

import httpx


# GitHub repository configuration
GITHUB_REPO_OWNER = "K-shir0"
GITHUB_REPO_NAME = "docs-boilerplate-llm"
GITHUB_BRANCH = "main"
RAW_GITHUB_BASE_URL = f"https://raw.githubusercontent.com/{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}/{GITHUB_BRANCH}"

# Files to synchronize: (source_path, destination_path)
FILES_TO_SYNC = [
    ("CLAUDE.md", "CLAUDE.md"),
    ("docs/design.md.sample", "docs/design.md.sample"),
]

# HTTP request timeout in seconds
REQUEST_TIMEOUT = 30.0


def get_project_root() -> Path:
    """Get the project root directory.

    Returns:
        Path: The project root directory (parent of src/).
    """
    # This file is in src/docs_manager/update.py
    # Project root is 2 levels up
    return Path(__file__).parent.parent.parent


def fetch_file(file_path: str) -> Tuple[bool, str]:
    """Fetch a file from GitHub repository.

    Args:
        file_path: The file path in the repository.

    Returns:
        Tuple[bool, str]: (success, content or error_message)
    """
    url = f"{RAW_GITHUB_BASE_URL}/{file_path}"

    try:
        with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
            response = client.get(url)

            if response.status_code == 200:
                return True, response.text
            elif response.status_code == 404:
                return False, f"File not found: {file_path}"
            elif response.status_code == 403:
                return False, "GitHub API rate limit exceeded. Please try again later."
            else:
                return False, f"Failed to fetch file: HTTP {response.status_code}"

    except httpx.TimeoutException:
        return False, f"Request timed out after {REQUEST_TIMEOUT} seconds"
    except httpx.RequestError as e:
        return False, f"Network error: {e}"
    except Exception as e:
        return False, f"Unexpected error: {e}"


def update_file(dest_path: str, content: str) -> Tuple[bool, str]:
    """Write content to a file in the project.

    Args:
        dest_path: The destination file path relative to project root.
        content: The content to write.

    Returns:
        Tuple[bool, str]: (success, success_message or error_message)
    """
    try:
        project_root = get_project_root()
        file_path = project_root / dest_path

        # Create parent directory if it doesn't exist
        file_path.parent.mkdir(parents=True, exist_ok=True)

        # Write content
        file_path.write_text(content, encoding="utf-8")

        return True, f"Updated: {dest_path}"

    except PermissionError:
        return False, f"Permission denied: {dest_path}"
    except Exception as e:
        return False, f"Failed to write {dest_path}: {e}"


def main() -> int:
    """Main entry point for the template synchronization tool.

    Returns:
        int: Exit code (0 for success, 1 for failure).
    """
    print("GitHub Template Synchronization Tool")
    print(f"Repository: {GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}")
    print("-" * 50)

    success_count = 0
    failure_count = 0

    for source_path, dest_path in FILES_TO_SYNC:
        print(f"\nProcessing: {source_path}")

        # Fetch file from GitHub
        fetch_success, fetch_result = fetch_file(source_path)
        if not fetch_success:
            print(f"  ✗ Fetch failed: {fetch_result}")
            failure_count += 1
            continue

        # Update local file
        update_success, update_result = update_file(dest_path, fetch_result)
        if not update_success:
            print(f"  ✗ Update failed: {update_result}")
            failure_count += 1
            continue

        print(f"  ✓ {update_result}")
        success_count += 1

    # Print summary
    print("\n" + "=" * 50)
    print(f"Summary: {success_count} succeeded, {failure_count} failed")

    if failure_count > 0:
        print("\nSome files failed to update. Please check the errors above.")
        return 1

    print("\nAll files updated successfully!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
