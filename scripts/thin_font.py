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

# Each profile: (suffix, regular_amount, bold_amount)
profiles = [
    ("Thin20", -20, -10),
    ("Thin40", -40, -10),
]

base_variants = [
    ("FantasqueSansMNerdFontMono-Regular.ttf", False),
    ("FantasqueSansMNerdFontMono-Bold.ttf", True),
    ("FantasqueSansMNerdFontMono-Italic.ttf", False),
    ("FantasqueSansMNerdFontMono-BoldItalic.ttf", True),
]

for suffix, regular_amount, bold_amount in profiles:
    family_name = "FantasqueSansM Nerd Font Mono " + suffix

    for variant, is_bold in base_variants:
        src = os.path.join(FONT_DIR, variant)
        if not os.path.exists(src):
            print("Skipping (not found): " + src)
            continue

        thin_amount = bold_amount if is_bold else regular_amount
        print("Processing: " + variant + " -> " + suffix + " (amount: " + str(thin_amount) + ")")
        font = fontforge.open(src)

        for glyph in font.glyphs():
            if glyph.isWorthOutputting():
                glyph.changeWeight(thin_amount, "auto", 0, 0, "auto")
                glyph.autoHint()

        font.familyname = family_name
        font.fontname = font.fontname.replace("FantasqueSansMNFM", "FantasqueSansMNFM" + suffix)
        font.fullname = font.fullname.replace("FantasqueSansM Nerd Font Mono", family_name)

        font.appendSFNTName("English (US)", "Family", family_name)
        font.appendSFNTName("English (US)", "Preferred Family", family_name)

        out_name = variant.replace("FantasqueSansMNerdFontMono", "FantasqueSansMNerdFontMono" + suffix)
        out_path = os.path.join(FONT_DIR, out_name)
        font.generate(out_path)
        print("Generated: " + out_path)
        font.close()

    print("Finished profile: " + suffix + " -> font family: " + family_name)
    print("")

print("Done! Available font families:")
for suffix, _, _ in profiles:
    print("  - FantasqueSansM Nerd Font Mono " + suffix)
