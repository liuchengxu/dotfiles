local hotkey = require 'hs.hotkey'
local window = require 'hs.window'
local application = require 'hs.application'

-- https://emacs-china.org/t/topic/3688/5
-- https://github.com/manateelazycat/hammerspoon-config/blob/master/init.lua

local key2app = {
    c = '/Applications/Google Chrome.app',
    d = '/Applications/Eudic.app',
    e = '/Applications/Eudic.app',
    f = '/Applications/Firefox.app',
    g = '/Applications/Telegram.app',
    i = '/Applications/iTerm.app',
    m = '/Applications/MacDown.app',
    p = '/Applications/Preview.app',
    s = '/Applications/NeteaseMusic.app',
    t = 'Terminal',
    v = 'MacVim',
    w = '/Applications/WeChat.app',
}

-- Toggle an application between being the frontmost app, and being hidden
local function toggle_application(_app)
    application.launchOrFocus(_app)
end

for key, app in pairs(key2app) do
    hotkey.bind(hyper, key, function()
        toggle_application(app)
    end)
end
