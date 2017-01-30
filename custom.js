// Cusotomization for https://github.com/lambdalisue/jupyter-vim-binding
// postioned at ~/.jupyter/custom/custom.js
// Configure CodeMirror
require([
    'nbextensions/vim_binding/vim_binding',   // depends your installation
], function() {
    // Map jj/jk/kk to <Esc>
    CodeMirror.Vim.map("jj", "<Esc>", "insert");
    CodeMirror.Vim.map("jk", "<Esc>", "insert");
    CodeMirror.Vim.map("kk", "<Esc>", "insert");

    // Swap j/k and gj/gk (Note that <Plug> mappings)
    CodeMirror.Vim.map("j", "<Plug>(vim-binding-gj)", "normal");
    CodeMirror.Vim.map("k", "<Plug>(vim-binding-gk)", "normal");
    CodeMirror.Vim.map("gj", "<Plug>(vim-binding-j)", "normal");
    CodeMirror.Vim.map("gk", "<Plug>(vim-binding-k)", "normal");

    CodeMirror.Vim.map("H", "<Plug>(vim-binding-0)", "normal");
    CodeMirror.Vim.map("L", "<Plug>(vim-binding-$)", "normal");
});
