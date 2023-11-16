silent! if plug#begin('~/.vim/plugged')
    Plug 'junegunn/vim-easy-align',       { 'on': ['<Plug>(EasyAlign)', 'EasyAlign'] }

    Plug 'neoclide/coc.nvim', {'branch': 'release'}

    Plug 'romainl/vim-cool'

    " Edit
    Plug 'tpope/vim-repeat'
    Plug 'tpope/vim-surround'

    " Lint
    Plug 'dense-analysis/ale'

    Plug 'liuchengxu/eleline.vim'
    Plug 'liuchengxu/space-vim-theme'
    Plug 'liuchengxu/vim-better-default'
    Plug 'liuchengxu/vim-clap'
    Plug 'liuchengxu/vim-which-key'
    Plug 'liuchengxu/vista.vim'

    call plug#end()
endif

set termguicolors
color space_vim_theme

let g:mapleader      = "\<Space>"
let g:maplocalleader = ','

nnoremap <Leader>rc :%s/\<<C-R><C-W>\>/<C-R><C-W>

" Disable ALE by default, can be enabled again later.
let g:ale_enabled = 0
let g:ale_hover_cursor = v:false

let g:coc_global_extensions = ['coc-rust-analyzer', 'coc-explorer']

" Use tab for trigger completion with characters ahead and navigate
" NOTE: There's always complete item selected by default, you may want to enable
" no select by `"suggest.noselect": true` in your configuration file
" NOTE: Use command ':verbose imap <tab>' to make sure tab is not mapped by
" other plugin before putting this into your config
inoremap <silent><expr> <TAB>
    \ coc#pum#visible() ? coc#pum#next(1) :
    \ CheckBackspace() ? "\<Tab>" :
    \ coc#refresh()
inoremap <expr><S-TAB> coc#pum#visible() ? coc#pum#prev(1) : "\<C-h>"

" Make <CR> to accept selected completion item or notify coc.nvim to format
" <C-g>u breaks current undo, please make your own choice
inoremap <silent><expr> <CR> coc#pum#visible() ? coc#pum#confirm()
                            \: "\<C-g>u\<CR>\<c-r>=coc#on_enter()\<CR>"

function! CheckBackspace() abort
    let col = col('.') - 1
    return !col || getline('.')[col - 1]  =~# '\s'
endfunction

hi! link CocHighlightText Pmemu

nmap <silent> gd <Plug>(coc-definition)
nmap <silent> gy <Plug>(coc-type-definition)
nmap <silent> gi <Plug>(coc-implementation)
nmap <silent> gr <Plug>(coc-references)

augroup X
    autocmd!

    autocmd BufEnter * call s:OnBufEnter()
    autocmd VimEnter * call s:OnVimEnter()
    autocmd FileType qf call Qf()

    autocmd BufEnter *.rs,*.go call s:AutoPairs()
augroup END

" https://vi.stackexchange.com/questions/8534/make-cnext-and-cprevious-loop-back-to-the-begining
function! CycleQuickfix(action, fallback) abort
  try
    execute a:action
  catch
    execute a:fallback
  finally
    normal! zz
  endtry
endfunction

