local hotkey = require 'hs.hotkey'
local window = require 'hs.window'
local application = require 'hs.application'

local key2app = {
    c = 'Google Chrome',
    d = 'EuDic',
    e = 'Emacs',
    f = 'Firefox',
    g = 'Telegram',
    i = 'iTerm',
    m = 'MacDown',
    p = 'Preview',
    t = 'Terminal',
    v = 'MacVim',
    w = 'WeChat',
}

-- Toggle an application between being the frontmost app, and being hidden
local function toggle_application(_app)
    -- finds a running application
    local app = application.find(_app)

    if not app then
        -- if app is not running, launch it
        application.launchOrFocus(_app)
        return
    end

    -- application running, toggle hide/unhide
    local mainwin = app:mainWindow()
    if mainwin then
        if true == app:isFrontmost() then
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
        else
            -- nothing to do
        end
    end
end

for key, app in pairs(key2app) do
    hotkey.bind(hyper, key, function()
        toggle_application(app)
    end)
end
