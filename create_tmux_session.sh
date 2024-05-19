#!/bin/bash

# Name of the new tmux session
SESSION_NAME="amd"

# Array of commands to run in different panels
commands=(
    "~/Downloads/clash-linux-amd64-v3 -f ~/.config/clash/flyingbird.pro.yaml"
    "~/Data1/github.com/ra-multiplex/target/release/ra-multiplex server"
    "cd ~/src/github.com/Dreamacro/clash-dashboard && pnpm start"
    "~/Data1/github.com/alacritty/target/release/alacritty"
)

# Create a new tmux session
tmux new-session -d -s $SESSION_NAME

# Create new windows/panels and run the commands
for i in "${!commands[@]}"; do
    if [ $i -eq 0 ]; then
        # Run the first command in the first (default) pane
        tmux send-keys -t $SESSION_NAME "${commands[$i]}" C-m
    else
        # Create a new pane and run the subsequent commands
        tmux split-window -t $SESSION_NAME
        tmux send-keys -t $SESSION_NAME "${commands[$i]}" C-m
        tmux select-layout -t $SESSION_NAME tiled
    fi
done

# Attach to the tmux session
tmux attach-session -t $SESSION_NAME
