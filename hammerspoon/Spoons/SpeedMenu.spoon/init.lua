--- === SpeedMenu ===
---
--- Menubar netspeed meter
---
--- Based on official Hammerspoon/Spoons/SpeedMenu.spoon
---
--- Download: [https://github.com/Hammerspoon/Spoons/raw/master/Spoons/SpeedMenu.spoon.zip](https://github.com/Hammerspoon/Spoons/raw/master/Spoons/SpeedMenu.spoon.zip)

local obj={}
obj.__index = obj

-- Metadata
obj.name = "SpeedMenu"
obj.version = "1.0"
obj.author = "liuchengxu <xuliuchengxlc@gmail.com>"
obj.homepage = "https://github.com/Hammerspoon/Spoons"
obj.license = "MIT - https://opensource.org/licenses/MIT"

function obj:init()
    self.menubar = hs.menubar.new()
    obj:reload()
end

--- delta bytes
local function format(delta)
    local str = ''
    if delta < 1024 then
        str = string.format("%6.2f", delta) .. ' B/s'
    elseif delta < 1024*1024 then
        str = string.format("%6.2f", delta/1024) .. ' KB/s'
    else
        str = string.format("%6.2f", delta/1024/1024) .. ' MB/s'
    end
    return str
end

-- Update network stats
local function update()
    local ibytes = hs.execute(obj.incmd)
    local obytes = hs.execute(obj.outcmd)
    local in_per_sec = format(ibytes - obj.old_ibytes)
    local out_per_sec = format(obytes - obj.old_obytes)

    local text = '⇧ ' .. out_per_sec .. '\n⇩ ' .. in_per_sec
    local hex_color = "#000000"

    local darkmode = hs.osascript.applescript('tell application "System Events"\nreturn dark mode of appearance preferences\nend tell')
    if darkmode then
        hex_color = "#FFFFFF"
    end
    local title = hs.styledtext.new(text, {font={size=9.0, color={hex=hex_color}}})

    obj.menubar:setTitle(title)


    obj.old_ibytes = ibytes
    obj.old_obytes = obytes
end

local function menu()
    local primary_interface = hs.network.primaryInterfaces()

    local menuitems_table = {}
    if primary_interface then
        -- Inspect active interface and create menuitems
        local interface_detail = hs.network.interfaceDetails(primary_interface)
        if interface_detail.AirPort then
            local ssid = interface_detail.AirPort.SSID
            table.insert(menuitems_table, {
                title = "SSID:     " .. ssid,
                tooltip = "Copy SSID to clipboard",
                fn = function() hs.pasteboard.setContents(ssid) end
            })
        end
        if interface_detail.IPv4 then
            local ipv4 = interface_detail.IPv4.Addresses[1]
            table.insert(menuitems_table, {
                title = "IPv4:     " .. ipv4,
                tooltip = "Copy IPv4 to clipboard",
                fn = function() hs.pasteboard.setContents(ipv4) end
            })
        end
        if interface_detail.IPv6 then
            local ipv6 = interface_detail.IPv6.Addresses[1]
            table.insert(menuitems_table, {
                title = "IPv6:     " .. ipv6,
                tooltip = "Copy IPv6 to clipboard",
                fn = function() hs.pasteboard.setContents(ipv6) end
            })
        end
        local macaddr = hs.execute('ifconfig ' .. primary_interface .. ' | grep ether | awk \'{print $2}\'')
        table.insert(menuitems_table, {
            title = "MAC:     " .. macaddr,
            tooltip = "Copy MAC Addr to clipboard",
            fn = function() hs.pasteboard.setContents(macaddr) end
        })
        -- Start watching the netspeed delta
        obj.incmd = 'netstat -ibn | grep -e ' .. primary_interface .. ' -m 1 | awk \'{print $7}\''
        obj.outcmd = 'netstat -ibn | grep -e ' .. primary_interface .. ' -m 1 | awk \'{print $10}\''

        obj.old_ibytes = hs.execute(obj.incmd)
        obj.old_obytes = hs.execute(obj.outcmd)

        if obj.timer then
            obj.timer:stop()
            obj.timer = nil
        end
        obj.timer = hs.timer.doEvery(1, update)
    end
    table.insert(menuitems_table, {
        title = "⟲ Reload",
        fn = function() obj:reload() end
    })
    return menuitems_table
end

--- SpeedMenu:reload()
--- Method
--- Redetect the active interface, darkmode …And redraw everything.
---

function obj:reload()
    local menu = menu()
    obj.menubar:setTitle("⛔")
    obj.menubar:setMenu(menu)
end

return obj
