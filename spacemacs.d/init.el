;; -*- mode: emacs-lisp -*-
;; This file is loaded by Spacemacs at startup.
;; It must be stored in your home directory.

(defun dotspacemacs/layers ()
  "Configuration Layers declaration.
You should not put any user code in this function besides modifying the variable
values."
  (setq-default
   ;; Base distribution to use. This is a layer contained in the directory
   ;; `+distribution'. For now available distributions are `spacemacs-base'
   ;; or `spacemacs'. (default 'spacemacs)
   dotspacemacs-distribution 'spacemacs
   ;; List of additional paths where to look for configuration layers.
   ;; Paths must have a trailing slash (i.e. `~/.mycontribs/')
   dotspacemacs-configuration-layer-path '()
   ;; List of configuration layers to load. If it is the symbol `all' instead
   ;; of a list then all discovered layers will be installed.
   dotspacemacs-configuration-layers
   '(
     vimscript
     ;; ----------------------------------------------------------------
     ;; Example of useful layers you may want to use right away.
     ;; Uncomment some layer names and press <SPC f e R> (Vim style) or
     ;; <M-m f e R> (Emacs style) to install them.
     ;; ----------------------------------------------------------------
     (auto-completion :variables
                      auto-completion-enable-help-tooltip t
                      auto-completion-return-key-behavior 'complete
                      auto-completion-tab-key-behavior 'complete)
     better-defaults
     (c-c++ :variables
            c-c++-enable-clang-support t)
     (colors :variables
             colors-enable-nyan-cat-progress-bar t)
     emacs-lisp
     emoji
     ;; eyebrowse
     html
     (git :variables
          git-enable-github-support t)
     (latex :variables
            latex-enable-auto-fill nil)
     markdown
     graphviz
     scala
     org
     osx
     python
     scheme
     ;; (ranger :variables
             ;; ranger-show-preview t
             ;; ranger-cleanup-eagerly t)
     ;; semantic
     (shell :variables
            shell-default-height 30
            shell-default-position 'bottom)
     spell-checking
     (syntax-checking :variables
                      syntax-checking-enable-tooltips t)
     version-control
     ycmd
     )
   ;; List of additional packages that will be installed without being
   ;; wrapped in a layer. If you need some configuration for these
   ;; packages then consider to create a layer, you can also put the
   ;; configuration in `dotspacemacs/config'.
   dotspacemacs-additional-packages '(key-chord
                                      )
   ;; show relative line number
   dotspacemacs-line-numbers 'relative
   ;; A list of packages and/or extensions that will not be install and loaded.
   dotspacemacs-excluded-packages '(git-gutter
                                    git-gutter-fringe)
   ;; If non-nil spacemacs will delete any orphan packages, i.e. packages that
   ;; are declared in a layer which is not a member of
   ;; the list `dotspacemacs-configuration-layers'. (default t)
   dotspacemacs-delete-orphan-packages t))

(defun dotspacemacs/init ()
  "Initialization function.
This function is called at the very startup of Spacemacs initialization
before layers configuration.
You should not put any user code in there besides modifying the variable
values."
  ;; This setq-default sexp is an exhaustive list of all the supported
  ;; spacemacs settings.
  (setq-default
   ;; One of `vim', `emacs' or `hybrid'. Evil is always enabled but if the
   ;; variable is `emacs' then the `holy-mode' is enabled at startup. `hybrid'
   ;; uses emacs key bindings for vim's insert mode, but otherwise leaves evil
   ;; unchanged. (default 'vim)
   dotspacemacs-editing-style 'vim
   ;; If non nil output loading progress in `*Messages*' buffer. (default nil)
   dotspacemacs-verbose-loading nil
   ;; Specify the startup banner. Default value is `official', it displays
   ;; the official spacemacs logo. An integer value is the index of text
   ;; banner, `random' chooses a random text banner in `core/banners'
   ;; directory. A string value must be a path to an image format supported
   ;; by your Emacs build.
   ;; If the value is nil then no banner is displayed. (default 'official)
   dotspacemacs-startup-banner 'official
   ;; List of items to show in the startup buffer. If nil it is disabled.
   ;; Possible values are: `recents' `bookmarks' `projects'.
   ;; (default '(recents projects))
   dotspacemacs-startup-lists '(recents projects)
   ;; List of themes, the first of the list is loaded when spacemacs starts.
   ;; Press <SPC> T n to cycle to the next theme in the list (works great
   ;; with 2 themes variants, one dark and one light)
   dotspacemacs-themes '(
                         spacemacs-dark
                         monokai
                         apropospriate-dark
                         spacemacs-light
                         solarized-light
                         solarized-dark
                         spolsky
                         leuven
                         grandshell
                         farmhouse-dark
                         afternoon
                         molokai
                         zenburn)
   ;; If non nil the cursor color matches the state color.
   dotspacemacs-colorize-cursor-according-to-state t
   ;; Default font. `powerline-scale' allows to quickly tweak the mode-line
   ;; size to make separators look not too crappy.
   dotspacemacs-default-font '("Source Code Pro for Powerline"
   ;; dotspacemacs-default-font '("Cousine for Powerline"
                               :size 13
                               ;; :weight normal
                               :weight light
                               :width normal
                               :powerline-scale 1.1)
   ;; The leader key
   dotspacemacs-leader-key "SPC"
   ;; The leader key accessible in `emacs state' and `insert state'
   ;; (default "M-m")
   dotspacemacs-emacs-leader-key "M-m"
   ;; Major mode leader key is a shortcut key which is the equivalent of
   ;; pressing `<leader> m`. Set it to `nil` to disable it. (default ",")
   dotspacemacs-major-mode-leader-key ","
   ;; Major mode leader key accessible in `emacs state' and `insert state'.
   ;; (default "C-M-m)
   dotspacemacs-major-mode-emacs-leader-key "C-M-m"
   ;; The command key used for Evil commands (ex-commands) and
   ;; Emacs commands (M-x).
   ;; By default the command key is `:' so ex-commands are executed like in Vim
   ;; with `:' and Emacs commands are executed with `<leader> :'.
   dotspacemacs-command-key ":"
   ;; If non nil `Y' is remapped to `y$'. (default t)
   dotspacemacs-remap-Y-to-y$ t
   ;; Location where to auto-save files. Possible values are `original' to
   ;; auto-save the file in-place, `cache' to auto-save the file to another
   ;; file stored in the cache directory and `nil' to disable auto-saving.
   ;; (default 'cache)
   dotspacemacs-auto-save-file-location 'cache
   ;; If non nil then `ido' replaces `helm' for some commands. For now only
   ;; `find-files' (SPC f f), `find-spacemacs-file' (SPC f e s), and
   ;; `find-contrib-file' (SPC f e c) are replaced. (default nil)
   dotspacemacs-use-ido nil
   ;; If non nil, `helm' will try to miminimize the space it uses. (default nil)
   dotspacemacs-helm-resize nil
   ;; if non nil, the helm header is hidden when there is only one source.
   ;; (default nil)
   dotspacemacs-helm-no-header nil
   ;; define the position to display `helm', options are `bottom', `top',
   ;; `left', or `right'. (default 'bottom)
   dotspacemacs-helm-position 'bottom
   ;; If non nil the paste micro-state is enabled. When enabled pressing `p`
   ;; several times cycle between the kill ring content. (default nil)
   dotspacemacs-enable-paste-micro-state nil
   ;; Which-key delay in seconds. The which-key buffer is the popup listing
   ;; the commands bound to the current keystroke sequence. (default 0.4)
   dotspacemacs-which-key-delay 0.4
   ;; Which-key frame position. Possible values are `right', `bottom' and
   ;; `right-then-bottom'. right-then-bottom tries to display the frame to the
   ;; right; if there is insufficient space it displays it at the bottom.
   ;; (default 'bottom)
   dotspacemacs-which-key-position 'bottom
   ;; If non nil a progress bar is displayed when spacemacs is loading. This
   ;; may increase the boot time on some systems and emacs builds, set it to
   ;; nil to boost the loading time. (default t)
   dotspacemacs-loading-progress-bar t
   ;; If non nil the frame is fullscreen when Emacs starts up. (default nil)
   ;; (Emacs 24.4+ only)
   dotspacemacs-fullscreen-at-startup t
   ;; If non nil `spacemacs/toggle-fullscreen' will not use native fullscreen.
   ;; Use to disable fullscreen animations in OSX. (default nil)
   dotspacemacs-fullscreen-use-non-native nil
   ;; If non nil the frame is maximized when Emacs starts up.
   ;; Takes effect only if `dotspacemacs-fullscreen-at-startup' is nil.
   ;; (default nil) (Emacs 24.4+ only)
   dotspacemacs-maximized-at-startup nil
   ;; A value from the range (0..100), in increasing opacity, which describes
   ;; the transparency level of a frame when it's active or selected.
   ;; Transparency can be toggled through `toggle-transparency'. (default 90)
   dotspacemacs-active-transparency 90
   ;; A value from the range (0..100), in increasing opacity, which describes
   ;; the transparency level of a frame when it's inactive or deselected.
   ;; Transparency can be toggled through `toggle-transparency'. (default 90)
   dotspacemacs-inactive-transparency 90
   ;; If non nil unicode symbols are displayed in the mode line. (default t)
   dotspacemacs-mode-line-unicode-symbols t
   ;; If non nil smooth scrolling (native-scrolling) is enabled. Smooth
   ;; scrolling overrides the default behavior of Emacs which recenters the
   ;; point when it reaches the top or bottom of the screen. (default t)
   dotspacemacs-smooth-scrolling t
   ;; If non-nil smartparens-strict-mode will be enabled in programming modes.
   ;; (default nil)
   dotspacemacs-smartparens-strict-mode nil
   ;; Select a scope to highlight delimiters. Possible values are `any',
   ;; `current', `all' or `nil'. Default is `all' (highlight any scope and
   ;; emphasis the current one). (default 'all)
   dotspacemacs-highlight-delimiters 'all
   ;; If non nil advises quit functions to keep server open when quitting.
   ;; (default nil)
   dotspacemacs-persistent-server nil
   ;; List of search tool executable names. Spacemacs uses the first installed
   ;; tool of the list. Supported tools are `ag', `pt', `ack' and `grep'.
   ;; (default '("ag" "pt" "ack" "grep"))
   dotspacemacs-search-tools '("ag" "pt" "ack" "grep")
   ;; The default package repository used if no explicit repository has been
   ;; specified with an installed package.
   ;; Not used for now. (default nil)
   dotspacemacs-default-package-repository nil
   ))

