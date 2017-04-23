" Neovim has set these as default
" if !has('nvim')

  set nocompatible

  syntax on                      " Syntax highlighting
  filetype plugin indent on      " Automatically detect file types
  set autoindent                 " Indent at the same level of the previous line
  set autoread                   " Automatically read a file changed outside of vim
  set backspace=indent,eol,start " Backspace for dummies
  set complete-=i                " Exclude files completion
  set display=lastline           " Show as much as possible of the last line
  set encoding=utf-8             " Set default encoding
  set history=10000              " Maximum history record
  set hlsearch                   " Highlight search terms
  set incsearch                  " Find as you type search
  set laststatus=2               " Always show status line
  set mouse=a                    " Automatically enable mouse usage
  set smarttab                   " Smart tab
  set ttyfast                    " Faster redrawing
  set viminfo+=!                 " Viminfo include !
  set wildmenu                   " Show list instead of just completing

  silent! set ttymouse=xterm2

" endif

set shortmess=atOI " No help Uganda information, and overwrite read messages to avoid PRESS ENTER prompts
set ignorecase     " Case insensitive search
set smartcase      " ... but case sensitive when uc present
set scrolljump=5   " Line to scroll when cursor leaves screen
set scrolloff=3    " Minumum lines to keep above and below cursor
set nowrap         " Do not wrap long lines
set shiftwidth=4   " Use indents of 4 spaces
set tabstop=4      " An indentation every four columns
set softtabstop=4  " Let backspace delete indent
set splitright     " Puts new vsplit windows to the right of the current
set splitbelow     " Puts new split windows to the bottom of the current
set autowrite      " Automatically write a file when leaving a modified buffer
set mousehide      " Hide the mouse cursor while typing
set hidden         " Allow buffer switching without saving
set t_Co=256       " Use 256 colors
set ruler          " Show the ruler
set showcmd        " Show partial commands in status line and Selected characters/lines in visual mode
set showmode       " Show current mode in command-line
set showmatch      " Show matching brackets/parentthesis
set matchtime=5    " Show matching time
set report=0       " Always report changed lines
set linespace=0    " No extra spaces between rows

set expandtab    " Tabs are spaces, not tabs

" http://stackoverflow.com/questions/6427650/vim-in-tmux-background-color-changes-when-paging/15095377#15095377
set t_ut=

set winminheight=0
set wildmode=list:longest,full

set listchars=tab:→\ ,eol:↵,trail:·,extends:↷,precedes:↶

set whichwrap+=<,>,h,l  " Allow backspace and cursor keys to cross line boundaries

set termencoding=utf-8
set fileencoding=utf-8
set fileencodings=utf-8,ucs-bom,gb18030,gbk,gb2312,cp936

