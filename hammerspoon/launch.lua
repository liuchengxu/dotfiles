local hotkey = require 'hs.hotkey'
local window = require 'hs.window'
local application = require 'hs.application'

-- https://emacs-china.org/t/topic/3688/5
-- https://github.com/manateelazycat/hammerspoon-config/blob/master/init.lua

local key2app = {
    c = 'Google Chrome',
    d = 'EuDic',
    e = 'Emacs',
    f = 'Firefox',
    g = 'Telegram',
    i = 'iTerm',
    m = 'MacDown',
    p = 'Preview',
    s = 'NeteaseMusic',
    t = 'Terminal',
    v = 'MacVim',
    w = '/Applications/WeChat.app',
}

-- Toggle an application between being the frontmost app, and being hidden
local function toggle_application(_app)
    -- finds a running application
    local app = application.find(_app)

    -- if app is not running, launch it
    if not app then
        application.launchOrFocus(_app)
        return
    end

    -- if app is running, toggle hide/unhide
    local mainwin = app:mainWindow()
    if mainwin then
        if app:isFrontmost() then
            mainwin:application():hide()
        else
            mainwin:application():activate(true)
            mainwin:application():unhide()
            mainwin:focus()
        end
    else
        -- no windows, maybe hide
        if true == app:hide() then
            -- focus app
            application.launchOrFocus(_app)
        end
    end
end

for key, app in pairs(key2app) do
    hotkey.bind(hyper, key, function()
        toggle_application(app)
    end)
end
