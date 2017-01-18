# Record the latest command and delete the previous duplicate entries.
export HISTCONTROL=ignoreboth:erasedups

export PATH=/usr/local/bin:$PATH
export PATH=$HOME/anaconda3/bin:$PATH

# make fzf include hidden files
export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'
export FZF_DEFAULT_OPTS='
--color fg:242,bg:236,hl:65,fg+:15,bg+:239,hl+:108
--color info:108,prompt:109,spinner:108,pointer:168,marker:168
'
# Using highlight (http://www.andre-simon.de/doku/highlight/en/highlight.html)
export FZF_CTRL_T_OPTS="--preview '(highlight -O ansi -l {} 2> /dev/null || cat {} || tree -C {}) 2> /dev/null | head -200'"

# Change the default CTRL_T to CTRL_F
bindkey '^F' fzf-file-widget
