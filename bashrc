# If not running interactively, don't do anything
# avoid bind: warning: line editing not enabled
case $- in
    *i*) ;;
      *) return;;
esac

export PLATFORM
PLATFORM=$(uname -s)
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

# Don't put duplicate lines in the history and do not add lines that start with a space
export HISTCONTROL=erasedups:ignoredups:ignorespace

# Don't record some commands
export HISTIGNORE="&:[ ]*:exit:ls:bg:fg:history:clear"

export PROMPT_DIRTRIM=2

### man bash
export HISTSIZE=-1
export HISTFILESIZE=-1
export HISTTIMEFORMAT="%Y/%m/%d %H:%M:%S:   "

# attempt to save all lines of a multiple-line command in the same history entry
shopt -s cmdhist
# save multi-line commands to the history with embedded newlines
shopt -s lithist

[ -z "$TMPDIR" ] && TMPDIR=/tmp

# Aliases
alias ..='cd ..'
alias ...='cd ../..'
alias ....='cd ../../..'
alias .....='cd ../../../..'
alias ......='cd ../../../../..'

alias cd.='cd ..'
alias cd..='cd ..'
alias p='pwd'
alias l='ls -alF'
alias la='ls -al'
alias ll='ls -l'

## Git
alias ga='git add'
alias gb='git branch'
alias gc='git checkout'
alias gd='git diff'
alias gdc='git diff --cached'
alias gr='git remote'
alias gst='git status'
alias gpom="git push origin master"
alias gitv='git log --color --graph --pretty=format:"%Cred%h%Creset -%C(green)%d%Creset %s %C(yellow)(%cr) %C(blue)<%an>%Creset" --abbrev-commit --'
## up: cd .. when you're too lazy to use the spacebar
alias up="cd .."

## space: gets space left on disk
alias space="df -h"

## restart: a quick refresh for your shell instance.
alias restart="source ~/.bashrc"

### Tmux
alias tmux="tmux -2"

exists() {
  command -v "$1" >/dev/null 2>&1
}

add_to_path() {
  local p=$1
  if [[ ! "$PATH" == *"$p"* ]]; then
    export PATH="$p:$PATH"
  fi
}

if [ "$PLATFORM" = Darwin ]; then
  # For coreutils installed by brew
  # use these commands with their normal names, instead of the prefix 'g'
  add_to_path "/usr/local/opt/coreutils/libexec/gnubin"
  MANPATH="/usr/local/opt/coreutils/libexec/gnuman:$MANPATH"
  if exists brew; then
    # For bash installed by brew
    [ -f "$(brew --prefix)/share/bash-completion/bash_completion" ] && . "$(brew --prefix)/share/bash-completion/bash_completion"
  fi
fi

### Colored ls
if exists "dircolors"; then
  eval "$(dircolors -b)"
  alias ls='ls --color=auto'
  alias grep='grep --color=auto'
elif [ "$PLATFORM" = Darwin ]; then
  alias ls='ls -G'
fi

# Prompt
function nonzero_return() {
	RETVAL=$?
	[ $RETVAL -ne 0 ] && echo "$RETVAL"
}

### git-prompt
# To show */+/% may have an impact on the performance
# Displays a * and + next to the branch name if there are unstaged (*) and staged (+) changes
# export GIT_PS1_SHOWDIRTYSTATE=true
# Displays a % if there are untracked files
# export GIT_PS1_SHOWUNTRACKEDFILES=true

if [ ! -e ~/.git-prompt.sh ]; then
  curl https://raw.githubusercontent.com/git/git/master/contrib/completion/git-prompt.sh -o ~/.git-prompt.sh
fi
source "$HOME/.git-prompt.sh"

Black=$(tput setaf 0)
Red=$(tput setaf 1)
Green=$(tput setaf 2)
Yellow=$(tput setaf 3)
Blue=$(tput setaf 4)
Magenta=$(tput setaf 5)
Cyan=$(tput setaf 6)
White=$(tput setaf 7)
LBlack=$(tput setaf 8)
LRed=$(tput setaf 9)
LGreen=$(tput setaf 10)
LYellow=$(tput setaf 11)
LBlue=$(tput setaf 12)
LMagenta=$(tput setaf 13)
LCyan=$(tput setaf 14)
LWhite=$(tput setaf 15)

Bold=$(tput bold)
Normal=$(tput sgr0)

# PROMPT_COMMAND='history -a; history -c; history -r; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
PROMPT_COMMAND='history -a; printf "\[$LBlack\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'

if [ "$PLATFORM" = Darwin ]; then
  PS1=""
else
  PS1="\\[$LBlue\\]\\u\\[$Cyan\\]@\\[$Green\\]\\h\\[$Normal\\]:"
fi

PS1+="\\[$LMagenta\\]\\w \\[$LYellow$Bold\\]❯\\[$Green\\]❯\\[$LCyan\\]❯ \\[$Normal\\]"

keybindings() {
  bind -p | grep -F "\\C"
}

add_pwd() {
  PATH=$(pwd):$PATH
  export PATH
}

if exists "fd"; then
  export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
elif exists "rg"; then
  export FZF_DEFAULT_COMMAND='rg --files --no-ignore --hidden --follow -g "!{.git,node_modules}/*" 2> /dev/null'
