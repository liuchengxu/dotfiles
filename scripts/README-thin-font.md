# thin_font.py

FontForge script that generates thinner variants of FantasqueSansM Nerd Font Mono.

## Prerequisites

- **macOS**: `brew install fontforge`
- **Ubuntu**: `sudo apt install fontforge`
- Source font files: [FantasqueSansMono Nerd Font](https://github.com/ryanoasis/nerd-fonts/releases) installed in the system font directory

## Usage

```bash
fontforge -script thin_font.py
```

This generates three font families with all four styles (Regular, Bold, Italic, BoldItalic):

| Font Family | Regular/Italic | Bold/BoldItalic |
|---|---|---|
| `FantasqueSansM Nerd Font Mono Thin20` | -20 | -10 |
| `FantasqueSansM Nerd Font Mono Thin30` | -30 | -10 |
| `FantasqueSansM Nerd Font Mono Thin40` | -40 | -10 |

Bold variants use a gentler thinning (-10) to preserve weight contrast.

## Font directory

- **macOS**: `~/Library/Fonts`
- **Linux**: `~/.local/share/fonts` (run `fc-cache -fv` after generating)
- Override with: `FONT_DIR=/path fontforge -script thin_font.py`

## Terminal config examples

**Ghostty**:
```
font-family = "FantasqueSansM Nerd Font Mono Thin30"
```

**Wezterm**:
```lua
font = wezterm.font_with_fallback({
    { family="FantasqueSansM Nerd Font Mono Thin30", weight="Regular" },
})
```

**Kitty**:
```
font_family FantasqueSansM Nerd Font Mono Thin30
```
