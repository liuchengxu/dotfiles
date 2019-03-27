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
alias viml='vim -c "set bg=light"'
alias nviml='nvim -c "set bg=light"'

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

## util
alias lip="ipconfig getifaddr en0"
alias www='python3 -m SimpleHTTPServer 8000'
alias n="nvim"

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

  alias cat="bat"
  alias ping="prettyping --nolegend"
  alias du="ncdu --color dark -rr -x --exclude .git --exclude node_modules"
  alias h="tldr"
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

[ -f /usr/local/etc/profile.d/autojump.sh ] && . /usr/local/etc/profile.d/autojump.sh

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

if [ ! -e ~/.z.sh ]; then
  curl https://raw.githubusercontent.com/rupa/z/master/z.sh -o ~/.z.sh
fi
source "$HOME/.z.sh"

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

if [ "$PLATFORM" = Darwin ]; then
  PROMPT_COMMAND='history -a; printf "\[$LBlack\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
else
  PROMPT_COMMAND='history -a; history -c; history -r; printf "\[\e[38;5;59m\]%$(($COLUMNS - 4))s\r" "$(__git_ps1) ($(date +%m/%d\ %H:%M:%S))"'
fi

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

export EDITOR=vim
# https://github.com/wernight/powerline-web-fonts/issues/8
export LANG=en_US.UTF-8
export LC_CTYPE=en_US.UTF-8

if exists "fd"; then
  export FZF_DEFAULT_COMMAND='fd --type f --hidden --follow --exclude .git'
elif exists "rg"; then
  export FZF_DEFAULT_COMMAND='rg --files --no-ignore --hidden --follow -g "!{.git,node_modules}/*" 2> /dev/null'
elif exists "ag"; then
  export FZF_DEFAULT_COMMAND='ag --hidden --ignore .git -g ""'
fi

export FZF_COMPLETION_TRIGGER='..'

export GOPATH=$HOME
add_to_path "$GOPATH/bin"

add_to_path "$HOME/.cargo/bin"
add_to_path "$HOME/.local/bin" # hie
add_to_path "$HOME/.npm-packages/bin"
add_to_path "/Library/TeX/texbin"

export RUST_SRC_PATH="$(rustc --print sysroot)/lib/rustlib/src/rust/src"
alias cargoexpand="cargo rustc -- -Z unstable-options --pretty=expanded"
alias cb="cargo build"

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
      git diff --color=always "$shas" | less -R
    else
      for sha in $shas; do
        git show --color=always "$sha" | less -R
      done
    fi
  done
}

push() {
  local remote branch
  remote=$(git remote)
  branch=$(git rev-parse --abbrev-ref HEAD)
  git push $remote $branch
}

pull() {
  local remote branch
  remote=$(git remote)
  branch=$(git rev-parse --abbrev-ref HEAD)
  git pull $remote $branch
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
        echo "usage: compress <foo.tar.gz> ./foo ./bar"
    fi
}

# added by travis gem
[ -f /Users/xlc/.travis/travis.sh ] && source /Users/xlc/.travis/travis.sh

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"  # This loads nvm bash_completion

# fco - checkout git branch/tag
fco() {
  local tags branches target
  if [ -n "$1" ] ; then
    git remote update origin --prune >/dev/null
  fi
  tags=$(git tag | awk '{print "\x1b[31;1mtag\x1b[m\t" $1}') || return
  branches=$(
    git branch --all | grep -v HEAD             |
    sed "s/.* //"    | sed "s#remotes/[^/]*/##" |
    sort -u          | awk '{print "\x1b[34;1mbranch\x1b[m\t" $1}') || return
  target=$(
    (echo "$tags"; echo "$branches") |
    fzf --height=40% --no-hscroll --ansi -d "\t" -n 2) || return
  git checkout $(echo "$target" | awk '{print $2}')
}

# fbr - checkout git branch (including remote branches)
fbr() {
  local branches branch
  branches=$(git branch --all | grep -v HEAD) &&
  branch=$(echo "$branches" | fzf --height=40% -d $(( 2 + $(wc -l <<< "$branches") )) +m) &&
  git checkout $(echo "$branch" | sed "s/.* //" | sed "s#remotes/[^/]*/##")
}

fcof() {
  git checkout -- $(git ls-files --modified | fzf --height=40% -m) >/dev/null
}

nop() {
  http_proxy= https_proxy= "$@"
}

alias gnvim="VIMRUNTIME=/usr/share/vim/vim80 GNVIM_RUNTIME_PATH=./runtime /home/xlc/src/github.com/vhakulinen/gnvim/target/release/gnvim --nvim=/home/xlc/src/github.com/neovim/neovim/build/bin/nvim"