set wildignore+=*swp,*.class,*.pyc,*.png,*.jpg,*.gif,*.zip
set wildignore+=*/tmp/*,*.o,*.obj,*.so     " Unix
set wildignore+=*\\tmp\\*,*.exe            " Windows

" Visual shifting (does not exit Visual mode)
vnoremap < <gv
vnoremap > >gv
" Treat long lines as break lines (useful when moving around in them)
nmap j gj
nmap k gk
vmap j gj
vmap k gk

" :W sudo saves the file
" (useful for handling the permission-denied error)
command! W w !sudo tee % > /dev/null

" Change cursor shape for iTerm2 on macOS {
  " bar in Insert mode
  " inside iTerm2
  if $TERM_PROGRAM =~# 'iTerm'
    let &t_SI = "\<Esc>]50;CursorShape=1\x7"
    let &t_SR = "\<Esc>]50;CursorShape=2\x7"
    let &t_EI = "\<Esc>]50;CursorShape=0\x7"
  endif

  " inside tmux
  if exists('$TMUX')
    let &t_SI = "\<Esc>Ptmux;\<Esc>\<Esc>]50;CursorShape=1\x7\<Esc>\\"
    let &t_SR = "\<Esc>Ptmux;\<Esc>\<Esc>]50;CursorShape=2\x7\<Esc>\\"
    let &t_EI = "\<Esc>Ptmux;\<Esc>\<Esc>]50;CursorShape=0\x7\<Esc>\\"
  endif

  " inside neovim
  if has('nvim')
    let $NVIM_TUI_ENABLE_CURSOR_SHAPE=2
  endif
" }

set nobackup
set noswapfile
set nowritebackup

set foldenable
set foldmarker={,}
set foldlevel=0
set foldmethod=marker
" set foldcolumn=3
set foldlevelstart=99

set cursorline              " Highlight current line
set fileformats=unix,dos,mac        " Use Unix as the standard file type

set number                  " Line numbers on
silent! set relativenumber          " Relative numbers on
silent! set termguicolors

set fillchars=vert:\ ,stl:\ ,stlnc:\ 

highlight clear SignColumn  " SignColumn should match background
" highlight clear LineNr      " Current line number row will have same background color in relative mode

if has('unnamedplus')
  set clipboard=unnamedplus,unnamed
else
  set clipboard+=unnamed
endif

if has('persistent_undo')
    set undofile             " Persistent undo
    set undolevels=1000      " Maximum number of changes that can be undone
    set undoreload=10000     " Maximum number lines to save for undo on a buffer reload
endif

if has('gui_running')
  set guioptions-=r        " Hide the right scrollbar
  set guioptions-=L        " Hide the left scrollbar
  set guioptions-=T
  set guioptions-=e
  set shortmess+=c
  " No annoying sound on errors
  set noerrorbells
  set novisualbell
  set visualbell t_vb=
endif

" Key (re)Mappings {

    let g:mapleader = "\<Space>"
    let g:maplocalleader = ','

    " Basic {
        " Quit normal mode
        nnoremap <Leader>q  :q<CR>
        nnoremap <Leader>Q  :qa!<CR>
        " Move half page faster
        nnoremap <Leader>d  <C-d>
        nnoremap <Leader>u  <C-u>
        " Insert mode shortcut
        inoremap <C-h> <BS>
        inoremap <C-j> <Down>
        inoremap <C-k> <Up>
        inoremap <C-b> <Left>
        inoremap <C-f> <Right>
        " Bash like
        inoremap <C-a> <Home>
        inoremap <C-e> <End>
        inoremap <C-d> <Delete>
        cnoremap <C-a> <Home>
        cnoremap <C-e> <End>
        cnoremap <C-d> <Delete>
        " Command mode shortcut
        cnoremap <C-h> <BS>
        cnoremap <C-j> <Down>
        cnoremap <C-k> <Up>
        cnoremap <C-b> <Left>
        cnoremap <C-f> <Right>
        " jk | escaping
        inoremap jj <Esc>
        inoremap jk <Esc>
        cnoremap jj <C-c>
        cnoremap jk <C-c>
        " Quit visual mode
        vnoremap v <Esc>
        " Move to the start of line
        nnoremap H ^
        " Move to the end of line
        nnoremap L $
        " Redo
        nnoremap U <C-r>
        " Quick command mode
        nnoremap <CR> :
        " Yank to the end of line
        nnoremap Y y$
       " Auto indent pasted text
        " nnoremap p p=`]<C-o>
        " Open shell in vim
        map <Leader>' :shell<CR>
        " Search result highlight countermand
        nnoremap <Leader>sc :nohlsearch<CR>
        " Toggle pastemode
        nnoremap <Leader>tp :setlocal paste!<CR>
    " }

    " Buffer {
        nnoremap <Leader>bp :bprevious<CR>
        nnoremap <Leader>bn :bnext<CR>
        nnoremap <Leader>bf :bfirst<CR>
        nnoremap <Leader>bl :blast<CR>
        nnoremap <Leader>bd :bd<CR>
        nnoremap <Leader>bk :bw<CR>
    " }

    " File {
        " File save
        nnoremap <Leader>fs :update<CR>
    " }

    " Fold {
        for s:i in range(0, 9)
            execute 'nnoremap <Leader>f' . s:i . ' :set foldlevel=' . s:i . '<CR>'
        endfor
    " }

    " Window {
        nnoremap <Leader>ww <C-W>w
        nnoremap <Leader>wr <C-W>r
        nnoremap <Leader>wd <C-W>c
        nnoremap <Leader>wq <C-W>q
        nnoremap <Leader>wj <C-W>j
        nnoremap <Leader>wk <C-W>k
        nnoremap <Leader>wh <C-W>h
        nnoremap <Leader>wl <C-W>l
        nnoremap <Leader>wH <C-W>5<
        nnoremap <Leader>wL <C-W>5>
        nnoremap <Leader>wJ :resize +5<CR>
        nnoremap <Leader>wK :resize -5<CR>
        nnoremap <Leader>w= <C-W>=
        nnoremap <Leader>ws <C-W>s
        nnoremap <Leader>w- <C-W>s
        nnoremap <Leader>wv <C-W>v
        nnoremap <Leader>w2 <C-W>v
        nnoremap <Leader>w<Bar> <C-W>v
    " }

" }

" Colors {
    if empty(glob('~/.vim/colors/space-vim-dark.vim'))
        echo '==> Downloading space-vim-dark ......'
        execute '!curl -fLo ~/.vim/colors/space-vim-dark.vim --create-dirs ' .
                    \   'https://raw.githubusercontent.com/liuchengxu/space-vim-dark/master/colors/space-vim-dark.vim'
    endif
    color space-vim-dark
" }

" Statusline {
" ===================================================================================
" %< Where to truncate
" %n buffer number
" %F Full path
" %m Modified flag: [+], [-]
" %r Readonly flag: [RO]
" %y Type:          [vim]
" fugitive#statusline()
" %= Separator
" %-14.(...)
" %l Line
" %c Column
" %V Virtual column
" %P Percentage
" %#HighlightGroup#

let s:gui = has('gui_running')

function! S_buf_num()
    let l:circled_num_list = ['① ', '② ', '③ ', '④ ', '⑤ ', '⑥ ', '⑦ ', '⑧ ', '⑨ ', '⑩ ',
                \             '⑪ ', '⑫ ', '⑬ ', '⑭ ', '⑮ ', '⑯ ', '⑰ ', '⑱ ', '⑲ ', '⑳ ']

    return bufnr('%') > 20 ? bufnr('%') : l:circled_num_list[bufnr('%')-1]
endfunction

function! S_buf_total_num()
    return len(filter(range(1, bufnr('$')), 'buflisted(v:val)'))
endfunction

function! S_file_size(f)
    let l:size = getfsize(expand(a:f))
    if l:size == 0 || l:size == -1 || l:size == -2
        return ''
    endif
    if l:size < 1024
        return l:size.' bytes'
    elseif l:size < 1024*1024
        return printf('%.1f', l:size/1024.0).'k'
    elseif l:size < 1024*1024*1024
        return printf('%.1f', l:size/1024.0/1024.0) . 'm'
    else
        return printf('%.1f', l:size/1024.0/1024.0/1024.0) . 'g'
    endif
endfunction

function! S_full_path()
    if &filetype ==# 'startify'
        return ''
    else
        return expand('%:p:t')
    endif
endfunction

function! S_ale_error()
    if exists('g:loaded_ale')
        if exists('*ALEGetError')
            return !empty(ALEGetError())?ALEGetError():''
        endif
    endif
    return ''
endfunction

function! S_ale_warning()
    if exists('g:loaded_ale')
        if exists('*ALEGetWarning')
            return !empty(ALEGetWarning())?ALEGetWarning():''
        endif
    endif
    return ''
endfunction

function! S_fugitive()
    if exists('g:loaded_fugitive')
        let l:head = fugitive#head()
        return empty(l:head) ? '' : ' ⎇ '.l:head . ' '
    endif
    return ''
endfunction

function! S_gitgutter()
    if exists('b:gitgutter_summary')
        let l:summary = get(b:, 'gitgutter_summary')
        if l:summary[0] != 0 || l:summary[1] != 0 || l:summary[2] != 0
            return ' +'.l:summary[0].' ~'.l:summary[1].' -'.l:summary[2].' '
        endif
    endif
    return ''
endfunction

function! MyStatusLine()

    if s:gui
        let l:buf_num = '%1* [B-%n] ❖ %{winnr()} %*'
    else
        let l:buf_num = '%1* %{S_buf_num()} ❖ %{winnr()} %*'
    endif
    let l:tot = '%2*[TOT:%{S_buf_total_num()}]%*'
    let l:fs = '%3* %{S_file_size(@%)} %*'
    let l:fp = '%4* %{S_full_path()} %*'
    let l:paste = "%#paste#%{&paste?'⎈ paste ':''}%*"
    let l:ale_e = '%#ale_error#%{S_ale_error()}%*'
    let l:ale_w = '%#ale_warning#%{S_ale_warning()}%*'
    let l:git = '%6*%{S_fugitive()}%{S_gitgutter()}%*'
    let l:m_r_f = '%7* %m%r%y %*'
    let l:ff = '%8* %{&ff} |'
    let l:enc = " %{''.(&fenc!=''?&fenc:&enc).''} | %{(&bomb?\",BOM\":\"\")}"
    let l:pos = '%l:%c%V %*'
    let l:pct = '%9* %P %*'

    return l:buf_num.l:tot.'%<'.l:fs.l:fp.l:git.l:paste.l:ale_e.l:ale_w.
                \   '%='.l:m_r_f.l:ff.l:enc.l:pos.l:pct
endfunction
" See the statusline highlightings in s:post_user_config() of core/autoload/core_config.vim

" Note that the "%!" expression is evaluated in the context of the
" current window and buffer, while %{} items are evaluated in the
" context of the window that the statusline belongs to.
set statusline=%!MyStatusLine()

function! S_statusline_hi()
    hi StatusLine   term=bold,reverse ctermfg=140 ctermbg=237 guifg=#af87d7 guibg=#3a3a3a

    hi paste       cterm=bold ctermfg=149 ctermbg=239 gui=bold guifg=#99CC66 guibg=#3a3a3a
    hi ale_error   cterm=None ctermfg=197 ctermbg=237 gui=None guifg=#CC0033 guibg=#3a3a3a
    hi ale_warning cterm=None ctermfg=214 ctermbg=237 gui=None guifg=#FFFF66 guibg=#3a3a3a

    hi User1 cterm=bold ctermfg=232 ctermbg=178 gui=Bold guifg=#333300 guibg=#FFBF48
    hi User2 cterm=None ctermfg=221 ctermbg=243 gui=None guifg=#FFBB7D guibg=#666666
    hi User3 cterm=None ctermfg=251 ctermbg=241 gui=None guifg=#c6c6c6 guibg=#585858
    hi User4 cterm=Bold ctermfg=171 ctermbg=239 gui=Bold guifg=#d75fd7 guibg=#4e4e4e
    hi User5 cterm=None ctermfg=208 ctermbg=238 gui=None guifg=#ff8700 guibg=#3a3a3a
    hi User6 cterm=Bold ctermfg=184 ctermbg=237 gui=Bold guifg=#FFE920 guibg=#444444
    hi User7 cterm=None ctermfg=250 ctermbg=238 gui=None guifg=#bcbcbc guibg=#444444
    hi User8 cterm=None ctermfg=249 ctermbg=239 gui=None guifg=#b2b2b2 guibg=#4e4e4e
    hi User9 cterm=None ctermfg=249 ctermbg=241 gui=None guifg=#b2b2b2 guibg=#606060
endfunction

" User-defined highlightings shoule be put after colorscheme command.
call S_statusline_hi()

augroup STATUSLINE
    autocmd!
    autocmd ColorScheme * call S_statusline_hi()
augroup END
" }
