## Machines

| Machine | User | Home | Reach it with | Has |
|---|---|---|---|---|
| studio | `xlc` | `/Users/xlc` | `ssh mac-studio` | Clash Verge proxy |
| macbook | `xuliucheng` | `/Users/xuliucheng` | `ssh macbook` | Clash Verge proxy, the signing YubiKey |

The Clash Verge proxy listens on `127.0.0.1:7890` (HTTP and SOCKS5). When a
direct connection to GitHub or another external service fails, route it
through the proxy.
