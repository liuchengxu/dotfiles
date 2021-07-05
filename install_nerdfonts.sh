#!/usr/bin/env bash

# Helper script to install nerd-fonts on Ubuntu.

REPO="ryanoasis/nerd-fonts"

latest_release() {
  local repo=$1
  local result=$(curl --silent "https://api.github.com/repos/$repo/releases/latest" | grep -Po '"tag_name": "\K.*?(?=")')
  echo "$result"
}

echo "==> Fetching latest release version of $REPO"
version=$(latest_release $REPO)
echo "==> Latest version is: $version"

RED='\033[0;31m'
NC='\033[0m' # No Color

install_font() {
  local fontname=$1
  # install DroidSansMono Nerd Font --> u can choose another at: https://www.nerdfonts.com/font-downloads
  echo -e "==> Downloading font ${RED}$fontname${NC} ......"
  echo "==> https://github.com/$REPO/releases/download/$version/$fontname.zip"
  wget https://github.com/$REPO/releases/download/$version/$fontname.zip
  unzip $fontname.zip -d ~/.fonts
  fc-cache -fv
  echo "==> done!"
}


# install_font FiraCode
# install_font Iosevka
# install_font FantasqueSansMono
# install_font Lekton
install_font Inconsolata
# install_font VictorMono
# install_font InconsolataGo
# install_font Monofur
