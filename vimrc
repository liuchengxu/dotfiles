let g:mapleader = "\<Space>"
let g:maplocalleader = ','

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

" Statusline
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

" Color
" ===================================================================================
color koehler
set background=dark         " Assume dark background

" refer to http://www.calmar.ws/vim/256-xterm-24bit-rgb-color-chart.html
let s:color_map = {
            \   0 : '#000000',  1 : '#800000',  2 : '#008000',  3 : '#808000',  4 : '#000080',  5 : '#800080',  6 : '#008080',  7 : '#c0c0c0',
            \   8 : '#808080',  9 : '#ff0000', 10 : '#00ff00', 11 : '#ffff00', 12 : '#0000ff', 13 : '#ff00ff', 14 : '#00ffff', 15 : '#ffffff',
            \
            \   16 : '#000000',  17 : '#00005f',  18 : '#000087',  19 : '#0000af',  20 : '#0000d7',  21 : '#0000ff',
            \   22 : '#005f00',  23 : '#005f5f',  24 : '#005f87',  25 : '#005faf',  26 : '#005fd7',  27 : '#005fff',
            \   28 : '#008700',  29 : '#00875f',  30 : '#008787',  31 : '#0087af',  32 : '#0087d7',  33 : '#0087ff',
            \   34 : '#00af00',  35 : '#00af5f',  36 : '#00af87',  37 : '#00afaf',  38 : '#00afd7',  39 : '#00afff',
            \   40 : '#00d700',  41 : '#00d75f',  42 : '#00d787',  43 : '#00d7af',  44 : '#00d7d7',  45 : '#00d7ff',
            \   46 : '#00ff00',  47 : '#00ff5f',  48 : '#00ff87',  49 : '#00ffaf',  50 : '#00ffd7',  51 : '#00ffff',
            \   52 : '#5f0000',  53 : '#5f005f',  54 : '#5f0087',  55 : '#5f00af',  56 : '#5f00d7',  57 : '#5f00ff',
            \   58 : '#5f5f00',  59 : '#5f5f5f',  60 : '#5f5f87',  61 : '#5f5faf',  62 : '#5f5fd7',  63 : '#5f5fff',
            \   64 : '#5f8700',  65 : '#5f875f',  66 : '#5f8787',  67 : '#5f87af',  68 : '#5f87d7',  69 : '#5f87ff',
            \   70 : '#5faf00',  71 : '#5faf5f',  72 : '#5faf87',  73 : '#5fafaf',  74 : '#5fafd7',  75 : '#5fafff',
            \   76 : '#5fd700',  77 : '#5fd75f',  78 : '#5fd787',  79 : '#5fd7af',  80 : '#5fd7d7',  81 : '#5fd7ff',
            \   82 : '#5fff00',  83 : '#5fff5f',  84 : '#5fff87',  85 : '#5fffaf',  86 : '#5fffd7',  87 : '#5fffff',
            \   88 : '#870000',  89 : '#87005f',  90 : '#870087',  91 : '#8700af',  92 : '#8700d7',  93 : '#8700ff',
            \   94 : '#875f00',  95 : '#875f5f',  96 : '#875f87',  97 : '#875faf',  98 : '#875fd7',  99 : '#875fff',
            \   100 : '#878700', 101 : '#87875f', 102 : '#878787', 103 : '#8787af', 104 : '#8787d7', 105 : '#8787ff',
            \   106 : '#87af00', 107 : '#87af5f', 108 : '#87af87', 109 : '#87afaf', 110 : '#87afd7', 111 : '#87afff',
            \   112 : '#87d700', 113 : '#87d75f', 114 : '#87d787', 115 : '#87d7af', 116 : '#87d7d7', 117 : '#87d7ff',
            \   118 : '#87ff00', 119 : '#87ff5f', 120 : '#87ff87', 121 : '#87ffaf', 122 : '#87ffd7', 123 : '#87ffff',
            \   124 : '#af0000', 125 : '#af005f', 126 : '#af0087', 127 : '#af00af', 128 : '#af00d7', 129 : '#af00ff',
            \   130 : '#af5f00', 131 : '#af5f5f', 132 : '#af5f87', 133 : '#af5faf', 134 : '#af5fd7', 135 : '#af5fff',
            \   136 : '#af8700', 137 : '#af875f', 138 : '#af8787', 139 : '#af87af', 140 : '#af87d7', 141 : '#af87ff',
            \   142 : '#afaf00', 143 : '#afaf5f', 144 : '#afaf87', 145 : '#afafaf', 146 : '#afafd7', 147 : '#afafff',
            \   148 : '#afd700', 149 : '#afd75f', 150 : '#afd787', 151 : '#afd7af', 152 : '#afd7d7', 153 : '#afd7ff',
            \   154 : '#afff00', 155 : '#afff5f', 156 : '#afff87', 157 : '#afffaf', 158 : '#afffd7', 159 : '#afffff',
            \   160 : '#d70000', 161 : '#d7005f', 162 : '#d70087', 163 : '#d700af', 164 : '#d700d7', 165 : '#d700ff',
            \   166 : '#d75f00', 167 : '#d75f5f', 168 : '#d75f87', 169 : '#d75faf', 170 : '#d75fd7', 171 : '#d75fff',
            \   172 : '#d78700', 173 : '#d7875f', 174 : '#d78787', 175 : '#d787af', 176 : '#d787d7', 177 : '#d787ff',
            \   178 : '#d7af00', 179 : '#d7af5f', 180 : '#d7af87', 181 : '#d7afaf', 182 : '#d7afd7', 183 : '#d7afff',
            \   184 : '#d7d700', 185 : '#d7d75f', 186 : '#d7d787', 187 : '#d7d7af', 188 : '#d7d7d7', 189 : '#d7d7ff',
            \   190 : '#d7ff00', 191 : '#d7ff5f', 192 : '#d7ff87', 193 : '#d7ffaf', 194 : '#d7ffd7', 195 : '#d7ffff',
            \   196 : '#ff0000', 197 : '#ff005f', 198 : '#ff0087', 199 : '#ff00af', 200 : '#ff00d7', 201 : '#ff00ff',
            \   202 : '#ff5f00', 203 : '#ff5f5f', 204 : '#ff5f87', 205 : '#ff5faf', 206 : '#ff5fd7', 207 : '#ff5fff',
            \   208 : '#ff8700', 209 : '#ff875f', 210 : '#ff8787', 211 : '#ff87af', 212 : '#ff87d7', 213 : '#ff87ff',
            \   214 : '#ffaf00', 215 : '#ffaf5f', 216 : '#ffaf87', 217 : '#ffafaf', 218 : '#ffafd7', 219 : '#ffafff',
            \   220 : '#ffd700', 221 : '#ffd75f', 222 : '#ffd787', 223 : '#ffd7af', 224 : '#ffd7d7', 225 : '#ffd7ff',
            \   226 : '#ffff00', 227 : '#ffff5f', 228 : '#ffff87', 229 : '#ffffaf', 230 : '#ffffd7', 231 : '#ffffff',
            \
            \   232 : '#080808', 233 : '#121212', 234 : '#1c1c1c', 235 : '#262626', 236 : '#303030', 237 : '#3a3a3a',
            \   238 : '#444444', 239 : '#4e4e4e', 240 : '#585858', 241 : '#606060', 242 : '#666666', 243 : '#767676',
            \   244 : '#808080', 245 : '#8a8a8a', 246 : '#949494', 247 : '#9e9e9e', 248 : '#a8a8a8', 249 : '#b2b2b2',
            \   250 : '#bcbcbc', 251 : '#c6c6c6', 252 : '#d0d0d0', 253 : '#dadada', 254 : '#e4e4e4', 255 : '#eeeeee',
            \   }