function! Qf() abort
    nnoremap <silent> ]q :<c-u>call CycleQuickfix('cnext', 'cfirst')<CR>
    nnoremap <silent> [q :<c-u>call CycleQuickfix('cprev', 'clast')<CR>

    " Location
    nnoremap <silent> ]l :<c-u>call CycleQuickfix('lnext', 'lfirst')<CR>
    nnoremap <silent> [l :<c-u>call CycleQuickfix('lprev', 'llast')<CR>

    nnoremap <silent> <buffer> q :cclose<bar>:lclose<CR>
    nnoremap <buffer> <CR> <CR>

    setlocal nowrap
endfunction

function! s:AutoPairs() abort
    inoremap <buffer> { {}<Esc>ha
    inoremap <buffer> ( ()<Esc>ha
    inoremap <buffer> [ []<Esc>ha
    inoremap <buffer> < <><Esc>ha
    inoremap <buffer> " ""<Esc>ha
    inoremap <buffer> ' ''<Esc>ha
    inoremap <buffer> ` ``<Esc>ha
endfunction

function! s:OnBufEnter() abort
    " Restore cursor position when opening file
    if line("'\"") > 1 && line("'\"") <= line('$')
        execute "normal! g`\""
    endif

    if &buftype ==# 'nofile' || index(['clap_input'], &filetype) == -1
        return
    endif
endfunction

function! s:OnVimEnter() abort
    hi! link CocInlayHint Pmenu

    " Reset wildmode for wildoptions=pum as changing it somehow invalids
    " cmdline pum.
    set wildmode&

    set norelativenumber
    set wrap
endfunction

" Find why vim is slow?
" 1. :ProfileStart
" 2. do the slow operation.
" 3. :ProfileStop
" 4. open profile.log
function! ProfileStart() abort
  profile start profile.log
  profile func *
  profile file *
  set verbosefile=verbose.log
  set verbose=9
endfunction

function! ProfileStop() abort
  profile pause
  noautocmd wqa!
endfunction

command! ProfileStart call ProfileStart()
command! ProfileStop  call ProfileStop()

let g:eleline_slim = v:true
let g:clap_plugin_experimental = v:true
let g:clap_enable_icon = v:true
let g:clap_theme = 'material_theme_dark'
let g:clap_provider_quick_open = {
            \ 'source': [
            \    '~/.vimrc',
            \    '~/.config/alacritty/alacritty.toml',
            \    '~/.config/nvim/init.vim',
            \    '~/.config/wezterm/wezterm.lua',
            \ ],
            \ 'sink': 'e',
            \ }

let g:clap_provider_clap_actions = {
            \ 'source': { -> get(g:, 'clap_actions', []) },
            \ 'sink': { line -> clap#client#notify(line, []) },
            \ }

function! ClapAction(bang, action) abort
  call clap#client#notify(a:action, [])
endfunction

command! -bang -nargs=* -bar -range -complete=customlist,ClapActionList ClapAction call ClapAction(<bang>0, <f-args>)

function! ClapActionList(A, L, P) abort
  if !exists('g:clap_actions')
      echoerr '`g:clap_actions` not found'
      return []
  endif
  if empty(a:A)
    return g:clap_actions
  else
    return filter(g:clap_actions, printf('v:val =~ "^%s"', a:A))
  endif
endfunction

function! ClapCopyToClipboard(...) abort
  if get(a:000, 0, v:null) is v:null
    let selection = clap#util#get_visual_selection()
  else
    let selection = a:000[0]
  endif
  call clap#client#notify('__copy-to-clipboard', [string(selection)])
endfunction

nnoremap <C-c> :call ClapCopyToClipboard()<CR>
""" Search files
nnoremap <C-f> :Clap files<CR>
""" Grep
nnoremap <C-p> :Clap grep<CR>

nnoremap <LocalLeader>v :Clap quick_open<CR>
nnoremap <LocalLeader>= :ClapAction linter/format<CR>

""" en: jump to Next error
nnoremap <Leader>en :ClapAction linter/next-error<CR>
""" ep: jump to Prev error
nnoremap <Leader>ep :ClapAction linter/prev-error<CR>
""" wn: jump to Next warning
nnoremap <Leader>wn :ClapAction linter/next-warn<CR>
""" wp: jump to Prev warning
nnoremap <Leader>wp :ClapAction linter/prev-warn<CR>
""" sb: search lines in current Buffer
nnoremap <Leader>sb :Clap blines<CR>
""" sr: search Recent files
nnoremap <Leader>sr :Clap recent_files<CR>
""" ft: Toggle file explorer
nnoremap <Leader>ft :call execute(printf('CocCommand explorer --toggle --width=%d', &columns/5))<CR>
""" fd: Find file in explorer
nnoremap <Leader>fd :call execute(printf('CocCommand explorer --reveal %s --width=%d', expand('%:p'), &columns/5))<CR>
""" pw: grep Word under cursor
nnoremap <Leader>pw :call execute(printf('Clap grep --query \"%s', expand('<cword>')))<CR>

set timeoutlen=500
nnoremap <silent> <Leader> :WhichKey '<Space>'<CR>
nnoremap <silent> <LocalLeader> :WhichKey ','<CR>

augroup XLC
    autocmd!

    autocmd VimEnter * call which_key#register('<Space>', 'g:which_key_map')
    autocmd VimEnter * call clap#client#notify('__configure-vim-which-key',[
                \ 'g:which_key_map',
                \ expand('~/.vimrc'),
                \ expand('~/.vim/plugged/vim-better-default/plugin/default.vim'),
                \ ])
augroup END
