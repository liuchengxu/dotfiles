export PLATFORM=$(uname -s)
[ -f /etc/bashrc ] && . /etc/bashrc

### Append to the history file
shopt -s histappend

### Check the window size after each command ($LINES, $COLUMNS)
shopt -s checkwinsize

### Bash completion
[ -f /etc/bash_completion ] && . /etc/bash_completion

### Perform file completion in a case insensitive fashion
bind "set completion-ignore-case on"

### Display matches for ambiguous patterns at first tab press
bind "set show-all-if-ambiguous on"

### Avoid duplicate entries
HISTCONTROL="erasedups:ignoreboth"

# Don't record some commands
export HISTIGNORE="&:[ ]*:exit:ls:bg:fg:history:clear"

### man bash
export HISTCONTROL=ignoreboth:erasedups
export HISTSIZE=
export HISTFILESIZE=
export HISTTIMEFORMAT="%Y/%m/%d %H:%M:%S:   "
[ -z "$TMPDIR" ] && TMPDIR=/tmp

# Aliases
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'
alias ......='cd ../../../../..'

alias cd.='cd ..'
alias cd..='cd ..'

alias la='ls -al'
alias ll='ls -l'

## Git
alias gs='git status'
alias gd="git diff"
alias gpom="git push origin master"

## up: cd .. when you're too lazy to use the spacebar
alias up="cd .."

## space: gets space left on disk
alias space="df -h"

## restart: a quick refresh for your shell instance.
alias restart="source ~/.bashrc"

### Tmux
alias tmux="tmux -2"

### Colored ls
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
### git-prompt
__git_ps1() { :;}
if [ -e ~/.git-prompt.sh ]; then
    source ~/.git-prompt.sh
fi
# PROMPT_COMMAND='history -a; history -c; history -r; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
PROMPT_COMMAND='history -a; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
PS1="\[\e[36m\]# \[\e[34m\]\u\[\e[1;32m\]@\[\e[0;33m\]\h \[\e[0m\]in \[\e[35m\]\w \`nonzero_return\` \n"
PS1="$PS1\[\e[1;31m\]\$ \[\e[0m\]"

export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'

[ -f ~/.extra.bash ] && source ~/.extra.bash

[ -f ~/.fzf.bash ] && source ~/.fzf.bash

export FZF_COMPLETION_TRIGGER='/'
