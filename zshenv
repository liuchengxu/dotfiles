export PATH=/usr/local/bin:$PATH
export PATH=$HOME/anaconda3/bin:$PATH

# make fzf include hidden files
export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'