function! s:hi(item, fg, bg, cterm_style, gui_style)
    if !empty(a:fg)
        execute printf('hi %s ctermfg=%d guifg=%s', a:item, a:fg, s:color_map[a:fg])
    endif
    if !empty(a:bg)
        execute printf('hi %s ctermbg=%d guibg=%s', a:item, a:bg, s:color_map[a:bg])
    endif
    execute printf('hi %s cterm=%s gui=%s', a:item, a:cterm_style, a:gui_style)
endfunction

" call s:hi(item, fg, bg, cterm_style, gui_style)

let s:n_bg = 235

call s:hi('Normal' , 249 , s:n_bg , 'None' , 'None' )
hi Normal       guibg=#292b2e

call s:hi('Cursor' , 88 , 214 , 'bold' , 'bold')
hi Cursor       guifg=#330033 guibg=#FF9331

call s:hi('LineNr'       , 238 , s:n_bg-1 , 'None' , 'None' )
call s:hi('CursorLine'   , ''  , s:n_bg-1 , 'None' , 'None' )
call s:hi('CursorLineNr' , 134 , s:n_bg-1 , 'None' , 'None' )
call s:hi('CursorColumn' , ''  , s:n_bg-1 , 'None' , 'None')
hi LineNr       guifg=#44505c guibg=#212026
hi CursorLine                 guibg=#212026
hi CursorLineNr               guibg=#212026
hi CursorColumn               guibg=#212026

