#!/usr/bin/env python3
"""Open a Markdown file or folder in Shed's Preview, or a repository's changes
in Shed's Changes.

A running Shed takes the request over its control socket and comes to the
front. When no Shed runs, this starts one, detached from the caller.
"""

import argparse
import os
import subprocess
import sys
import tempfile
import time

CHECKOUT_BINARY = os.path.expanduser(
    "~/src/github.com/liuchengxu/shed/target/release/shed"
)
SCOPES = ("committed", "with-uncommitted", "uncommitted")
# `shed state --json` exits with this code when no Shed runs.
NO_SHED_EXIT_CODE = 10
# The client waits up to 10 s for a starting Shed and 10 s for its answer.
HANDOFF_TIMEOUT_SECONDS = 30
# Shed refuses a bad command line at once; a window that opened keeps running.
STARTUP_WAIT_SECONDS = 1.5
LOG_PATH = os.path.join(tempfile.gettempdir(), "shed-open.log")


def shed_binary():
    # Not a PATH lookup: `shed` is also the name of an unrelated hex editor.
    for candidate in (os.environ.get("SHED_BIN"), CHECKOUT_BINARY):
        if candidate and os.access(candidate, os.X_OK):
            return candidate
    sys.exit(
        "Cannot find Shed. Build it with `cargo build --release -p shed` in "
        "~/src/github.com/liuchengxu/shed, or set SHED_BIN."
    )


def git(directory, *arguments):
    result = subprocess.run(
        ["git", "-C", directory, *arguments], capture_output=True, text=True
    )
    if result.returncode != 0:
        return None
    return result.stdout.strip()


def default_base(directory):
    """The remote's default branch comes first, because a worktree usually
    starts from it and a local branch of the same name can lag behind."""
    remote_head = git(
        directory, "symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"
    )
    if remote_head:
        return remote_head
    for ref in ("origin/main", "origin/master", "main", "master"):
        if git(directory, "rev-parse", "--verify", "--quiet", ref + "^{commit}"):
            return ref
    sys.exit("Cannot find a default branch in " + directory + ". Pass --base <ref>.")


def parse_arguments():
    parser = argparse.ArgumentParser(
        prog="shed-open.py",
        description="Open a Markdown file or folder in Shed's Preview, or, with "
        "--diff, a repository's changes in Shed's Changes.",
    )
    parser.add_argument(
        "--diff",
        action="store_true",
        help="open the repository at PATH (default: the current folder) in Changes",
    )
    parser.add_argument(
        "--base",
        help="with --diff: the ref to compare against (default: the remote's "
        "default branch, else main or master)",
    )
    parser.add_argument(
        "--scope",
        choices=SCOPES,
        help="with --diff: what the comparison reads (default: with-uncommitted)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="print the Shed command line and start nothing",
    )
    parser.add_argument("path", nargs="?")
    arguments = parser.parse_args()
    if not arguments.diff and (arguments.base or arguments.scope):
        parser.error("--base and --scope need --diff")
    if not arguments.diff and not arguments.path:
        parser.error("a Markdown file or folder is needed, or --diff")
    return arguments


def command_line(arguments, binary):
    path = os.path.abspath(os.path.expanduser(arguments.path or "."))
    if not os.path.exists(path):
        sys.exit("No such file or folder: " + path)
    # The user asked to see the result, so the window comes to the front.
    if not arguments.diff:
        return [binary, "--focus", "--", path], "Preview: " + path
    directory = path if os.path.isdir(path) else os.path.dirname(path)
    root = git(directory, "rev-parse", "--show-toplevel")
    if root is None:
        sys.exit("Not in a Git repository: " + directory)
    base = arguments.base or default_base(root)
    scope = arguments.scope or "with-uncommitted"
    command = [
        binary, "diff", "--repo", root, "--base", base, "--scope", scope, "--focus",
    ]
    return command, "Changes: " + root + ", " + base + " to HEAD, " + scope


def shed_is_running(binary):
    result = subprocess.run(
        [binary, "state", "--json"],
        stdin=subprocess.DEVNULL,
        capture_output=True,
        timeout=HANDOFF_TIMEOUT_SECONDS,
    )
    return result.returncode != NO_SHED_EXIT_CODE


def hand_off(command):
    """The client exits once the running Shed has answered."""
    result = subprocess.run(
        command,
        stdin=subprocess.DEVNULL,
        capture_output=True,
        text=True,
        timeout=HANDOFF_TIMEOUT_SECONDS,
    )
    if result.returncode != 0:
        output = (result.stderr or result.stdout).strip()
        sys.exit("Shed exited with " + str(result.returncode) + ":\n" + output)


def launch(command):
    log_start = os.path.getsize(LOG_PATH) if os.path.exists(LOG_PATH) else 0
    with open(LOG_PATH, "ab") as log:
        process = subprocess.Popen(
            command,
            stdin=subprocess.DEVNULL,
            stdout=log,
            stderr=log,
            start_new_session=True,
        )
    deadline = time.monotonic() + STARTUP_WAIT_SECONDS
    while time.monotonic() < deadline and process.poll() is None:
        time.sleep(0.1)
    exit_code = process.poll()
    if exit_code is not None and exit_code != 0:
        with open(LOG_PATH, "rb") as log:
            log.seek(log_start)
            output = log.read().decode(errors="replace").strip()
        sys.exit("Shed exited with " + str(exit_code) + ":\n" + output)
    return process.pid


def main():
    arguments = parse_arguments()
    binary = shed_binary()
    command, description = command_line(arguments, binary)
    if arguments.dry_run:
        print(" ".join(command))
        return
    if shed_is_running(binary):
        hand_off(command)
        print("Opened in the running Shed. " + description)
        return
    pid = launch(command)
    print("Opened in a new Shed (pid " + str(pid) + "). " + description)


if __name__ == "__main__":
    main()
