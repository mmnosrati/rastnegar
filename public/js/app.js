/**
 * RastNegar - Application Controller
 * Responsive & Mobile-Enhanced Edition
 * Author: Mohammad Mahdi Nosrati (https://t.me/mmn_dev)
 */

(function () {
  'use strict';

  // Application State
  const state = {
    content: '',
    theme: localStorage.getItem('rastnegar_theme') || 'editorial',
    viewMode: localStorage.getItem('rastnegar_view') || 'split',
    mobileTab: 'preview', // 'preview' | 'editor'
    persianDigits: localStorage.getItem('rastnegar_digits') === 'true',
    isSyncScrolling: true,
    isDraggingResizer: false
  };

  // DOM Elements
  const DOM = {
    app: document.getElementById('app'),
    editor: document.getElementById('markdown-editor'),
    preview: document.getElementById('preview-container'),
    previewInner: document.getElementById('preview-content'),
    paneEditor: document.getElementById('pane-editor'),
    panePreview: document.getElementById('pane-preview'),
    resizer: document.getElementById('pane-resizer'),
    themeSelect: document.getElementById('theme-selector'),
    themeSelectMobile: document.getElementById('theme-selector-mobile'),
    viewButtons: document.querySelectorAll('.segment-btn[data-view]'),
    mobileTabs: document.querySelectorAll('.mobile-tab-btn[data-mobile-tab]'),
    tocDrawer: document.getElementById('toc-drawer'),
    tocList: document.getElementById('toc-list'),
    mobileMenuDrawer: document.getElementById('mobile-menu-drawer'),
    drawerBackdrop: document.getElementById('drawer-backdrop'),
    exportDropdownWrapper: document.querySelector('.dropdown-wrapper'),
    btnExportDropdown: document.getElementById('btn-export-dropdown'),
    aboutModal: document.getElementById('about-modal'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    toast: document.getElementById('toast'),
    // Stats
    statWords: document.getElementById('stat-words'),
    statChars: document.getElementById('stat-chars'),
    statTime: document.getElementById('stat-time'),
    statCursor: document.getElementById('stat-cursor')
  };

  // Debounce helper
  function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Initialize Application
   */
  function init() {
    // 1. Set initial theme
    setTheme(state.theme);

    // 2. Set initial view mode & mobile tab
    setViewMode(state.viewMode);
    setMobileTab(state.mobileTab);

    // 3. Load content from localStorage (auto-purge old C2 or preset content)
    let savedContent = localStorage.getItem('rastnegar_content');
    if (savedContent && (
      savedContent.includes('Sliver C2') ||
      savedContent.includes('مرجع جامع و کامل Sliver') ||
      savedContent.includes('C2 چیست') ||
      savedContent.includes('فصل صفر: مفاهیم پایه') ||
      savedContent.includes('سند ۱: راهنما')
    )) {
      localStorage.removeItem('rastnegar_content');
      savedContent = null;
    }

    if (savedContent && savedContent.trim().length > 0) {
      state.content = savedContent;
    } else {
      state.content = `# به راست‌نگار خوش آمدید\n\nمتن مارک‌داون (Markdown) خود را اینجا بنویسید یا الصاق کنید...\n`;
    }

    DOM.editor.value = state.content;

    // 4. Initial Render
    renderPreview();
    updateStats();

    // 5. Attach Event Listeners
    setupEventListeners();
  }

  /**
   * Set Application Theme
   */
  function setTheme(themeName) {
    state.theme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('rastnegar_theme', themeName);
    if (DOM.themeSelect) DOM.themeSelect.value = themeName;
    if (DOM.themeSelectMobile) DOM.themeSelectMobile.value = themeName;
  }

  /**
   * Set Desktop View Mode (split, reader, editor)
   */
  function setViewMode(mode) {
    state.viewMode = mode;
    localStorage.setItem('rastnegar_view', mode);

    DOM.app.classList.remove('view-split', 'view-reader', 'view-editor');
    DOM.app.classList.add(`view-${mode}`);

    DOM.viewButtons.forEach(btn => {
      if (btn.getAttribute('data-view') === mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (mode === 'split') {
      DOM.paneEditor.style.flex = '1';
      DOM.panePreview.style.flex = '1';
    }
  }

  /**
   * Set Mobile Tab (preview, editor)
   */
  function setMobileTab(tab) {
    state.mobileTab = tab;
    DOM.app.classList.remove('mobile-active-preview', 'mobile-active-editor');
    DOM.app.classList.add(`mobile-active-${tab}`);

    DOM.mobileTabs.forEach(btn => {
      if (btn.getAttribute('data-mobile-tab') === tab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Render Preview using BiDi Engine
   */
  function renderPreview() {
    const markdown = DOM.editor.value;
    state.content = markdown;

    try {
      localStorage.setItem('rastnegar_content', markdown);
    } catch (e) {
      console.warn('LocalStorage limit or error');
    }

    const result = RastNegarBiDi.renderMarkdown(markdown);
    let finalHtml = result.html;

    if (state.persianDigits) {
      finalHtml = RastNegarBiDi.toPersianDigits(finalHtml);
    }

    DOM.previewInner.innerHTML = finalHtml;
    buildTableOfContents(result.headings);
  }

  const debouncedRender = debounce(renderPreview, 100);

  /**
   * Update Document Statistics
   */
  function updateStats() {
    const text = DOM.editor.value;
    const words = text.trim() ? (text.trim().match(/[\w\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+/g) || []).length : 0;
    const chars = text.length;
    const minutes = Math.max(1, Math.ceil(words / 160));

    const num = state.persianDigits ? RastNegarBiDi.toPersianDigits : (n) => n;

    if (DOM.statWords) DOM.statWords.textContent = num(words.toLocaleString('fa-IR'));
    if (DOM.statChars) DOM.statChars.textContent = num(chars.toLocaleString('fa-IR'));
    if (DOM.statTime) DOM.statTime.textContent = num(minutes.toString()) + ' دقیقه';
  }

  /**
   * Build Dynamic Table of Contents (TOC)
   */
  function buildTableOfContents(headings) {
    if (!DOM.tocList) return;

    if (!headings || headings.length === 0) {
      DOM.tocList.innerHTML = '<li class="toc-empty" style="color:var(--text-muted);font-size:0.85rem;padding:0.5rem;">هنوز سرتیتری در سند ثبت نشده است.</li>';
      return;
    }

    let html = '';
    headings.forEach(h => {
      const levelClass = `level-${Math.min(h.level, 3)}`;
      const displayText = state.persianDigits ? RastNegarBiDi.toPersianDigits(h.text) : h.text;
      html += `<li class="toc-item">
        <a href="#${h.id}" class="toc-link ${levelClass}" data-target="${h.id}" dir="${h.dir}">
          ${displayText}
        </a>
      </li>`;
    });

    DOM.tocList.innerHTML = html;

    DOM.tocList.querySelectorAll('.toc-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('data-target');
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          // If on mobile and in editor tab, switch to preview
          if (window.innerWidth <= 1024) {
            setMobileTab('preview');
          }
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          closeToc();
        }
      });
    });
  }

  /**
   * Toolbar Insertion Helper
   */
  function insertFormatting(prefix, suffix = '', placeholder = '') {
    const el = DOM.editor;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = el.value.substring(start, end);
    const textToInsert = sel.length > 0 ? (prefix + sel + suffix) : (prefix + placeholder + suffix);

    el.focus();
    if (document.execCommand) {
      document.execCommand('insertText', false, textToInsert);
    } else {
      el.setRangeText(textToInsert, start, end, 'end');
    }

    if (sel.length === 0 && placeholder.length > 0) {
      el.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
    }

    renderPreview();
    updateStats();
  }

  /**
   * Synchronized Scrolling (Desktop Split View Only)
   */
  let isScrollingEditor = false;
  let isScrollingPreview = false;

  function syncScrollFromEditor() {
    if (!state.isSyncScrolling || isScrollingPreview || state.viewMode !== 'split' || window.innerWidth <= 1024) return;
    isScrollingEditor = true;

    const editorScrollTop = DOM.editor.scrollTop;
    const editorScrollHeight = DOM.editor.scrollHeight - DOM.editor.clientHeight;
    if (editorScrollHeight > 0) {
      const scrollRatio = editorScrollTop / editorScrollHeight;
      const previewScrollHeight = DOM.preview.scrollHeight - DOM.preview.clientHeight;
      DOM.preview.scrollTop = scrollRatio * previewScrollHeight;
    }

    setTimeout(() => { isScrollingEditor = false; }, 50);
  }

  function syncScrollFromPreview() {
    if (!state.isSyncScrolling || isScrollingEditor || state.viewMode !== 'split' || window.innerWidth <= 1024) return;
    isScrollingPreview = true;

    const previewScrollTop = DOM.preview.scrollTop;
    const previewScrollHeight = DOM.preview.scrollHeight - DOM.preview.clientHeight;
    if (previewScrollHeight > 0) {
      const scrollRatio = previewScrollTop / previewScrollHeight;
      const editorScrollHeight = DOM.editor.scrollHeight - DOM.editor.clientHeight;
      DOM.editor.scrollTop = scrollRatio * editorScrollHeight;
    }

    setTimeout(() => { isScrollingPreview = false; }, 50);
  }

  /**
   * Resizable Pane Gutter (Desktop Only)
   */
  function initResizer() {
    if (!DOM.resizer) return;

    DOM.resizer.addEventListener('mousedown', () => {
      state.isDraggingResizer = true;
      DOM.resizer.classList.add('dragging');
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    document.addEventListener('mousemove', (e) => {
      if (!state.isDraggingResizer || state.viewMode !== 'split' || window.innerWidth <= 1024) return;

      const containerWidth = DOM.app.querySelector('.workspace-container').clientWidth;
      const editorWidth = containerWidth - e.clientX;
      const previewWidth = e.clientX;

      if (editorWidth > 220 && previewWidth > 220) {
        DOM.paneEditor.style.flex = `0 0 ${editorWidth}px`;
        DOM.panePreview.style.flex = `0 0 ${previewWidth}px`;
      }
    });

    document.addEventListener('mouseup', () => {
      if (state.isDraggingResizer) {
        state.isDraggingResizer = false;
        DOM.resizer.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  /**
   * Export Options
   */
  function downloadMarkdown() {
    const blob = new Blob([DOM.editor.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rastnegar-doc-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    closeExportMenu();
    closeMobileMenu();
    showToast('فایل مارک‌داون (.md) دانلود شد.');
  }

  async function exportHtml() {
    try {
      let cssText = '';
      try {
        const cssResponse = await fetch('css/app.css');
        if (cssResponse.ok) {
          cssText = await cssResponse.text();
        }
      } catch (e) {
        console.warn('Could not fetch external css, using fallback styles', e);
      }
      
      const currentTheme = state.theme || 'editorial';
      const htmlContent = DOM.previewInner.innerHTML;
      const fullHtml = `<!DOCTYPE html>
<html lang="fa" dir="rtl" data-theme="${currentTheme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>سند راست‌نگار (RTL Markdown)</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Vazirmatn:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    ${cssText}

    /* Core Standalone Portable RTL Styles (dariubs/rtlmd principles) */
    html, body {
      height: auto !important;
      min-height: 100vh !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      direction: rtl !important;
      text-align: right !important;
      font-family: 'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif !important;
      line-height: 1.9 !important;
      margin: 0 !important;
      padding: 0 !important;
      background-color: var(--bg-app, #F7F5F0) !important;
      color: var(--text-primary, #1C1E21) !important;
    }
    .standalone-container {
      max-width: 860px;
      margin: 2rem auto;
      padding: 2.5rem;
      background-color: var(--bg-surface, #FFFFFF);
      border: 1px solid var(--border-color, #E3DFD5);
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
      direction: rtl !important;
      text-align: right !important;
    }
    .standalone-container h1,
    .standalone-container h2,
    .standalone-container h3,
    .standalone-container h4,
    .standalone-container p,
    .standalone-container ul,
    .standalone-container ol,
    .standalone-container blockquote {
      direction: rtl !important;
      text-align: right !important;
    }
    .standalone-container pre,
    .standalone-container code,
    .standalone-container .codeblock-wrapper {
      direction: ltr !important;
      text-align: left !important;
    }
    .standalone-container .inline-code {
      display: inline-block;
      direction: ltr !important;
      unicode-bidi: isolate !important;
      padding: 0.15em 0.4em;
      border-radius: 4px;
      background-color: var(--bg-code, #F2EFE9);
      color: var(--accent, #A33527);
    }
    .standalone-footer {
      margin-top: 3rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-color, #E3DFD5);
      font-size: 0.85rem;
      color: var(--text-muted, #848B94);
      text-align: center;
      direction: rtl;
    }
    .standalone-footer a {
      color: var(--accent, #A33527);
      text-decoration: none;
      font-weight: 700;
    }
    @media (max-width: 768px) {
      .standalone-container {
        margin: 0;
        border-radius: 0;
        border: none;
        padding: 1.5rem 1rem;
      }
    }
  </style>
</head>
<body>
  <main class="standalone-container preview-inner">
    ${htmlContent}
    <footer class="standalone-footer">
      تولید شده با <a href="https://t.me/mmn_dev" target="_blank" rel="noopener noreferrer">راست‌نگار</a> — توسعه توسط محمد مهدی نصرتی
    </footer>
  </main>
</body>
</html>`;

      const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rastnegar-export-${Date.now()}.html`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('فایل HTML مستقل آماده و دانلود شد.');
    } catch (err) {
      console.error(err);
      showToast('خطا در ایجاد فایل HTML.');
    }
    closeExportMenu();
    closeMobileMenu();
  }

  async function copyFormattedText() {
    try {
      const html = DOM.previewInner.innerHTML;
      const plain = DOM.previewInner.innerText;
      
      const blobHtml = new Blob([html], { type: 'text/html' });
      const blobPlain = new Blob([plain], { type: 'text/plain' });

      if (window.ClipboardItem && navigator.clipboard.write) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobPlain
          })
        ]);
        showToast('متن با فرمت (Rich Text) در کلیپ‌بورد کپی شد.');
      } else {
        await navigator.clipboard.writeText(plain);
        showToast('متن در کلیپ‌بورد کپی شد.');
      }
    } catch (err) {
      console.error(err);
      showToast('خطا در کپی کلیپ‌بورد.');
    }
    closeExportMenu();
    closeMobileMenu();
  }

  async function printDocument() {
    closeExportMenu();
    closeMobileMenu();
    closeToc();
    if (DOM.aboutModal) closeModal(DOM.aboutModal);
    if (DOM.shortcutsModal) closeModal(DOM.shortcutsModal);

    showToast('در حال آماده‌سازی و دانلود فایل PDF...');

    if (window.html2pdf) {
      // Clone preview content
      const clone = DOM.previewInner.cloneNode(true);
      // Remove interactive buttons & anchors
      clone.querySelectorAll('.btn-copy-code, .heading-anchor').forEach(n => n.remove());

      clone.style.padding = '0';
      clone.style.margin = '0';
      clone.style.maxWidth = '100%';
      clone.style.width = '100%';

      // Ensure normal letter-spacing for all elements so Persian cursive ligatures are preserved
      clone.querySelectorAll('*').forEach(el => {
        el.style.letterSpacing = 'normal';
      });

      // Fix list bullets for PDF export
      clone.querySelectorAll('ul.bidi-list').forEach(ul => {
        ul.style.listStyle = 'none';
        ul.style.paddingRight = '0';
        ul.style.marginRight = '0';
        ul.querySelectorAll('li.bidi-list-item').forEach(li => {
          li.style.listStyle = 'none';
          li.style.position = 'relative';
          li.style.paddingRight = '1.6rem';
          li.style.marginBottom = '0.55rem';
          
          const bullet = document.createElement('span');
          bullet.className = 'pdf-bullet';
          bullet.textContent = '•';
          bullet.style.position = 'absolute';
          bullet.style.right = '0.2rem';
          bullet.style.top = '0';
          bullet.style.color = '#a33527';
          bullet.style.fontSize = '1.3em';
          bullet.style.lineHeight = '1';
          bullet.style.fontWeight = 'bold';
          li.insertBefore(bullet, li.firstChild);
        });
      });

      // Fix code blocks font
      clone.querySelectorAll('.codeblock-pre, .codeblock-pre code').forEach(el => {
        el.style.fontFamily = "'JetBrains Mono', 'Vazirmatn', monospace";
        el.style.letterSpacing = 'normal';
      });

      // High-quality print wrapper appended to body during capture
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-theme', 'editorial');
      wrapper.style.width = '720px';
      wrapper.style.padding = '20px 25px';
      wrapper.style.direction = 'rtl';
      wrapper.style.textAlign = 'right';
      wrapper.style.fontFamily = "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif";
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.color = '#1c1e21';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.letterSpacing = 'normal';

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const opt = {
        margin: [15, 12, 15, 12],
        filename: `rastnegar-document-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      try {
        await html2pdf().set(opt).from(wrapper).save();
        showToast('فایل PDF با موفقیت دانلود شد.');
      } catch (err) {
        console.error('PDF generation error:', err);
        showToast('خطا در تولید فایل PDF.');
      } finally {
        wrapper.remove();
      }
    } else {
      showToast('کتابخانه PDF بارگذاری نشده است.');
    }
  }

  /**
   * Toast Notification
   */
  let toastTimer = null;
  function showToast(message) {
    if (!DOM.toast) return;
    DOM.toast.textContent = message;
    DOM.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      DOM.toast.classList.remove('show');
    }, 2800);
  }

  /**
   * Drawer & Modal Controllers
   */
  function updateDrawerBackdrop() {
    const isTocOpen = DOM.tocDrawer && DOM.tocDrawer.classList.contains('open');
    const isMobileMenuOpen = DOM.mobileMenuDrawer && DOM.mobileMenuDrawer.classList.contains('open');
    if (DOM.drawerBackdrop) {
      if (isTocOpen || isMobileMenuOpen) {
        DOM.drawerBackdrop.classList.add('active');
      } else {
        DOM.drawerBackdrop.classList.remove('active');
      }
    }
  }

  function toggleToc() {
    if (DOM.mobileMenuDrawer) DOM.mobileMenuDrawer.classList.remove('open');
    DOM.tocDrawer.classList.toggle('open');
    updateDrawerBackdrop();
  }
  function closeToc() {
    if (DOM.tocDrawer) DOM.tocDrawer.classList.remove('open');
    updateDrawerBackdrop();
  }

  function toggleExportMenu() {
    DOM.exportDropdownWrapper.classList.toggle('open');
  }
  function closeExportMenu() {
    if (DOM.exportDropdownWrapper) DOM.exportDropdownWrapper.classList.remove('open');
  }

  function toggleMobileMenu() {
    if (DOM.tocDrawer) DOM.tocDrawer.classList.remove('open');
    DOM.mobileMenuDrawer.classList.toggle('open');
    updateDrawerBackdrop();
  }
  function closeMobileMenu() {
    if (DOM.mobileMenuDrawer) DOM.mobileMenuDrawer.classList.remove('open');
    updateDrawerBackdrop();
  }

  function openModal(modalEl) {
    if (modalEl) modalEl.classList.add('active');
  }
  function closeModal(modalEl) {
    if (modalEl) modalEl.classList.remove('active');
  }

  /**
   * Setup Event Listeners
   */
  function setupEventListeners() {
    // 1. Editor Input
    DOM.editor.addEventListener('input', () => {
      debouncedRender();
      updateStats();
    });

    // 2. Cursor tracking
    DOM.editor.addEventListener('keyup', updateCursorStats);
    DOM.editor.addEventListener('click', updateCursorStats);

    function updateCursorStats() {
      const pos = DOM.editor.selectionStart;
      const val = DOM.editor.value.substring(0, pos);
      const lines = val.split('\n');
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      const num = state.persianDigits ? RastNegarBiDi.toPersianDigits : (n) => n;
      if (DOM.statCursor) {
        DOM.statCursor.textContent = `خط ${num(line)}، ستون ${num(col)}`;
      }
    }

    // 3. Sync scroll
    DOM.editor.addEventListener('scroll', syncScrollFromEditor);
    DOM.preview.addEventListener('scroll', syncScrollFromPreview);

    // 4. Resizer
    initResizer();

    // 5. Themes (Desktop & Mobile)
    if (DOM.themeSelect) {
      DOM.themeSelect.addEventListener('change', (e) => setTheme(e.target.value));
    }
    if (DOM.themeSelectMobile) {
      DOM.themeSelectMobile.addEventListener('change', (e) => {
        setTheme(e.target.value);
        closeMobileMenu();
      });
    }

    // 7. Desktop View mode buttons
    DOM.viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-view');
        setViewMode(mode);
      });
    });

    // 8. Mobile Tab buttons
    DOM.mobileTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-mobile-tab');
        setMobileTab(tab);
      });
    });

    // 9. Export Dropdown Trigger
    if (DOM.btnExportDropdown) {
      DOM.btnExportDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExportMenu();
      });
    }

    document.addEventListener('click', (e) => {
      if (DOM.exportDropdownWrapper && !DOM.exportDropdownWrapper.contains(e.target)) {
        closeExportMenu();
      }
    });

    // 10. Mobile Menu Trigger
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    if (btnMobileMenu) btnMobileMenu.addEventListener('click', toggleMobileMenu);

    const btnCloseMobileMenu = document.getElementById('btn-close-mobile-menu');
    if (btnCloseMobileMenu) btnCloseMobileMenu.addEventListener('click', closeMobileMenu);

    // 11. Toolbar Buttons
    document.querySelectorAll('.tool-btn[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        handleToolbarAction(action);
      });
    });

    // 12. Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        showToast('سند با موفقیت ذخیره شد.');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        insertFormatting('**', '**', 'متن پررنگ');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        insertFormatting('*', '*', 'متن مورب');
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        insertFormatting('[', '](https://example.com)', 'عنوان پیوند');
      }
      if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'x') || (e.shiftKey && e.key === ' ')) {
        e.preventDefault();
        insertFormatting('\u200C');
      }
      if (e.key === 'Escape') {
        closeToc();
        closeMobileMenu();
        closeExportMenu();
        closeModal(DOM.aboutModal);
        closeModal(DOM.shortcutsModal);
      }
    });

    // 13. Drawers & Modals
    const btnToc = document.getElementById('btn-toggle-toc');
    if (btnToc) btnToc.addEventListener('click', toggleToc);

    const btnCloseToc = document.getElementById('btn-close-toc');
    if (btnCloseToc) btnCloseToc.addEventListener('click', closeToc);

    const btnAbout = document.getElementById('btn-about');
    if (btnAbout) btnAbout.addEventListener('click', () => openModal(DOM.aboutModal));

    const btnShortcuts = document.getElementById('btn-shortcuts');
    if (btnShortcuts) btnShortcuts.addEventListener('click', () => openModal(DOM.shortcutsModal));

    const btnMobileAbout = document.getElementById('btn-mobile-about');
    if (btnMobileAbout) {
      btnMobileAbout.addEventListener('click', () => {
        closeMobileMenu();
        openModal(DOM.aboutModal);
      });
    }

    const btnMobileShortcuts = document.getElementById('btn-mobile-shortcuts');
    if (btnMobileShortcuts) {
      btnMobileShortcuts.addEventListener('click', () => {
        closeMobileMenu();
        openModal(DOM.shortcutsModal);
      });
    }

    if (DOM.drawerBackdrop) {
      DOM.drawerBackdrop.addEventListener('click', () => {
        closeToc();
        closeMobileMenu();
      });
    }

    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal(modal);
      });
    });

    document.querySelectorAll('.btn-close-modal').forEach(btn => {
      btn.addEventListener('click', () => {
        closeModal(btn.closest('.modal-backdrop'));
      });
    });

    // 14. Export Actions (Desktop & Mobile)
    const btnMd = document.getElementById('btn-export-md');
    if (btnMd) btnMd.addEventListener('click', downloadMarkdown);
    const btnMobileMd = document.getElementById('btn-mobile-export-md');
    if (btnMobileMd) btnMobileMd.addEventListener('click', downloadMarkdown);

    const btnRich = document.getElementById('btn-copy-rich');
    if (btnRich) btnRich.addEventListener('click', copyFormattedText);
    const btnMobileRich = document.getElementById('btn-mobile-copy-rich');
    if (btnMobileRich) btnMobileRich.addEventListener('click', copyFormattedText);

    const btnPrint = document.getElementById('btn-print');
    if (btnPrint) btnPrint.addEventListener('click', printDocument);
    const btnMobilePrint = document.getElementById('btn-mobile-print');
    if (btnMobilePrint) btnMobilePrint.addEventListener('click', printDocument);

    const btnHtml = document.getElementById('btn-export-html');
    if (btnHtml) btnHtml.addEventListener('click', exportHtml);
    const btnMobileHtml = document.getElementById('btn-mobile-export-html');
    if (btnMobileHtml) btnMobileHtml.addEventListener('click', exportHtml);
  }

  /**
   * Toolbar Action Handler
   */
  function handleToolbarAction(action) {
    switch (action) {
      case 'bold':
        insertFormatting('**', '**', 'متن پررنگ');
        break;
      case 'italic':
        insertFormatting('*', '*', 'متن مورب');
        break;
      case 'strike':
        insertFormatting('~~', '~~', 'متن خط‌خورده');
        break;
      case 'h1':
        insertFormatting('\n# ', '\n', 'تیتر اصلی');
        break;
      case 'h2':
        insertFormatting('\n## ', '\n', 'تیتر درجه دو');
        break;
      case 'h3':
        insertFormatting('\n### ', '\n', 'تیتر درجه سه');
        break;
      case 'quote':
        insertFormatting('\n> ', '\n', 'نقل قول متن');
        break;
      case 'inline-code':
        insertFormatting('`', '`', 'کد');
        break;
      case 'codeblock':
        insertFormatting('\n```javascript\n', '\n```\n', '// کد خود را اینجا قرار دهید');
        break;
      case 'table':
        insertFormatting('\n| ستون اول | ستون دوم | ستون سوم |\n| :--- | :---: | ---: |\n| سطر ۱ | مقدار | توضیحات |\n| سطر ۲ | مقدار | توضیحات |\n\n');
        break;
      case 'task':
        insertFormatting('\n- [ ] ', '', 'مورد جدید در فهرست کارها');
        break;
      case 'link':
        insertFormatting('[', '](https://)', 'عنوان پیوند');
        break;
      case 'image':
        insertFormatting('![', '](https://via.placeholder.com/600x300)', 'توضیح تصویر');
        break;
      case 'hr':
        insertFormatting('\n\n---\n\n');
        break;
      case 'zwnj':
        insertFormatting('\u200C');
        showToast('نیم‌فاصله درج شد.');
        break;
      case 'quotes':
        insertFormatting('«', '»', 'عبارت');
        break;
      case 'clear':
        if (confirm('آیا مطمئن هستید که می‌خواهید کل محتوای ادیتور را پاک کنید؟')) {
          DOM.editor.value = '';
          renderPreview();
          updateStats();
          showToast('ویرایشگر پاک‌سازی شد.');
        }
        break;
    }
  }

  // Start app on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
