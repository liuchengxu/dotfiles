# Record the latest command and delete the previous duplicate entries.
export HISTCONTROL=ignoreboth:erasedups

# For bash installed by brew
if [ -f $(brew --prefix)/share/bash-completion/bash_completion ]; then
    . $(brew --prefix)/share/bash-completion/bash_completion
fi

export PATH=$HOME/anaconda3/bin:$PATH

# Change the default CTRL_T to CTRL_F
bindkey '^F' fzf-file-widget
