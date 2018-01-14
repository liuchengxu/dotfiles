#!/usr/bin/env bash

msg() {
    printf '%b\n' "$1" >&2
}

success() {
    if [ "$ret" -eq '0' ]; then
        msg "\033[32m[✔]\033[0m ${1}${2}"
    fi
}

warning(){
    msg "\033[33mWarning:\033[0m ${1}${2}"
}

error() {
    msg "\033[31m[✘]\033[0m ${1}${2}"
    exit 1
}

dir=$HOME/dotfiles
dotfiles='bashrc bash_profile zshrc ideavimrc spacemacs spacevim tmux.conf gitconfig gitexcludes ctags'

lnif() {
    if [ -e "$1" ]; then
        ln -sf "$1" "$2"
    fi
}

create_symlinks() {
    for file in $dotfiles; do
        if [ -e "$HOME/.$file" ]; then
            warning ".$file alreadly exists in your home directory. Are you sure to overwrite it? ([y]/n)"
            read -r -n 1;
            msg ""
            if [[ ! $REPLY ]] || [[ $REPLY =~ ^[Yy]$ ]]; then
                lnif "$dir/$file" "$HOME/.$file"
            fi
        else
            ln -s "$dir/$file" "$HOME/.$file"
        fi
    done
}

create_symlinks

ret="$?"
success 'Dotfiles have been configured!'
