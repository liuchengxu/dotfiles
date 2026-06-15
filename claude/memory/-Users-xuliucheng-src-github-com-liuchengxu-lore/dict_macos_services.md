---
name: dict-macos-services
description: "How to make the lore-dict \"Look Up in Lore Dict\" macOS Service appear; macOS 26 requires manual enable"
metadata: 
  node_type: memory
  type: project
  originSessionId: b47ebaee-d3cd-43c2-9caf-e23320b59438
---

For the `apps/dict` macOS Service ("Look Up in Lore Dict") to appear in the
Services menu, two conditions must hold:

1. **Valid code signature.** The installed `.app` must pass `codesign --verify`.
   A `tauri build` with no signing identity leaves only the linker's ad-hoc
   Mach-O sig with no `_CodeSignature` seal, which fails verification — pbs and
   Gatekeeper then reject the bundle. `apps/dict/scripts/install-macos.sh`
   ad-hoc re-signs (`codesign --force --deep --sign -`) after copying to fix this.

2. **Manual enable in System Settings (the decisive step on macOS 26).** New
   third-party Services are disabled by default and Apple gates enabling them
   behind explicit user consent. The script's `defaults write pbs
   NSServicesStatus` auto-enable does NOT take effect on macOS 26 — the user
   must tick the box at System Settings → Keyboard → Keyboard Shortcuts… →
   Services → Text → "Look Up in Lore Dict". This persists once done.

Debugging note: when the service is registered (`pbs -dump` shows it) and
enabled per `defaults read pbs NSServicesStatus` yet still absent from the
menu, suspect the Settings consent gate first on modern macOS — it cannot be
flipped by script. Verify via the System Settings Services list, which is the
authoritative registration view (bypasses per-app menu caching and the
text-selection context filter).