(defun dotspacemacs/user-init ()
  "Initialization function for user code.
It is called immediately after `dotspacemacs/init'.  You are free to put any
user code."
  (setq configuration-layer--elpa-archives
        '(("melpa-cn" . "http://mirrors.tuna.tsinghua.edu.cn/elpa/melpa/")
          ("org-cn"   . "http://mirrors.tuna.tsinghua.edu.cn/elpa/org/")
          ("gnu-cn"   . "http://mirrors.tuna.tsinghua.edu.cn/elpa/gnu/")))
  ;; solution for initialization delay
  (setq exec-path-from-shell-arguments '("-l"))
  ;; https://github.com/syl20bnr/spacemacs/issues/2705
  ;; (setq tramp-mode nil)
  (setq tramp-ssh-controlmaster-options
        "-o ControlMaster=auto -o ControlPath='tramp.%%C' -o ControlPersist=no")

  (setq python-shell-interpreter "~/anaconda3/bin/python")
  ;; (setq python-shell-exec-path "~/anaconda3/bin")


  (setq-default tab-width 4)
  (add-hook 'c++-mode-hook (lambda ()
                             (electric-indent-local-mode -1)))
  )

(defun dotspacemacs/user-config ()
  "Configuration function for user code.
 This function is called at the very end of Spacemacs initialization after
layers configuration. You are free to put any user code."

  (fringe-mode 0)
  ;; (setq linum-format "%d ")

  ;; ;; (add-to-list 'custom-theme-load-path "~/.emacs.d/private/themes/emacs")
  ;; (load-theme 'dracula t)
  (setq powerline-default-separator 'slant)

  (setq evil-emacs-state-cursor '("red" box))
  (setq evil-replace-state-cursor '("red" bar))
  (setq evil-operator-state-cursor '("red" hollow))

  ;; consistent with spaceline
  (setq evil-normal-state-cursor '("orange" box))
  (setq evil-insert-state-cursor '("green" bar))
  (setq evil-visual-state-cursor '("gray" box))

  ;; Remapping
  ;; Map <leader>d to evil-scroll-down
  (spacemacs/set-leader-keys "d" 'evil-scroll-down)
  ;; Map <leader>u to evil-scroll-down
  (spacemacs/set-leader-keys "u" 'evil-scroll-up)

  (spacemacs/set-leader-keys "w|" 'split-window-right)

  ;; non-leader shortcuts
  ;; Map H to go to the beginning of line in normal mode
  ;; (define-key evil-normal-state-map (kbd "H") (kbd "^")) ; H goes to beginning of the line
  (define-key evil-normal-state-map (kbd "H") 'evil-first-non-blank)
  ;; Mapping keybinding to another keybinding
  ;; Map L to go to the end of line in normal mode
  (define-key evil-normal-state-map (kbd "L") 'evil-end-of-line)
  (define-key evil-normal-state-map (kbd "U") 'undo-tree-redo)
  ;; j,k act like gj, gk
  (define-key evil-normal-state-map (kbd "j") 'evil-next-visual-line)
  (define-key evil-normal-state-map (kbd "k") 'evil-previous-visual-line)
  ;; map ; to :
  (define-key evil-normal-state-map (kbd ";") 'evil-ex)

  ;; graphviz
  (org-babel-do-load-languages
   'org-babel-load-languages
   '(
     (dot . t)
     ))

  ;; -------------------- REMAPPING THE ESC KEY WITH KEYCHORD ------------------
  (require 'key-chord)
  (key-chord-mode 1)
  (key-chord-define evil-insert-state-map  "jj" 'evil-normal-state)
  (key-chord-define evil-insert-state-map  "jk" 'evil-normal-state)
  (key-chord-define evil-insert-state-map  "kk" 'evil-normal-state)

  (load "~/.spacemacs.d/auctex-config.el")
  (setq TeX-source-correlate-start-server t)
  (defun aquamacs-set-defaults (list)
    "Set a new default for a customization option in Aquamacs.
  Add the value to the customization group `Aquamacs-is-more-than-Emacs'."

    (mapc (lambda (elt)
      (custom-load-symbol (car elt)) ;; does nothing for non-custom variables
      (let* ((symbol (car elt))
      ;; we're accessing the doc property here so
      ;; if the symbol is an autoload symbol,
      ;; it'll get loaded now before setting its defaults
      ;; (e.g. standard-value), which would otherwise be
      ;; overwritten.
      (old-doc
        (condition-case nil
            (documentation-property
            symbol
            'variable-documentation)
          (error "")))
      (value (car (cdr elt)))
      (s-value (get symbol 'standard-value))
                  (setter (get symbol 'custom-set)))

              ;; if there's a setter, use it
              ;; note: symbol must be loaded for this to work
              (if setter ;; if customizable and there is a special setter
                  (funcall setter symbol value)
                ;; otherwise, just set it
                (set symbol value))

        (set-default symbol value) ;; new in post-0.9.5

              ;; To Do: consider calling `custom-theme-set-variables' for custom
              ;; settings and create an Aquamacs theme.  This is not trivial,
              ;; as we do not want to store a "saved variable" as opposed to a
              ;; new default (as if it had been set with `defcustom').

        ;; make sure that user customizations get
        ;; saved to customizations.el (.emacs)
        ;; and that this appears as the new default.

        ;; since the standard-value changed, put it in the
        ;; group
        (put symbol 'standard-value `((quote  ,(copy-tree (eval symbol)))))

        (unless (or (eq s-value (get symbol 'standard-value))
        (get symbol 'aquamacs-original-default))
          (put symbol 'aquamacs-original-default
        s-value)
          (if old-doc ;; in some cases the documentation
        ;; might not be loaded. Can we load it somehow?
        ;; either way, the "if" is a workaround.
        (put symbol 'variable-documentation
            (concat
        old-doc
        (format "
  The original default (in GNU Emacs or in the package) was:
  %s"
          s-value))))
          (custom-add-to-group 'Aquamacs-is-more-than-Emacs
            symbol 'custom-variable))))
    list))

  ; (aquamacs-setup)

  ;; Remember the cursor position of files when reopening them
  ;; (setq save-place-file "~/.emacs.d/private/saveplace")
  ;; (setq-default save-place t)
  ;; (require 'saveplace)

  (turn-on-fci-mode)

  ;; YCMD will not work until you set ycmd-server-command correctly.
  (set-variable 'ycmd-server-command
                '("python" "/Users/xuliucheng/.vim/bundle/YouCompleteMe/third_party/ycmd/ycmd/"))
  (add-hook 'c-mode-hook 'ycmd-mode)
  (add-hook 'c++-mode-hook 'ycmd-mode)
  (add-hook 'python-mode-hook 'ycmd-mode)

  (require 'company-ycmd)
  (company-ycmd-setup)

  (require 'flycheck-ycmd)
  (flycheck-ycmd-setup)

  (add-hook 'c-mode-hook 'flycheck-mode)
  (add-hook 'c++-mode-hook 'flycheck-mode)
  (add-hook 'python-mode-hook 'flycheck-mode)

  ;;;;;;;;;;;;
  ;; Scheme
  ;;;;;;;;;;;;

  (require 'cmuscheme)
  (setq scheme-program-name "scheme")         ;; 如果用 Petite 就改成 "petite"


  ;; bypass the interactive question and start the default interpreter
  (defun scheme-proc ()
    "Return the current Scheme process, starting one if necessary."
    (unless (and scheme-buffer
                (get-buffer scheme-buffer)
                (comint-check-proc scheme-buffer))
      (save-window-excursion
        (run-scheme scheme-program-name)))
    (or (scheme-get-process)
        (error "No current process. See variable `scheme-buffer'")))


  (defun scheme-split-window ()
    (cond
    ((= 1 (count-windows))
      (delete-other-windows)
      (split-window-vertically (floor (* 0.68 (window-height))))
      (other-window 1)
      (switch-to-buffer "*scheme*")
      (other-window 1))
    ((not (find "*scheme*"
                (mapcar (lambda (w) (buffer-name (window-buffer w)))
                        (window-list))
                :test 'equal))
      (other-window 1)
      (switch-to-buffer "*scheme*")
      (other-window -1))))


  (defun scheme-send-last-sexp-split-window ()
    (interactive)
    (scheme-split-window)
    (scheme-send-last-sexp))


  (defun scheme-send-definition-split-window ()
    (interactive)
    (scheme-split-window)
    (scheme-send-definition))

  (add-hook 'scheme-mode-hook
    (lambda ()
      (paredit-mode 1)
      (define-key scheme-mode-map (kbd "<f5>") 'scheme-send-last-sexp-split-window)
      (define-key scheme-mode-map (kbd "<f6>") 'scheme-send-definition-split-window)))

;; Do not write anything past this comment. This is where Emacs will
;; auto-generate custom variable definitions.

)
(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(package-selected-packages
   (quote
    (noflet ensime sbt-mode scala-mode winum unfill fuzzy chinese-fonts-setup geiser paredit fzf emoji-cheat-sheet-plus company-emoji key-chord vimrc-mode dactyl-mode powerline spinner org alert log4e gntp markdown-mode hydra parent-mode hide-comnt projectile haml-mode gitignore-mode fringe-helper git-gutter+ flyspell-correct flycheck pkg-info epl flx magit magit-popup git-commit with-editor smartparens iedit anzu evil goto-chg undo-tree highlight diminish ycmd request-deferred request deferred web-completion-data pos-tip company bind-map bind-key yasnippet packed auctex anaconda-mode pythonic f dash s helm avy helm-core async auto-complete popup package-build auctex-latexmk yapfify xterm-color ws-butler window-numbering which-key web-mode volatile-highlights vi-tilde-fringe uuidgen use-package toc-org tagedit sublime-themes spacemacs-theme spaceline solarized-theme smeargle slim-mode shell-pop scss-mode sass-mode reveal-in-osx-finder restart-emacs rainbow-mode rainbow-identifiers rainbow-delimiters quelpa pyvenv pytest pyenv-mode py-isort pug-mode popwin pip-requirements persp-mode pcre2el pbcopy paradox osx-trash osx-dictionary orgit org-projectile org-present org-pomodoro org-plus-contrib org-download org-bullets open-junk-file neotree mwim multi-term move-text monokai-theme molokai-theme mmm-mode markdown-toc magit-gitflow macrostep lorem-ipsum live-py-mode linum-relative link-hint less-css-mode launchctl info+ indent-guide ido-vertical-mode hy-mode hungry-delete htmlize hl-todo highlight-parentheses highlight-numbers highlight-indentation help-fns+ helm-themes helm-swoop helm-pydoc helm-projectile helm-mode-manager helm-make helm-gitignore helm-flx helm-descbinds helm-css-scss helm-company helm-c-yasnippet helm-ag graphviz-dot-mode grandshell-theme google-translate golden-ratio gnuplot gitconfig-mode gitattributes-mode git-timemachine git-messenger git-link git-gutter-fringe+ gh-md flyspell-correct-helm flycheck-ycmd flycheck-pos-tip flx-ido fill-column-indicator farmhouse-theme fancy-battery eyebrowse expand-region exec-path-from-shell evil-visualstar evil-visual-mark-mode evil-unimpaired evil-tutor evil-surround evil-search-highlight-persist evil-numbers evil-nerd-commenter evil-mc evil-matchit evil-magit evil-lisp-state evil-indent-plus evil-iedit-state evil-exchange evil-escape evil-ediff evil-args evil-anzu eval-sexp-fu eshell-z eshell-prompt-extras esh-help emmet-mode elisp-slime-nav dumb-jump disaster diff-hl cython-mode company-ycmd company-web company-statistics company-quickhelp company-c-headers company-auctex company-anaconda column-enforce-mode color-identifiers-mode cmake-mode clean-aindent-mode clang-format auto-yasnippet auto-highlight-symbol auto-dictionary auto-compile apropospriate-theme aggressive-indent adaptive-wrap ace-window ace-link ace-jump-helm-line ac-ispell))))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )
