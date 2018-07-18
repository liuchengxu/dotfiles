local grid = require 'hs.grid'
local hints = require 'hs.hints'
local alert = require 'hs.alert'
local hotkey = require 'hs.hotkey'
local window = require 'hs.window'
local layout = require 'hs.layout'

-- h ==> move to left half of the screen
-- l ==> move to right half of the screen
-- j ==> move to down half of the screen
-- k ==> move to up half of the screen
local key2action = {
    h = function() window.focusedWindow():left() end,
    j = function() window.focusedWindow():down() end,
    k = function() window.focusedWindow():up() end,
    l = function() window.focusedWindow():right() end,
    n = function() window.focusedWindow():nextScreen() end,
}

for key, action in pairs(key2action) do
    hotkey.bind(hyper, key, action)
end

-- Hotkeys to interact with the window grid
hotkey.bind(hyper, ',', grid.show)
hotkey.bind(hyper, 'Left', grid.pushWindowLeft)
hotkey.bind(hyper, 'Right', grid.pushWindowRight)
hotkey.bind(hyper, 'Up', grid.pushWindowUp)
hotkey.bind(hyper, 'Down', grid.pushWindowDown)

-- Hyper / to show window hints
hotkey.bind(hyper, '/', function()
    hints.windowHints()
end)

switcher = window.switcher.new(
   window.filter.new()
      :setAppFilter('Emacs', {allowRoles = '*', allowTitles = 1}), -- make emacs window show in switcher list
   {
      size = 600,
      showTitles = true,        -- don't show window title
      thumbnailSize = 400,      -- window thumbnail size
      showSelectedTitle = true,
      showSelectedThumbnail = true,
      -- backgroundColor = {0, 0, 0, 0.8}, -- background color
      -- highlightColor = {0.3, 0.3, 0.3, 0.8}, -- selected color
   }
)

hotkey.bind("alt", "tab", function() switcher:next() end)
hotkey.bind("alt-shift", "tab", function() switcher:previous() end)

window.animationDuration = 0

-- hotkey.bind(hyper, 'h', function()
    -- window.focusedWindow():moveToUnit(layout.left50)
-- end)

-- hotkey.bind(hyper, 'l', function()
    -- window.focusedWindow():moveToUnit(layout.right50)
-- end)

