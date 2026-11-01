#!/usr/bin/env python3
"""Open a file or branch diff in the Lore desktop app via its Unix domain socket JSON-RPC."""

import json
import os
import platform
import socket
import subprocess
import sys


def try_connect(sock_path):
    """Try to connect to a socket, return the socket or None."""
    try:
        s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        s.connect(sock_path)
        return s
    except (FileNotFoundError, ConnectionRefusedError, OSError):
        return None


def main():
    if len(sys.argv) < 2:
        sys.exit("Usage: lore-open.py [--diff] <path>")

    args = sys.argv[1:]

    if "--diff" in args:
        args.remove("--diff")
        method = "open_branch_diff"
    else:
        method = "open_file"

    if not args:
        sys.exit("Usage: lore-open.py [--diff] <path>")

    xdg = os.environ.get("XDG_RUNTIME_DIR")
    uid = str(os.getuid())

    # Try lore-next (new React app) first, then fall back to lore (old desktop app)
    candidates = []
    if xdg:
        candidates.append(xdg + "/lore-next/rpc.sock")
        candidates.append(xdg + "/lore/rpc.sock")
    candidates.append("/tmp/lore-next-" + uid + "/rpc.sock")
    candidates.append("/tmp/lore-" + uid + "/rpc.sock")

    s = None
    for sock_path in candidates:
        s = try_connect(sock_path)
        if s:
            break

    if not s:
        sys.exit("Could not connect to Lore. Is the app running?")

    path = os.path.abspath(os.path.expanduser(args[0]))
    request = json.dumps({
        "jsonrpc": "2.0",
        "id": 1,
        "method": method,
        "params": {"path": path},
    }) + "\n"
    s.sendall(request.encode())

    resp = b""
    while True:
        d = s.recv(4096)
        if not d:
            break
        resp += d
    s.close()

    r = json.loads(resp)
    if "error" in r and r["error"]:
        sys.exit("Error: " + r["error"].get("message", "unknown"))

    result = r.get("result", {})
    if method == "open_branch_diff":
        print("Opened branch diff in Lore:", result.get("git_root", "ok"))
    else:
        print("Opened in Lore:", result.get("file_path", "ok"))

    if platform.system() != "Darwin":
        try:
            out = subprocess.check_output(["wmctrl", "-l"], text=True)
            for line in out.splitlines():
                if "Lore" in line:
                    wid = line.split()[0]
                    subprocess.run(["wmctrl", "-i", "-a", wid])
                    break
        except FileNotFoundError:
            pass
    else:
        subprocess.run(
            ["open", "-a", "Lore"],
            stderr=subprocess.DEVNULL,
        )


if __name__ == "__main__":
    main()
