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
    isDraggingResizer: false,
    isExportingPdf: false
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
    pdfModal: document.getElementById('pdf-loading-modal'),
    btnToggleDigits: document.getElementById('btn-toggle-digits'),
    btnMobileToggleDigits: document.getElementById('btn-mobile-toggle-digits'),
    mobileDigitsBadge: document.getElementById('mobile-digits-badge'),
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

    // 4. Initial Digits UI state
    updateDigitsUI();

    // 5. Initial Render
    renderPreview();
    updateStats();

    // 6. Attach Event Listeners
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

    // Use safe HTML text converter to preserve HTML tags, code blocks, and SVG properties
    if (state.persianDigits) {
      finalHtml = RastNegarBiDi.toPersianDigitsInHtml(finalHtml);
    }

    DOM.previewInner.innerHTML = finalHtml;
    buildTableOfContents(result.headings);
  }

  const debouncedRender = debounce(renderPreview, 100);

  /**
   * Toggle Persian Digits Display Mode
   */
  function togglePersianDigits() {
    state.persianDigits = !state.persianDigits;
    try {
      localStorage.setItem('rastnegar_digits', state.persianDigits ? 'true' : 'false');
    } catch (_) {}
    updateDigitsUI();
    renderPreview();
    updateStats();
    showToast(state.persianDigits ? 'ارقام فارسی شدند (۱۲۳).' : 'ارقام انگلیسی شدند (123).');
  }

  function updateDigitsUI() {
    if (DOM.btnToggleDigits) {
      if (state.persianDigits) {
        DOM.btnToggleDigits.classList.add('active');
        DOM.btnToggleDigits.style.color = 'var(--accent)';
      } else {
        DOM.btnToggleDigits.classList.remove('active');
        DOM.btnToggleDigits.style.color = '';
      }
    }
    if (DOM.mobileDigitsBadge) {
      if (state.persianDigits) {
        DOM.mobileDigitsBadge.textContent = 'فعال';
        DOM.mobileDigitsBadge.classList.remove('inactive');
      } else {
        DOM.mobileDigitsBadge.textContent = 'غیرفعال';
        DOM.mobileDigitsBadge.classList.add('inactive');
      }
    }
  }

  /**
   * Update Document Statistics (Persian-aware ZWNJ word counting)
   */
  function updateStats() {
    const text = DOM.editor.value;
    const words = text.trim() ? (text.trim().match(/[\w\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+(?:[\u200C\u200D][\w\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]+)*/g) || []).length : 0;
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
    const editorScrollHeight = Math.max(1, DOM.editor.scrollHeight - DOM.editor.clientHeight);
    const scrollRatio = editorScrollTop / editorScrollHeight;
    const previewScrollHeight = Math.max(0, DOM.preview.scrollHeight - DOM.preview.clientHeight);
    DOM.preview.scrollTop = scrollRatio * previewScrollHeight;

    setTimeout(() => { isScrollingEditor = false; }, 50);
  }

  function syncScrollFromPreview() {
    if (!state.isSyncScrolling || isScrollingEditor || state.viewMode !== 'split' || window.innerWidth <= 1024) return;
    isScrollingPreview = true;

    const previewScrollTop = DOM.preview.scrollTop;
    const previewScrollHeight = Math.max(1, DOM.preview.scrollHeight - DOM.preview.clientHeight);
    const scrollRatio = previewScrollTop / previewScrollHeight;
    const editorScrollHeight = Math.max(0, DOM.editor.scrollHeight - DOM.editor.clientHeight);
    DOM.editor.scrollTop = scrollRatio * editorScrollHeight;

    setTimeout(() => { isScrollingPreview = false; }, 50);
  }

  /**
   * Resizable Pane Gutter (Desktop and Touch Screens)
   */
  function initResizer() {
    if (!DOM.resizer) return;

    DOM.resizer.addEventListener('pointerdown', (e) => {
      state.isDraggingResizer = true;
      DOM.resizer.classList.add('dragging');
      if (DOM.resizer.setPointerCapture) {
        try { DOM.resizer.setPointerCapture(e.pointerId); } catch (_) {}
      }
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    });

    DOM.resizer.addEventListener('pointermove', (e) => {
      if (!state.isDraggingResizer || state.viewMode !== 'split' || window.innerWidth <= 1024) return;

      const container = DOM.app.querySelector('.workspace-container');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const pointerOffset = e.clientX - rect.left;
      const containerWidth = rect.width;
      const previewWidth = Math.max(220, Math.min(containerWidth - 220, pointerOffset));
      const editorWidth = containerWidth - previewWidth;

      DOM.paneEditor.style.flex = `0 0 ${editorWidth}px`;
      DOM.panePreview.style.flex = `0 0 ${previewWidth}px`;
    });

    const stopDrag = (e) => {
      if (state.isDraggingResizer) {
        state.isDraggingResizer = false;
        DOM.resizer.classList.remove('dragging');
        if (e && DOM.resizer.releasePointerCapture && e.pointerId) {
          try { DOM.resizer.releasePointerCapture(e.pointerId); } catch (_) {}
        }
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    DOM.resizer.addEventListener('pointerup', stopDrag);
    DOM.resizer.addEventListener('pointercancel', stopDrag);
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
    .standalone-container .bidi-callout {
      margin: 1.4rem 0;
      padding: 0.95rem 1.25rem;
      border-radius: 10px;
      border-right: 4.5px solid var(--accent, #a33527);
      background-color: rgba(163, 53, 39, 0.05);
    }
    .standalone-container .bidi-callout[dir="ltr"] {
      border-left: 4.5px solid var(--accent, #a33527);
      border-right: none;
    }
    .standalone-container .callout-header {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
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
    closeExportMenu();
    closeMobileMenu();

    const html = DOM.previewInner.innerHTML;
    const plain = DOM.previewInner.innerText;

    let copied = false;
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      try {
        const blobHtml = new Blob([html], { type: 'text/html' });
        const blobPlain = new Blob([plain], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobPlain
          })
        ]);
        copied = true;
        showToast('متن با فرمت (Rich Text) در کلیپ‌بورد کپی شد.');
      } catch (e) {
        console.warn('ClipboardItem failed, trying plain text fallback', e);
      }
    }

    if (!copied) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(plain);
          showToast('متن در کلیپ‌بورد کپی شد.');
        } else {
          const tempArea = document.createElement('textarea');
          tempArea.value = plain;
          tempArea.style.position = 'fixed';
          tempArea.style.left = '-9999px';
          document.body.appendChild(tempArea);
          tempArea.select();
          document.execCommand('copy');
          tempArea.remove();
          showToast('متن در کلیپ‌بورد کپی شد.');
        }
      } catch (err) {
        console.error(err);
        showToast('خطا در دسترسی به کلیپ‌بورد.');
      }
    }
  }

  async function printDocument() {
    if (state.isExportingPdf) {
      showToast('تبدیل به PDF هم‌اکنون در حال انجام است...');
      return;
    }

    closeExportMenu();
    closeMobileMenu();
    closeToc();
    if (DOM.aboutModal) closeModal(DOM.aboutModal);
    if (DOM.shortcutsModal) closeModal(DOM.shortcutsModal);

    if (!window.html2pdf) {
      showToast('کتابخانه ساخت PDF هنوز بارگذاری نشده است.');
      return;
    }

    state.isExportingPdf = true;
    if (DOM.pdfModal) {
      DOM.pdfModal.classList.add('active');
      DOM.pdfModal.setAttribute('aria-hidden', 'false');
    }

    // Yield to allow browser paint loop to display the loading modal and spinner cleanly before heavy work
    await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 80)));

    let wrapper = null;
    try {
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

      // Fix task checkboxes in PDF
      clone.querySelectorAll('.task-checkbox-input').forEach(input => {
        const span = document.createElement('span');
        span.textContent = input.checked ? '☑ ' : '☐ ';
        span.style.fontSize = '1.1em';
        span.style.color = input.checked ? '#a33527' : '#888888';
        if (input.parentNode) {
          input.parentNode.replaceChild(span, input);
        }
      });

      // Fix list bullets for PDF export
      clone.querySelectorAll('ul.bidi-list, ul').forEach(ul => {
        ul.style.listStyle = 'none';
        ul.style.paddingRight = '0';
        ul.style.marginRight = '0';
        ul.querySelectorAll('li').forEach(li => {
          if (!li.classList.contains('task-list-item') && !li.querySelector('.pdf-bullet')) {
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
          }
        });
      });

      // Fix code blocks font
      clone.querySelectorAll('.codeblock-pre, .codeblock-pre code').forEach(el => {
        el.style.fontFamily = "'JetBrains Mono', 'Vazirmatn', monospace";
        el.style.letterSpacing = 'normal';
      });

      // High-quality print wrapper appended to body during capture
      wrapper = document.createElement('div');
      wrapper.setAttribute('data-theme', 'editorial');
      wrapper.style.position = 'fixed';
      wrapper.style.left = '-9999px';
      wrapper.style.top = '0';
      wrapper.style.width = '750px';
      wrapper.style.padding = '25px 30px';
      wrapper.style.direction = 'rtl';
      wrapper.style.textAlign = 'right';
      wrapper.style.fontFamily = "'Vazirmatn', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif";
      wrapper.style.backgroundColor = '#ffffff';
      wrapper.style.color = '#1c1e21';
      wrapper.style.boxSizing = 'border-box';
      wrapper.style.letterSpacing = 'normal';
      wrapper.style.zIndex = '-1000';

      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      // Adaptive scale: mobile devices use 1.4 for fast, memory-safe rendering; desktop uses 1.8 for crisp vectors
      const isMobileDevice = window.innerWidth <= 1024 || ('ontouchstart' in window);
      const canvasScale = isMobileDevice ? 1.4 : 1.8;

      const opt = {
        margin: [14, 12, 14, 12],
        filename: `rastnegar-document-${Date.now()}.pdf`,
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: {
          scale: canvasScale,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      };

      // Wrap in a 30s timeout watchdog to prevent infinite hang if canvas fails
      await Promise.race([
        html2pdf().set(opt).from(wrapper).save(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('PDF generation timed out')), 30000))
      ]);

      showToast('فایل PDF با موفقیت آماده و دانلود شد.');
    } catch (err) {
      console.error('PDF generation error:', err);
      showToast('خطا در تولید فایل PDF. لطفاً مجدداً امتحان کنید.');
    } finally {
      if (wrapper && wrapper.parentNode) {
        wrapper.remove();
      }
      if (DOM.pdfModal) {
        DOM.pdfModal.classList.remove('active');
        DOM.pdfModal.setAttribute('aria-hidden', 'true');
      }
      state.isExportingPdf = false;
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

    // 1.1 Tab Indentation and Markdown Auto-pairing inside editor
    DOM.editor.addEventListener('keydown', (e) => {
      // Tab / Shift+Tab Indentation
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = DOM.editor.selectionStart;
        const end = DOM.editor.selectionEnd;
        const value = DOM.editor.value;

        if (start === end) {
          // No selection: Insert 2 spaces
          if (document.execCommand) {
            document.execCommand('insertText', false, '  ');
          } else {
            DOM.editor.setRangeText('  ', start, end, 'end');
          }
        } else {
          // Multiline selection
          const lineStart = value.lastIndexOf('\n', start - 1) + 1;
          const lineEnd = value.indexOf('\n', end);
          const blockEnd = lineEnd === -1 ? value.length : lineEnd;
          const lines = value.substring(lineStart, blockEnd).split('\n');

          if (e.shiftKey) {
            // Outdent
            const newLines = lines.map(line => line.startsWith('  ') ? line.substring(2) : (line.startsWith(' ') ? line.substring(1) : line));
            const newText = newLines.join('\n');
            DOM.editor.setRangeText(newText, lineStart, blockEnd, 'select');
          } else {
            // Indent
            const newLines = lines.map(line => '  ' + line);
            const newText = newLines.join('\n');
            DOM.editor.setRangeText(newText, lineStart, blockEnd, 'select');
          }
        }
        renderPreview();
        updateStats();
        return;
      }

      // Markdown auto-pairing when text is selected
      const pairs = {
        '*': '*',
        '`': '`',
        '[': ']',
        '(': ')',
        '{': '}',
        '«': '»',
        '"': '"'
      };

      if (pairs[e.key]) {
        const start = DOM.editor.selectionStart;
        const end = DOM.editor.selectionEnd;
        if (start !== end) {
          e.preventDefault();
          const open = e.key;
          const close = pairs[e.key];
          const selected = DOM.editor.value.substring(start, end);
          const wrapped = open + selected + close;
          if (document.execCommand) {
            document.execCommand('insertText', false, wrapped);
          } else {
            DOM.editor.setRangeText(wrapped, start, end, 'end');
          }
          DOM.editor.setSelectionRange(start + open.length, end + open.length);
          renderPreview();
          updateStats();
        }
      }
    });

    // 1.2 Interactive Task Checkbox Syncing with Markdown Editor
    DOM.previewInner.addEventListener('change', (e) => {
      if (e.target && e.target.classList.contains('task-checkbox-input')) {
        const checkboxes = Array.from(DOM.previewInner.querySelectorAll('.task-checkbox-input'));
        const index = checkboxes.indexOf(e.target);
        if (index === -1) return;

        let currentIndex = 0;
        let editorText = DOM.editor.value;
        const taskRegex = /^(\s*[-*+]\s*\[)([ xX])(\]\s*.*)$/gm;

        const updatedText = editorText.replace(taskRegex, (match, prefix, check, suffix) => {
          if (currentIndex === index) {
            currentIndex++;
            const newCheck = e.target.checked ? 'x' : ' ';
            return `${prefix}${newCheck}${suffix}`;
          }
          currentIndex++;
          return match;
        });

        if (updatedText !== editorText) {
          DOM.editor.value = updatedText;
          renderPreview();
          updateStats();
        }
      }
    });

    // 1.3 Smooth Scrolling for Internal Section Anchors
    DOM.previewInner.addEventListener('click', (e) => {
      const anchor = e.target.closest('a[href^="#"]');
      if (anchor) {
        const href = anchor.getAttribute('href');
        if (href && href.length > 1) {
          e.preventDefault();
          const targetId = href.substring(1);
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    });

    // 1.4 Mobile History Navigation for Drawers
    window.addEventListener('popstate', () => {
      if (DOM.tocDrawer && DOM.tocDrawer.classList.contains('open')) closeToc();
      if (DOM.mobileMenuDrawer && DOM.mobileMenuDrawer.classList.contains('open')) closeMobileMenu();
      if (DOM.aboutModal && DOM.aboutModal.classList.contains('active')) closeModal(DOM.aboutModal);
      if (DOM.shortcutsModal && DOM.shortcutsModal.classList.contains('active')) closeModal(DOM.shortcutsModal);
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

    // 15. Digits Mode Toggles
    if (DOM.btnToggleDigits) {
      DOM.btnToggleDigits.addEventListener('click', togglePersianDigits);
    }
    if (DOM.btnMobileToggleDigits) {
      DOM.btnMobileToggleDigits.addEventListener('click', () => {
        togglePersianDigits();
        closeMobileMenu();
      });
    }
  }

  /**
   * Toolbar Action Handler
   */
  function handleToolbarAction(action) {
    switch (action) {
      case 'digits':
        togglePersianDigits();
        break;
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
