#!/bin/bash
# Claude Code statusline script - Powerline style
# Requires a Nerd Font for icons

input=$(cat)

# Extract data using jq
MODEL=$(echo "$input" | jq -r '.model.display_name // "Unknown"')
CONTEXT_SIZE=$(echo "$input" | jq -r '.context_window.context_window_size // 0')
USAGE=$(echo "$input" | jq '.context_window.current_usage // null')
CWD=$(echo "$input" | jq -r '.cwd // ""')

# Calculate context percentage
if [ "$USAGE" != "null" ] && [ "$CONTEXT_SIZE" -gt 0 ]; then
    CURRENT_TOKENS=$(echo "$USAGE" | jq '.input_tokens + .cache_creation_input_tokens + .cache_read_input_tokens')
    PERCENT_USED=$((CURRENT_TOKENS * 100 / CONTEXT_SIZE))
else
    PERCENT_USED=0
fi

# Powerline symbols (requires Nerd Font)
SEP=""      # U+E0B0
RSEP=""     # U+E0B2

# Icons (Nerd Font)
ICON_MODEL="󰧑"   # brain/AI icon
ICON_CTX="󰭻"    # text/context icon
ICON_CPU="󰻠"    # chip/cpu icon
ICON_MEM="󰍛"    # memory icon
ICON_DIR=""    # folder icon
ICON_GIT=""    # git branch icon

# Color codes - foreground
RESET="\033[0m"
FG_BLACK="\033[30m"
FG_WHITE="\033[97m"
FG_CYAN="\033[36m"
FG_YELLOW="\033[33m"
FG_GREEN="\033[32m"
FG_RED="\033[31m"
FG_MAGENTA="\033[35m"
FG_BLUE="\033[34m"

# Color codes - background
BG_CYAN="\033[46m"
BG_YELLOW="\033[43m"
BG_GREEN="\033[42m"
BG_RED="\033[41m"
BG_MAGENTA="\033[45m"
BG_BLUE="\033[44m"
BG_GRAY="\033[100m"
BG_DGRAY="\033[48;5;24m"  # dark blue instead of gray

# Choose color based on context usage
if [ "$PERCENT_USED" -lt 50 ]; then
    CTX_BG="$BG_GREEN"
    CTX_FG="$FG_GREEN"
elif [ "$PERCENT_USED" -lt 80 ]; then
    CTX_BG="$BG_YELLOW"
    CTX_FG="$FG_YELLOW"
else
    CTX_BG="$BG_RED"
    CTX_FG="$FG_RED"
fi

# Get OS metrics
CPU_USAGE=$(ps -A -o %cpu | awk '{sum+=$1} END {printf "%.0f", sum}')
MEM_PRESSURE=$(memory_pressure 2>/dev/null | grep "System-wide memory free percentage" | awk '{printf "%.0f", 100-$5}')
if [ -z "$MEM_PRESSURE" ]; then
    MEM_PRESSURE=$(vm_stat | awk '/Pages active|Pages wired/ {sum+=$NF} END {printf "%.0f", sum*4096/1024/1024/1024*100/16}')
fi

# Get short directory name and git branch
if [ -n "$CWD" ]; then
    DIR_NAME=$(basename "$CWD")
    GIT_BRANCH=$(git -C "$CWD" rev-parse --abbrev-ref HEAD 2>/dev/null)
    if [ "$GIT_BRANCH" = "HEAD" ]; then
        GIT_BRANCH=$(git -C "$CWD" rev-parse --short HEAD 2>/dev/null)
    fi
else
    DIR_NAME=""
    GIT_BRANCH=""
fi

# Build statusline with powerline style
# Foreground for dark blue section
FG_DGRAY="\033[38;5;24m"

# Section 1: Model (magenta)
SEC1="${BG_MAGENTA}${FG_BLACK} ${ICON_MODEL} ${MODEL} ${RESET}"
SEP1="${FG_MAGENTA}${BG_DGRAY}${SEP}${RESET}"

# Section 2: Context (dynamic color based on usage)
SEC2="${CTX_BG}${FG_BLACK} ${ICON_CTX} ${PERCENT_USED}% ${RESET}"
SEP2_PRE="${FG_DGRAY}${CTX_BG}${SEP}${RESET}"
SEP2="${CTX_FG}${BG_DGRAY}${SEP}${RESET}"

# Section 3: CPU & Memory (dark blue)
SEC3="${BG_DGRAY}${FG_WHITE} ${ICON_CPU} ${CPU_USAGE}%  ${ICON_MEM} ${MEM_PRESSURE}% ${RESET}"
SEP3="${FG_DGRAY}${CTX_BG}${SEP}${RESET}"

# Section 4: Context (dynamic color)
SEC4="${CTX_BG}${FG_BLACK} ${ICON_CTX} ${PERCENT_USED}% ${RESET}"
SEP4="${CTX_FG}${BG_BLUE}${SEP}${RESET}"

# Section 5: Directory (blue)
SEC5="${BG_BLUE}${FG_BLACK} ${ICON_DIR} ${DIR_NAME} ${RESET}"

# Section 6: Git branch (if available)
if [ -n "$GIT_BRANCH" ]; then
    SEP5="${FG_BLUE}${BG_CYAN}${SEP}${RESET}"
    SEC6="${BG_CYAN}${FG_BLACK} ${ICON_GIT} ${GIT_BRANCH} ${RESET}${FG_CYAN}${SEP}${RESET}"
else
    SEP5=""
    SEC6="${FG_BLUE}${SEP}${RESET}"
fi

# Output statusline
echo -e "${SEC1}${SEP1}${SEC3}${SEP3}${SEC4}${SEP4}${SEC5}${SEP5}${SEC6}"
