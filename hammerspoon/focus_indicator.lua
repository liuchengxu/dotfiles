-- Flash a viewfinder-style indicator on the monitor that just received focus:
-- bold L-shaped corner brackets with a glow halo over a full edge outline.
-- Only fires when focus crosses to a different screen, then pulses and fades.

local COLOR = { red = 1.0, green = 0.15, blue = 0.15, alpha = 1.0 }
local BRACKET_THICKNESS = 14 -- corner bracket line weight
local BRACKET_LENGTH = 120 -- length of each bracket arm
local EDGE_THICKNESS = 5 -- full-border weight
local EDGE_ALPHA = 0.45 -- full-border opacity (relative to COLOR)
local GLOW_SPREAD = 12 -- soft halo width around lines
local GLOW_ALPHA = 0.4 -- halo opacity
local CORNER_RADIUS = 16

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

local function tint(alpha)
    local c = {}
    for k, v in pairs(COLOR) do
        c[k] = v
    end
    c.alpha = alpha
    return c
end

local function segments(coords, color, width)
    return {
        type = "segments",
        action = "stroke",
        strokeColor = color,
        strokeWidth = width,
        strokeCapStyle = "round",
        strokeJoinStyle = "round",
        coordinates = coords,
    }
end

local function edge(color, width, w, h)
    return {
        type = "rectangle",
        action = "stroke",
        strokeColor = color,
        strokeWidth = width,
        roundedRectRadii = { xRadius = CORNER_RADIUS, yRadius = CORNER_RADIUS },
        frame = { x = 0, y = 0, w = w, h = h },
    }
end

local function elements(w, h)
    local m = BRACKET_THICKNESS / 2 + GLOW_SPREAD -- inset so glow stays on-screen
    local len = BRACKET_LENGTH
    local corners = {
        { { x = m, y = m + len }, { x = m, y = m }, { x = m + len, y = m } },
        { { x = w - m - len, y = m }, { x = w - m, y = m }, { x = w - m, y = m + len } },
        { { x = w - m, y = h - m - len }, { x = w - m, y = h - m }, { x = w - m - len, y = h - m } },
        { { x = m + len, y = h - m }, { x = m, y = h - m }, { x = m, y = h - m - len } },
    }
    local els = {
        edge(tint(EDGE_ALPHA * 0.5), (EDGE_THICKNESS + GLOW_SPREAD) * 2, w, h), -- edge glow
        edge(tint(EDGE_ALPHA), EDGE_THICKNESS * 2, w, h), -- edge line
    }
    for _, c in ipairs(corners) do -- bracket glows first, sharp lines on top
        els[#els + 1] = segments(c, tint(GLOW_ALPHA), BRACKET_THICKNESS + GLOW_SPREAD * 2)
    end
    for _, c in ipairs(corners) do
        els[#els + 1] = segments(c, COLOR, BRACKET_THICKNESS)
    end
    return els
end

local function flash(screen)
    clear()
    local f = screen:fullFrame()
    canvas = hs.canvas.new(f)
    canvas:appendElements(elements(f.w, f.h))
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
