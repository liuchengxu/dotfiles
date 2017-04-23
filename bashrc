export PLATFORM=$(uname -s)

# Prevent file overwrite on stdout redirection
# Use `>|` to force redirection to an existing file
set -o noclobber

# Update window size after every command
shopt -s checkwinsize

# Unique Bash version check
if ((BASH_VERSINFO[0] >= 4))
then
  # Automatically trim long paths in the prompt (requires Bash 4.x)
  PROMPT_DIRTRIM=2
fi

# Enable history expansion with space
# E.g. typing !!<space> will replace the !! with your last command
bind Space:magic-space

# Turn on recursive globbing (enables ** to recurse all directories)
shopt -s globstar 2> /dev/null

# Case-insensitive globbing (used in pathname expansion)
shopt -s nocaseglob;

## SMARTER TAB-COMPLETION (Readline bindings) ##

# Perform file completion in a case insensitive fashion
bind "set completion-ignore-case on"

# Treat hyphens and underscores as equivalent
bind "set completion-map-case on"

# Display matches for ambiguous patterns at first tab press
bind "set show-all-if-ambiguous on"

# Immediately add a trailing slash when autocompleting symlinks to directories
bind "set mark-symlinked-directories on"

# Append to the history file, don't overwrite it
shopt -s histappend

# Save multi-line commands as one command
shopt -s cmdhist

# Record each line as it gets issued
PROMPT_COMMAND='history -a'

# Huge history. Doesn't appear to slow things down, so why not?
HISTSIZE=500000
HISTFILESIZE=100000

# Avoid duplicate entries
HISTCONTROL="erasedups:ignoreboth"

# Don't record some commands
export HISTIGNORE="&:[ ]*:exit:ls:bg:fg:history:clear"

# Use standard ISO 8601 timestamp
# %F equivalent to %Y-%m-%d
# %T equivalent to %H:%M:%S (24-hours format)
HISTTIMEFORMAT='%F %T '

# Enable incremental history search with up/down arrows (also Readline goodness)
# Learn more about this here: http://codeinthehole.com/writing/the-most-important-command-line-tip-incremental-history-searching-with-inputrc/
bind '"\e[A": history-search-backward'
bind '"\e[B": history-search-forward'
bind '"\e[C": forward-char'
bind '"\e[D": backward-char'

## BETTER DIRECTORY NAVIGATION ##

# Prepend cd to directory names automatically
shopt -s autocd 2> /dev/null
# Correct spelling errors during tab-completion
shopt -s dirspell 2> /dev/null
# Correct spelling errors in arguments supplied to cd
shopt -s cdspell 2> /dev/null

# This defines where cd looks for targets
# Add the directories you want to have fast access to, separated by colon
# Ex: CDPATH=".:~:~/projects" will look for targets in the current working directory, in home and in the ~/projects folder
CDPATH="."

# sets the option to 'autocd' into a directory.
# Instead of `XXXX is a directory`, bash will cd into it.
shopt -s autocd

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

## gpom: simplistic git push origin master alias.
alias gs='git status'
alias gd="git diff"
alias gpom="git push origin master"

## up: cd .. when you're too lazy to use the spacebar
alias up="cd .."

## space: gets space left on disk
alias space="df -h"

## restart: a quick refresh for your shell instance.
alias restart="source ~/.bashrc"

alias tmux="tmux -2"

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
  PS1="\[\e[1;35m\]\u\[\e[1;34m\]@\[\e[1;33m\]\h\[\e[1;32m\]:\[\e[0;36m\]in \[\e[35m\]\w \[\e[0m\][\t] \`nonzero_return\` \n"
  PS1="$PS1\[\e[1;32m\]\$ \[\e[0m\]"
else
  ## git-prompt
  __git_ps1() { :;}
  [ -e ~/.git-prompt.sh ] && source ~/.git-prompt.sh
  # PROMPT_COMMAND='history -a; history -c; history -r; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
  PROMPT_COMMAND='history -a; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
  PS1="\[\e[36m\]# \[\e[34m\]\u\[\e[1;32m\]@\[\e[0;33m\]\h \[\e[0m\]in \[\e[35m\]\w \`nonzero_return\` \n"
  PS1="$PS1\[\e[1;31m\]\$ \[\e[0m\]"
fi

export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'

[ -f ~/.extra.bash ] && source ~/.extra.bash

[ -f ~/.fzf.bash ] && source ~/.fzf.bash
