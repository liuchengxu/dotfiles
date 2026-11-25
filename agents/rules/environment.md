## Machines

| Machine | User | Home | Reach it with | Has |
|---|---|---|---|---|
| studio | `xlc` | `/Users/xlc` | `ssh mac-studio` | Clash Verge proxy; local signing when the YubiKey is plugged in |
| macbook | `xuliucheng` | `/Users/xuliucheng` | `ssh macbook` | Clash Verge proxy |
| work-macbook | `xlc` | `/Users/xlc` | Tailscale `100.103.167.70`, inbound SSH blocked | Company laptop; local signing when the YubiKey is plugged in |

The Clash Verge proxy listens on `127.0.0.1:7890` (HTTP and SOCKS5). When a
direct connection to GitHub or another external service fails, route it
through the proxy.
