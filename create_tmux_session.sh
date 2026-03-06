#!/bin/bash

# Name of the new tmux session
SESSION_NAME="amd"

# "~/Data1/github.com/ra-multiplex/target/release/ra-multiplex server"
# Array of commands to run in different panels
commands=(
    "~/bin/clash-nyanpasu_1.6.1_amd64.AppImage"
    "~/Code/src/github.com/alacritty/alacritty/target/release/alacritty"
    "~/Code/src/github.com/pr2502/ra-multiplex/target/release/ra-multiplex server"
    "ghostty"
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
