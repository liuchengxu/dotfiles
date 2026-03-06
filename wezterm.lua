local wezterm = require 'wezterm';
local act = wezterm.action;

wezterm.on('format-tab-title', function(tab, tabs, panes, config, hover, max_width)
    local title = tab.tab_title
    if #title == 0 then
        title = tab.active_pane.title
    end
    if #title > 48 then
        title = string.sub(title, 1, 48) .. '…'
    end
    return (tab.tab_index + 1) .. ': ' .. title
end)

return {
    keys = {
        {
            key = 'E',
            mods = 'CTRL|SHIFT',
            action = act.PromptInputLine {
                description = 'Enter new name for tab',
                action = wezterm.action_callback(function(window, pane, line)
                    if line then
                        window:active_tab():set_title(line)
                    end
                end),
            },
        },
    },

    -- font = wezterm.font_with_fallback({
        -- { family = "Iosevka Fixed ss13", weight = "Regular" },
        -- "FuraCode Nerd Font"
    -- }),

    font = wezterm.font_with_fallback({
        -- { family="JetBrains Mono", weight="Light" },
        -- { family = "iA Writer Mono S", weight="Regular" },
        -- { family = "Ubuntu Mono", weight="Regular" },
        -- { family = "Cascadia Code", weight="DemiLight" },
        -- { family="PT Mono", weight="Regular" },
        -- { family="JuliaMono", weight="Regular" },
        -- { family="VictorMono Nerd Font Mono", weight="Regular" },
        { family="FantasqueSansM Nerd Font", weight="Regular" },
        -- { family="IosevkaInput", weight="Regular" },
        -- { family="FiraCode Nerd Font", weight="Regular" },
        -- { family="Monaspace Neon", weight="Regular" },
        -- { family="SauceCodePro Nerd Font", weight="Regular" },
        -- { family="Monaspace Xenon", weight="Regular" },
        -- { family="Red Hat Mono", weight="Regular" },
        -- "Symbols Nerd Font Mono",
        "FiraCode"
    }),

    warn_about_missing_glyphs = false,

    font_rules = {
        {
          italic = true,
          intensity = 'Normal',
          font = wezterm.font {
            family = 'Red Hat Mono',
            style = 'Italic',
          },
        },
    },

    window_frame = {
      -- The font used in the tab bar.
      -- Roboto Bold is the default; this font is bundled
      -- with wezterm.
      -- Whatever font is selected here, it will have the
      -- main font setting appended to it to pick up any
      -- fallback fonts you may have used there.
      font = wezterm.font({ family="Roboto", weight="Bold" }),

      -- The size of the font in the tab bar.
      -- Default to 10. on Windows but 12.0 on other systems
      font_size = 12.0,

      -- The overall background color of the tab bar when
      -- the window is focused
      active_titlebar_bg = "#333333",

      -- The overall background color of the tab bar when
      -- the window is not focused
      inactive_titlebar_bg = "#333333",
    },

    colors = {
        background = "#292b2e"
    }
}