" bug. opposite here.
call s:hi('StatusLine'   , 140 , s:n_bg+2 , 'None' , 'None')
call s:hi('StatusLineNC' , 244 , s:n_bg+1 , 'None' , 'None')
hi StatusLineNC guibg=#3a3a3a

call s:hi('TabLine'     , 66  , s:n_bg+3 , 'None' , 'None')
call s:hi('TabLineSel'  , 178 , s:n_bg+4 , 'None' , 'None')
call s:hi('TabLineFill' , 145 , s:n_bg+2 , 'None' , 'None')

call s:hi('WildMenu' , 169 , s:n_bg+1 , 'bold' , 'bold')
hi WildMenu guifg=#FF4848

call s:hi('Boolean'     , 135 , '' , 'None' , 'None')
call s:hi('Character'   , 75  , '' , 'None' , 'None')
call s:hi('Number'      , 111 , '' , 'None' , 'None')
call s:hi('Float'       , 135 , '' , 'None' , 'None')
call s:hi('String'      , 36  , '' , 'None' , 'None')
call s:hi('Conditional' , 134 , '' , 'bold' , 'bold')
call s:hi('Constant'    , 135 , '' , 'bold' , 'bold')
call s:hi('Debug'       , 225 , '' , 'bold' , 'bold')
call s:hi('Define'      , 177  , '' , 'None' , 'None')
call s:hi('Delimiter'   , 241 , '' , 'None' , 'None')
hi Boolean         guifg=#FF68DD
hi Character       guifg=#FF62B0
hi Number          guifg=#E697E6
hi Float           guifg=#B7B7FF
hi String          guifg=#20af81
hi Conditional     guifg=#9191FF
hi Constant        guifg=#7BA7E1
hi Debug           guifg=#FFC8C8
hi Define          guifg=#D881ED
hi Delimiter       guifg=#74BAAC

call s:hi('DiffAdd'    , ''  , 24  , 'None' , 'None')
call s:hi('DiffChange' , 181 , 239 , 'None' , 'None')
call s:hi('DiffDelete' , 162 , 53  , 'None' , 'None')
call s:hi('DiffText'   , ''  , 102 , 'None' , 'None')

call s:hi('Directory'  , 67  , ''  , 'bold' , 'bold')
call s:hi('Exception'  , 137 , ''  , 'bold' , 'bold')
call s:hi('FoldColumn' , 67  , 16  , 'None' , 'None')
call s:hi('Folded'     , 67  , 16  , 'Bold' , 'Bold')
call s:hi('Function'   , 168 , ''  , 'bold' , 'bold')
call s:hi('Identifier' , 98  , ''  , 'None' , 'None')
call s:hi('Ignore'     , 244 , 233 , 'None' , 'None')
call s:hi('Operator'   , 67 , ''  , 'None' , 'None')
hi Folded       guifg=#59955C guibg=#273746
hi Function     guifg=#bc6ec5
hi Identifier   guifg=#E994AB
hi Identifier   guifg=#5f87d7
hi Ignore       guifg=#B4D1B6
hi Operator     guifg=#25A0C5

call s:hi('PreCondit' , 139 , '' , 'None' , 'None')
call s:hi('PreProc'   , 176  , '' , 'None' , 'None')
call s:hi('Question'  , 81  , '' , 'None' , 'None')
call s:hi('Repeat'    , 31  , '' , 'bold' , 'bold')
hi PreCondit    guifg=#D698FE
hi PreProc      guifg=#DD75DD
hi Question     guifg=#F9BB00
hi Repeat       guifg=#8282FF

call s:hi('Keyword' , 62  , '' , 'bold' , 'bold,italic')
call s:hi('Label'   , 104 , '' , 'None' , 'None')
call s:hi('Macro'   , 110 , '' , 'None' , 'None')
hi keyword      guifg=#E469FE
hi Label        guifg=#DFB0FF
hi Macro        guifg=#8C8CFF

