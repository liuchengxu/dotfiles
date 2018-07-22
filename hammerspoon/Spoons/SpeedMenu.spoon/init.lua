--- === SpeedMenu ===
---
--- Menubar netspeed meter
---
--- based on official Hammerspoon/Spoons/SpeedMenu.spoon
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
    obj:rescan()
end

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

local function data_diff()
    local in_seq = hs.execute(obj.incmd)
    local out_seq = hs.execute(obj.outcmd)
    local in_delta = in_seq - obj.inseq
    local out_delta = out_seq - obj.outseq
    local instr = format(in_delta)
    local outstr = format(out_delta)
    obj.kbout = outstr
    obj.kbin = instr
    local title = '⇧ ' .. obj.kbout .. '\n⇩ ' .. obj.kbin
    local hex_color = "#000000"
    if obj.darkmode then
        hex_color = "#FFFFFF"
    end
    obj.title = hs.styledtext.new(title, {font={size=9.0, color={hex=hex_color}}})
    obj.menubar:setTitle(obj.title)
    obj.inseq = in_seq
    obj.outseq = out_seq
end

--- SpeedMenu:rescan()
--- Method
--- Redetect the active interface, darkmode …And redraw everything.
---

function obj:rescan()
    obj.interface = hs.network.primaryInterfaces()
    obj.darkmode = hs.osascript.applescript('tell application "System Events"\nreturn dark mode of appearance preferences\nend tell')

    local menuitems_table = {}
    if obj.interface then
        -- Inspect active interface and create menuitems
        local interface_detail = hs.network.interfaceDetails(obj.interface)
        if interface_detail.AirPort then
            local ssid = interface_detail.AirPort.SSID
            table.insert(menuitems_table, {
                title = "SSID: " .. ssid,
                tooltip = "Copy SSID to clipboard",
                fn = function() hs.pasteboard.setContents(ssid) end
            })
        end
        if interface_detail.IPv4 then
            local ipv4 = interface_detail.IPv4.Addresses[1]
            table.insert(menuitems_table, {
                title = "IPv4: " .. ipv4,
                tooltip = "Copy IPv4 to clipboard",
                fn = function() hs.pasteboard.setContents(ipv4) end
            })
        end
        if interface_detail.IPv6 then
            local ipv6 = interface_detail.IPv6.Addresses[1]
            table.insert(menuitems_table, {
                title = "IPv6: " .. ipv6,
                tooltip = "Copy IPv6 to clipboard",
                fn = function() hs.pasteboard.setContents(ipv6) end
            })
        end
        local macaddr = hs.execute('ifconfig ' .. obj.interface .. ' | grep ether | awk \'{print $2}\'')
        table.insert(menuitems_table, {
            title = "MAC Addr: " .. macaddr,
            tooltip = "Copy MAC Address to clipboard",
            fn = function() hs.pasteboard.setContents(macaddr) end
        })
        -- Start watching the netspeed delta
        obj.incmd = 'netstat -ibn | grep -e ' .. obj.interface .. ' -m 1 | awk \'{print $7}\''
        obj.outcmd = 'netstat -ibn | grep -e ' .. obj.interface .. ' -m 1 | awk \'{print $10}\''

        obj.inseq = hs.execute(obj.incmd)
        obj.outseq = hs.execute(obj.outcmd)

        if obj.timer then
            obj.timer:stop()
            obj.timer = nil
        end
        obj.timer = hs.timer.doEvery(1, data_diff)
    end
    table.insert(menuitems_table, {
        title = "Rescan Network Interfaces",
        fn = function() obj:rescan() end
    })
    obj.menubar:setTitle("⚠︎")
    obj.menubar:setMenu(menuitems_table)
end

return obj
