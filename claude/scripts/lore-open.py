#!/usr/bin/env python3
"""Open a file or branch diff in the Lore desktop app via its Unix domain socket JSON-RPC."""

import json
import os
import platform
import socket
import subprocess
import sys


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
    if xdg:
        sock_path = xdg + "/lore/rpc.sock"
    else:
        sock_path = "/tmp/lore-" + str(os.getuid()) + "/rpc.sock"

    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect(sock_path)

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
        out = subprocess.check_output(["wmctrl", "-l"], text=True)
        for line in out.splitlines():
            if "Lore" in line:
                wid = line.split()[0]
                subprocess.run(["wmctrl", "-i", "-a", wid])
                break
    else:
        subprocess.run(
            ["open", "-a", "Lore"],
            stderr=subprocess.DEVNULL,
        )


if __name__ == "__main__":
    main()