call s:hi('Search'    , 16 , 76 , 'bold' , 'bold')
call s:hi('IncSearch' , 16 , 76 , 'bold' , 'bold')
call s:hi('MatchParen', 10, s:n_bg-1, 'bold,underline', 'bold,underline')
hi Search       guifg=#292b2e guibg=#86dc2f
hi MatchParen   guifg=#00ff00 guibg=NONE

call s:hi('ModeMsg'  , 229 , '' , 'None' , 'None')
hi ModeMsg guifg=#FFF06A guibg=None

" Popup menu
call s:hi('Pmenu'      , 141 , 236 , 'None' , 'None')
call s:hi('PmenuSel'   , 251 , 97  , 'None' , 'None')
call s:hi('PmenuSbar'  , 28  , 233 , 'None' , 'None')
call s:hi('PmenuThumb' , 160 , 97  , 'None' , 'None')
hi Pmenu        guifg=#9a9aba guibg=#34323e
hi PmenuSbar    guifg=#C269FE guibg=#303030

" SignColumn may relate to ale sign
call s:hi('SignColumn' , 118 , s:n_bg , 'None' , 'None')
call s:hi('Todo'       , 172 , s:n_bg , 'bold' , 'bold')
hi Todo         guibg=NONE
hi SignColumn   guibg=NONE

" VertSplit consistent with normal background to hide it
call s:hi('VertSplit' , s:n_bg , s:n_bg , 'None' , 'None')
hi VertSplit    guibg=NONE

call s:hi('Warning'    , 222 , s:n_bg , 'bold' , 'bold')
call s:hi('WarningMsg' , 222 , s:n_bg , 'bold' , 'bold')
hi Warning      guifg=#dc752f guibg=NONE
hi WarningMsg   guifg=#dc752f guibg=NONE

call s:hi('Error'    , 160 , s:n_bg , 'bold' , 'bold')
call s:hi('ErrorMsg' , 196 , s:n_bg , 'bold' , 'bold')
hi Error        guifg=#e0211d guibg=NONE
hi ErrorMsg     guifg=#e0211d guibg=NONE

call s:hi('Special'        , 81  , '' , 'None' , 'None')
call s:hi('SpecialKey'     , 59  , '' , 'None' , 'None')
call s:hi('SpecialChar'    , 171 , '' , 'bold' , 'bold')
call s:hi('SpecialComment' , 245 , '' , 'bold' , 'bold')
hi Special        guifg=#DD75DD
hi SpecialKey     guifg=#FF73B9
hi SpecialChar    guifg=#6094DB
hi SpecialComment guifg=#ED9EFE

" marks column
call s:hi('SpellBad'   , 168 , '' , 'underline'    , 'undercurl')
call s:hi('SpellCap'   , 110 , '' , 'underline'    , 'undercurl')
call s:hi('SpellLocal' , 253 , '' , 'underline'    , 'undercurl')
call s:hi('SpellRare'  , 218 , '' , 'underline'    , 'undercurl')

call s:hi('Statement' , 68 , '' , 'bold' , 'bold')
hi Statement guifg=#4f97d7

call s:hi('Tag'          , 161 , ''  , 'None' , 'None')
call s:hi('Title'        , 176 , ''  , 'None' , 'None')
call s:hi('Structure'    , 81  , ''  , 'None' , 'None')
call s:hi('StorageClass' , 208 , ''  , 'None' , 'None')
hi Tag          guifg=#E469FE
hi Title        guifg=#DD75DD
hi Structure    guifg=#E37795
hi StorageClass guifg=#D881ED

call s:hi('Type'       , 81 , '' , 'None'      , 'None')
call s:hi('Typedef'    , 81 , '' , 'None'      , 'None')
call s:hi('Underlined' , '' , '' , 'underline' , 'underline')
hi Type         guifg=#ce537a
hi Typedef      guifg=#ce537a

call s:hi('Visual'    , '' , s:n_bg+3 , 'None' , 'None')
call s:hi('VisualNOS' , '' , 238      , 'None' , 'None')
hi Visual guibg=#544A65

call s:hi('Comment'  , 30  , ''  , 'None' , 'italic')
hi Comment guifg=#2aa1ae

" tilde group
call s:hi('NonText' , 241 , '' , 'None' , 'None')

delf s:hi
unlet s:color_map s:n_bg

" User-defined highlightings shoule be put after colorscheme command.
call S_statusline_hi()

augroup STATUSLINE
    autocmd!
    autocmd ColorScheme * call S_statusline_hi()
augroup END
