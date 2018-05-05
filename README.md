# dotfiles

🏹 dotfiles for Linux and macOS

## Usage

These are my very private configuration files, you are free to use at your own risk.

```bash
$ git clone https://github.com/liuchengxu/dotfiles.git ~/.dotfiles
$ bash ~/.dotfiles/bootstrap.sh
```

### Vim for server

```bash
# Use space key as the leader key
$ echo 'let g:mapleader = "\<Space>" | let g:maplocalleader = g:mapleader' > ~/.vimrc

# Shorten https://raw.githubusercontent.com/liuchengxu/vim-better-default/master/plugin/default.vim via https://git.io
# and download to ~/.vim/plugin/default.vim
$ curl -fLo ~/.vim/plugin/default.vim --create-dirs https://git.io/vpwwf
```