elif exists "ag"; then
  export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'
fi

export FZF_COMPLETION_TRIGGER='/'

export GOPATH=$HOME

add_to_path "$HOME/.cargo/bin"
add_to_path "$GOPATH/bin"

[ -f ~/.fzf.bash ] && source ~/.fzf.bash
[ -f "$HOME/bashrc-extra" ] && source "$HOME/bashrc-extra"

# Git
## cshow - git commit browser (enter for show, ctrl-d for diff)
## cshow --follow some_file: browser commits on some file
cshow() {
  local out shas sha q k
  while out=$(
      gitv "$@" |
      fzf --ansi --multi --no-sort --reverse --query="$q" \
          --print-query --expect=ctrl-d); do
    q=$(head -1 <<< "$out")
    k=$(head -2 <<< "$out" | tail -1)
    shas=$(sed '1,2d;s/^[^a-z0-9]*//;/^$/d' <<< "$out" | awk '{print $1}')
    [ -z "$shas" ] && continue
    if [ "$k" = ctrl-d ]; then
      git diff --color=always $shas | less -R
    else
      for sha in $shas; do
        git show --color=always $sha | less -R
      done
    fi
  done
}

# Tmux
## tpane - switch pane (@george-b)
tpane() {
  local panes current_window current_pane target target_window target_pane
  panes=$(tmux list-panes -s -F '#I:#P - #{pane_current_path} #{pane_current_command}')
  current_pane=$(tmux display-message -p '#I:#P')
  current_window=$(tmux display-message -p '#I')

  target=$(echo "$panes" | grep -v "$current_pane" | fzf +m --reverse) || return

  target_window=$(echo $target | awk 'BEGIN{FS=":|-"} {print$1}')
  target_pane=$(echo $target | awk 'BEGIN{FS=":|-"} {print$2}' | cut -c 1)

  if [[ $current_window -eq $target_window ]]; then
    tmux select-pane -t ${target_window}.${target_pane}
  else
    tmux select-pane -t ${target_window}.${target_pane} &&
    tmux select-window -t $target_window
  fi
}

# Switch tmux-sessions
tsession() {
  local session
  session=$(tmux list-sessions -F "#{session_name}" | \
    fzf --height 40% --reverse --query="$1" --select-1 --exit-0) &&
  tmux switch-client -t "$session"
}

clone() {
  local url=$1
  if ! git ls-remote "$url" >/dev/null 2>&1; then
    echo "[ERROR] Unable to read from $1"
    return
  fi
  if [[ $url =~ .git$ ]]; then
    url="${url%.*}"
  fi
  if [[ $url =~ ^git@github.com ]]; then
    repo="$(basename "$url")"
    user="$(echo "${url#*:}" | cut -d'/' -f1)"
  else
    repo="$(basename "${url}")"
    user="$(basename "${url%/${repo}}")"
  fi
  local target="$HOME/src/github.com/$user/$repo"
  if [ -d "$target" ]; then
    echo "[ERROR] $user/$repo already exists!"
  else
    if ! git clone "$1" "$target" "$2"; then
      echo "[ERROR] Unable to clone from $1"
      return
    fi
  fi
  cd "$target" || return
}

# Docker
dip() {
  if [ -z "$1" ]; then
    echo "Usage: ${FUNCNAME[0]} container_name    -- Show container IP"
  else
    docker inspect --format '{{ .NetworkSettings.IPAddress }}' "$1"
  fi
}

dbash() {
  if [ -z "$1" ]; then
    echo "Usage: ${FUNCNAME[0]} container_name    -- Execute interactive container"
  else
    docker exec -it "$1" bash -c "stty cols $COLUMNS rows $LINES && bash"
  fi
}

extract() {
    if [ -f $1 ] ; then
        case $1 in
        *.tar.bz2)   tar -xvjf  $1    ;;
        *.tar.gz)    tar -xvzf  $1    ;;
        *.tar.xz)    tar -xvJf  $1    ;;
        *.bz2)       bunzip2    $1    ;;
        *.rar)       rar x      $1    ;;
        *.gz)        gunzip     $1    ;;
        *.tar)       tar -xvf   $1    ;;
        *.tbz2)      tar -xvjf  $1    ;;
        *.tgz)       tar -xvzf  $1    ;;
        *.zip)       unzip      $1    ;;
        *.Z)         uncompress $1    ;;
        *.7z)        7z x       $1    ;;
        *)           echo "don't know how to extract '$1'..." ;;
        esac
    else
        echo "'$1' is not a valid file!"
    fi
}

compress() {
    if [ -n "$1" ] ; then
        FILE=$1
        case $FILE in
        *.tar) shift && tar -cf $FILE $* ;;
        *.tar.bz2) shift && tar -cjf $FILE $* ;;
        *.tar.xz) shift && tar -cJf $FILE $* ;;
        *.tar.gz) shift && tar -czf $FILE $* ;;
        *.tgz) shift && tar -czf $FILE $* ;;
        *.zip) shift && zip $FILE $* ;;
        *.rar) shift && rar $FILE $* ;;
        esac
    else
        echo "usage: q-compress <foo.tar.gz> ./foo ./bar"
    fi
}