-- +-----------------+
-- |        |        |
-- |  HERE  |        |
-- |        |        |
-- +-----------------+
-- Usage: hs.window.focusedWindow():left()
function hs.window.left(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:frame()

  f.x = max.x
  f.y = max.y
  f.w = max.w / 2
  f.h = max.h
  win:setFrame(f)
end

-- +-----------------+
-- |        |        |
-- |        |  HERE  |
-- |        |        |
-- +-----------------+
function hs.window.right(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:frame()

  f.x = max.x + (max.w / 2)
  f.y = max.y
  f.w = max.w / 2
  f.h = max.h
  win:setFrame(f)
end

-- +-----------------+
-- |      HERE       |
-- +-----------------+
-- |                 |
-- +-----------------+
function hs.window.up(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:frame()

  f.x = max.x
  f.w = max.w
  f.y = max.y
  f.h = max.h / 2
  win:setFrame(f)
end

-- +-----------------+
-- |                 |
-- +-----------------+
-- |      HERE       |
-- +-----------------+
function hs.window.down(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:frame()

  f.x = max.x
  f.w = max.w
  f.y = max.y + (max.h / 2)
  f.h = max.h / 2
  win:setFrame(f)
end

-- +-----------------+
-- |  HERE  |        |
-- +--------+        |
-- |                 |
-- +-----------------+
function hs.window.upLeft(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:fullFrame()

  f.x = 0
  f.y = 0
  f.w = max.w/2
  f.h = max.h/2
  win:setFrame(f)
end

-- +-----------------+
-- |                 |
-- +--------+        |
-- |  HERE  |        |
-- +-----------------+
function hs.window.downLeft(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:fullFrame()

  f.x = 0
  f.y = max.h/2
  f.w = max.w/2
  f.h = max.h/2
  win:setFrame(f)
end

-- +-----------------+
-- |                 |
-- |        +--------|
-- |        |  HERE  |
-- +-----------------+
function hs.window.downRight(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:fullFrame()

  f.x = max.w/2
  f.y = max.h/2
  f.w = max.w/2
  f.h = max.h/2

  win:setFrame(f)
end

-- +-----------------+
-- |        |  HERE  |
-- |        +--------|
-- |                 |
-- +-----------------+
function hs.window.upRight(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:fullFrame()

  f.x = max.w/2
  f.y = 0
  f.w = max.w/2
  f.h = max.h/2
  win:setFrame(f)
end

-- +--------------+
-- |  |        |  |
-- |  |  HERE  |  |
-- |  |        |  |
-- +---------------+
function hs.window.centerWithFullHeight(win)
  local f = win:frame()
  local screen = win:screen()
  local max = screen:fullFrame()

  f.x = max.w * 1/5
  f.w = max.w * 3/5
  f.y = max.y
  f.h = max.h
  win:setFrame(f)
end

function hs.window.moveLeft(win)
  local f = win:frame()

  f.x = f.x-80
  win:setFrame(f)
end
function hs.window.moveRight(win)
  local f = win:frame()

  f.x = f.x+80
  win:setFrame(f)
end
function hs.window.moveUp(win)
  local f = win:frame()

  f.y = f.y-60
  win:setFrame(f)
end
function hs.window.moveDown(win)
  local f = win:frame()

  f.y = f.y+60
  win:setFrame(f)
end

function hs.window.nextScreen(win)
  local currentScreen = win:screen()
  local allScreens = hs.screen.allScreens()
  currentScreenIndex = hs.fnutils.indexOf(allScreens, currentScreen)
  nextScreenIndex = currentScreenIndex + 1

  if allScreens[nextScreenIndex] then
    win:moveToScreen(allScreens[nextScreenIndex])
  else
    win:moveToScreen(allScreens[1])
  end
end

function winIncrease()
   local win = hs.window.focusedWindow()
   if win==nil then
      return
   end
   local curFrame = win:frame()
   local screen = win:screen()
   if screen==nil then
      return
   end
   local max = screen:frame()
   local inscW =120
   if (max.w-curFrame.w)==0 then
      win:setFrame(max)
      return
   end
   local inscH =inscW*(max.h-curFrame.h)/(max.w-curFrame.w)

   if max.w-curFrame.h<inscW and max.h-curFrame.h<inscW then
      win.setFrame(max)
   else
      curFrame.w=curFrame.w +inscW
      local a = (curFrame.x-max.x) -- 左边空白的宽度
      local b =((max.x+max.w)-(curFrame.w+curFrame.x)) -- 右边空白的宽度
      if b<0 then
         curFrame.w=max.w
         curFrame.x=max.x
         -- elseif b-a==0 then
         --    curFrame.x=max.x
      else
         -- a*(inscW-m)=b*m -->a*inscW-a*m=b*m
         if b+a==0 then
            return
         end
         local m =inscW*a/(b+a)                         -- 左边应变化的尺寸
         curFrame.x=curFrame.x-m                          -- 变化后左边的坐标
         if curFrame.x<max.x then
            curFrame.x=max.x
         end
      end

      curFrame.h=curFrame.h +inscH
      local a = (curFrame.y-max.y) -- 左边空白的宽度
      local b =((max.y+max.h)-(curFrame.h+curFrame.y)) -- 右边空白的宽度
      if b<0 then
         curFrame.h=max.h
         curFrame.y=max.y
         -- elseif b-a==0 then
         --    curFrame.y=max.y
      else
         -- a*(inscH-m)=b*m -->a*inscH-a*m=b*m
         if b+a==0 then
            win:setFrame(max)
            return
         end
         local m =inscH*a/(b+a)                         -- 左边应变化的尺寸
         curFrame.y=curFrame.y-m                          -- 变化后左边的坐标
         if curFrame.y<max.y then
            curFrame.y=max.y
         end
      end

      win:setFrame(curFrame)
   end
end

function winReduce()
   local win = hs.window.focusedWindow()
   if win == nil then
      return
   end
   local curFrame = win:frame()
   local screen = win:screen()
   if screen == nil then
      return
   end
   local max = screen:frame()
   local inscW = 100
   if curFrame.w == 0 then
      return
   end
   local inscH =inscW*(curFrame.h)/(curFrame.w)

   -- hs.alert.show(tostring((max.w-curFrame.w)))
   curFrame.w =curFrame.w-inscW
   curFrame.x =curFrame.x+inscW/2

   -- hs.alert.show(tostring((max.h-curFrame.h)))
   curFrame.h =curFrame.h-inscH
   curFrame.y =curFrame.y+inscH/2
   win:setFrame(curFrame)
end
