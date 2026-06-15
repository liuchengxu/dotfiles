-- Flash a glowing line across the top edge of the monitor that just received
-- focus, with a soft glow falling off downward. Only fires when focus crosses
-- to a different screen, then pulses and fades.

local COLOR = { red = 1.0, green = 0.15, blue = 0.15, alpha = 1.0 }
local LINE_THICKNESS = 3 -- top line weight
local FADE_FRACTION = 0.3 -- portion of each side that fades to transparent
local SEGMENTS = 100 -- horizontal resolution of the side fades

local FADE_IN = 0.10 -- seconds to ramp up
local PULSE_DUR = 0.28 -- seconds for the attention pulse
local PULSE_MIN = 0.5 -- dip depth of the pulse
local HOLD = 0.55 -- seconds at full strength
local FADE_OUT = 0.5 -- seconds to ease out
local FPS = 60

local canvas = nil
local anim = nil
local lastScreenId = nil

local function clear()
    if anim then
        anim:stop()
        anim = nil
    end
    if canvas then
        canvas:delete()
        canvas = nil
    end
end

-- Alpha envelope over time: ramp in, one attention pulse, hold, ease out.
local function envelope(t)
    if t < FADE_IN then
        return t / FADE_IN
    end
    t = t - FADE_IN
    if t < PULSE_DUR then
        return 1.0 - (1.0 - PULSE_MIN) * math.sin(math.pi * (t / PULSE_DUR))
    end
    t = t - PULSE_DUR
    if t < HOLD then
        return 1.0
    end
    t = t - HOLD
    if t < FADE_OUT then
        local p = t / FADE_OUT
        return (1.0 - p) * (1.0 - p)
    end
    return -1.0 -- done
end

-- A top-edge line at full strength across the middle, fading to transparent at
-- the left and right ends. Built as thin segments since a single canvas
-- gradient supports only two color stops.
local function elements(w)
    local seg = w / SEGMENTS
    local els = {}
    for i = 0, SEGMENTS - 1 do
        local u = (i + 0.5) / SEGMENTS -- normalized x of this segment
        local a = math.min(u, 1 - u) / FADE_FRACTION -- 0 at edges, ramps to 1
        if a > 1 then
            a = 1
        end
        els[#els + 1] = {
            type = "rectangle",
            action = "fill",
            fillColor = { red = COLOR.red, green = COLOR.green, blue = COLOR.blue, alpha = COLOR.alpha * a },
            frame = { x = i * seg, y = 0, w = seg + 1, h = LINE_THICKNESS }, -- +1 avoids hairline gaps
        }
    end
    return els
end

local function flash(screen)
    clear()
    local f = screen:fullFrame()
    canvas = hs.canvas.new(f)
    canvas:appendElements(elements(f.w))
    canvas:level(hs.canvas.windowLevels.overlay)
    canvas:alpha(0)
    canvas:show()

    local start = hs.timer.secondsSinceEpoch()
    anim = hs.timer.doEvery(1.0 / FPS, function()
        local a = envelope(hs.timer.secondsSinceEpoch() - start)
        if a < 0 or not canvas then
            clear()
        else
            canvas:alpha(a)
        end
    end)
end

local function onFocus(win)
    local screen = win and win:screen()
    if not screen then
        return
    end
    if #hs.screen.allScreens() < 2 then
        return -- single display: there is no "other monitor" to point to
    end
    local id = screen:id()
    if id == lastScreenId then
        return -- same monitor: nothing to announce
    end
    lastScreenId = id
    flash(screen)
end

local filter = hs.window.filter.new()
filter:subscribe(hs.window.filter.windowFocused, function(win)
    onFocus(win)
end)

-- Seed the current screen so the first cross-monitor switch flashes correctly.
local focused = hs.window.focusedWindow()
if focused and focused:screen() then
    lastScreenId = focused:screen():id()
end
