export PLATFORM=$(uname -s)

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
fi

# Prompt
function nonzero_return() {
	RETVAL=$?
	[ $RETVAL -ne 0 ] && echo "$RETVAL"
}

if [ "$PLATFORM" = Linux ]; then
  PS1="\[\e[1;38m\]\u\[\e[1;34m\]@\[\e[1;31m\]\h\[\e[1;30m\]:"
  PS1="$PS1\[\e[0;38m\]\w\[\e[1;35m\]> \[\e[0m\]"
else
  ### git-prompt
  __git_ps1() { :;}
  [ -e ~/.git-prompt.sh ] && source ~/.git-prompt.sh
  # PROMPT_COMMAND='history -a; history -c; history -r; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
  PROMPT_COMMAND='history -a; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
  PS1="\e[33m\]\$\[\e[34m\]\u\[\e[1;32m\]@\[\e[0;33m\]\h\[\e[35m\]:"
  PS1="$PS1\[\e[m\]\w\[\e[1;31m\]> \[\e[0m\]"
fi

export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'

# Use anaconda3
export PATH=~/anaconda3/bin:"$PATH"

[ -f ~/.extra.bash ] && source ~/.extra.bash

[ -f ~/.fzf.bash ] && source ~/.fzf.bash
