#!/usr/bin/env fontforge -script
import fontforge
import os

import sys

if sys.platform == "darwin":
    FONT_DIR = os.path.expanduser("~/Library/Fonts")
else:
    FONT_DIR = os.path.expanduser("~/.local/share/fonts")

# Allow override via environment variable
FONT_DIR = os.environ.get("FONT_DIR", FONT_DIR)
THIN_REGULAR = -40  # thinning for Regular/Italic
THIN_BOLD = -10     # gentler thinning for Bold variants to preserve weight contrast

variants = [
    ("FantasqueSansMNerdFontMono-Regular.ttf", THIN_REGULAR),
    ("FantasqueSansMNerdFontMono-Bold.ttf", THIN_BOLD),
    ("FantasqueSansMNerdFontMono-Italic.ttf", THIN_REGULAR),
    ("FantasqueSansMNerdFontMono-BoldItalic.ttf", THIN_BOLD),
]

for variant, thin_amount in variants:
    src = os.path.join(FONT_DIR, variant)
    if not os.path.exists(src):
        print("Skipping (not found): " + src)
        continue

    print("Processing: " + variant + " (amount: " + str(thin_amount) + ")")
    font = fontforge.open(src)

    for glyph in font.glyphs():
        if glyph.isWorthOutputting():
            glyph.changeWeight(thin_amount, "auto", 0, 0, "auto")
            glyph.autoHint()

    # Rename the font family so it installs alongside the original
    font.familyname = "FantasqueSansM Nerd Font Mono Thin"
    font.fontname = font.fontname.replace("FantasqueSansMNFM", "FantasqueSansMNFMThin")
    font.fullname = font.fullname.replace("FantasqueSansM Nerd Font Mono", "FantasqueSansM Nerd Font Mono Thin")

    # Update name table entries for OS recognition
    for record in font.sfnt_names:
        # record is (lang, strid, string)
        pass  # We'll set them explicitly below

    font.appendSFNTName("English (US)", "Family", "FantasqueSansM Nerd Font Mono Thin")
    font.appendSFNTName("English (US)", "Preferred Family", "FantasqueSansM Nerd Font Mono Thin")

    out_name = variant.replace("FantasqueSansMNerdFontMono", "FantasqueSansMNerdFontMonoThin")
    out_path = os.path.join(FONT_DIR, out_name)
    font.generate(out_path)
    print("Generated: " + out_path)
    font.close()

print("Done!")
