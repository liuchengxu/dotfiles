export PLATFORM=$(uname -s)

# Record the latest command and delete the previous duplicate entries.
export HISTCONTROL=ignoreboth:erasedups

# Aliases
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'
alias ......='cd ../../../../..'
alias cd.='cd ..'
alias cd..='cd ..'
alias l='ls -alF'
alias ll='ls -l'
alias vi='vim'
alias vi2='vi -O2 '
alias hc="history -c"
alias which='type -p'
alias gs='git status'
alias gd="git diff"

# Colored ls
if [ -x /usr/bin/dircolors ]; then
  eval "`dircolors -b`"
  alias ls='ls --color=auto'
  alias grep='grep --color=auto'
elif [ "$PLATFORM" = Darwin ]; then
  alias ls='ls -G'
fi

if [ "$PLATFORM" = Darwin ]; then
    # For coreutils installed by brew
    # use these commands with their normal names, instead of the prefix 'g'
    PATH="/usr/local/opt/coreutils/libexec/gnubin:$PATH"
    MANPATH="/usr/local/opt/coreutils/libexec/gnuman:$MANPATH"
    # For bash installed by brew
    if [ -f $(brew --prefix)/share/bash-completion/bash_completion ]; then
        . $(brew --prefix)/share/bash-completion/bash_completion
    fi
fi

# Prompt
function nonzero_return() {
	RETVAL=$?
	[ $RETVAL -ne 0 ] && echo "$RETVAL"
}

if [ "$PLATFORM" = Linux ]; then
  PS1="\[\e[1;35m\]\u\[\e[1;34m\]@\[\e[1;33m\]\h\[\e[1;32m\]:\[\e[0;36m\]\w \[\e[0m\][\t]\n"
  PS1="$PS1\[\e[1;32m\]\$ \[\e[0m\]"
else
  ## git-prompt
  __git_ps1() { :;}
  [ -e ~/.git-prompt.sh ] && source ~/.git-prompt.sh
  # PROMPT_COMMAND='history -a; history -c; history -r; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
  PROMPT_COMMAND='history -a; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
  PS1="\[\e[36m\]# \[\e[34m\]\u\[\e[1;32m\]@\[\e[0;33m\]\h \[\e[0m\]in \[\e[35m\]\w\n"
  PS1="$PS1\[\e[1;31m\]\$ \[\e[0m\]"
fi

export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'

[ -f ~/.extra.bash ] && source ~/.extra.bash

[ -f ~/.fzf.bash ] && source ~/.fzf.bash

# Change the default CTRL_T to CTRL_F
bind -x '"\C-f": "fzf-file-widget"'
