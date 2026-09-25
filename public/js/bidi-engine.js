/**
 * RastNegar - Advanced BiDi & RTL Markdown Engine
 * Powered by the core philosophy and algorithms of dariubs/rtlmd
 * Author: Mohammad Mahdi Nosrati (https://t.me/mmn_dev)
 */

(function (window) {
  'use strict';

  // Unicode character range definitions for RTL scripts (Persian, Arabic, Hebrew, etc.)
  const RTL_CHAR_REGEX = /[\u0600-\u06FF\u0750-\u077F\u0590-\u05FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const LTR_CHAR_REGEX = /[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02B8]/;

  // Clean Markdown formatting tokens to find the actual first text character
  const STRIP_MD_REGEX = /^(?:[#>*\-+\d.]\s*|\[[ xX]\]\s*|`+)+/;

  /**
   * Detects whether a block should have RTL or LTR direction.
   * Based on dariubs/rtlmd core principles:
   * In Persian / RTL Markdown documents, any block that contains Persian/Arabic letters
   * must be treated as RTL. Only blocks that are completely English (no Persian letters)
   * will be rendered as LTR.
   * @param {string} text 
   * @returns {'rtl' | 'ltr'}
   */
  function detectBlockDirection(text) {
    if (!text || typeof text !== 'string') return 'rtl';

    // Strip leading Markdown syntax (e.g. "### ", "* ", "1. ", "> ", "- [x] ")
    const cleanText = text.replace(STRIP_MD_REGEX, '').trim();

    let rtlCount = 0;
    let ltrCount = 0;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      if (RTL_CHAR_REGEX.test(char)) {
        rtlCount++;
        break; // A single Persian/Arabic letter makes the block context RTL
      }
      if (LTR_CHAR_REGEX.test(char)) {
        ltrCount++;
      }
    }

    if (rtlCount > 0) return 'rtl';
    if (ltrCount > 0) return 'ltr';
    return 'rtl';
  }

  /**
   * Converts English digits to Persian digits
   * @param {string} str 
   * @returns {string}
   */
  function toPersianDigits(str) {
    if (!str) return '';
    const persianMap = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    return str.toString().replace(/\d/g, (d) => persianMap[parseInt(d, 10)]);
  }

  /**
   * Converts Persian digits to English digits
   * @param {string} str 
   * @returns {string}
   */
  function toEnglishDigits(str) {
    if (!str) return '';
    const faDigits = '۰۱۲۳۴۵۶۷۸۹';
    return str.toString().replace(/[۰-۹]/g, (w) => faDigits.indexOf(w));
  }

  /**
   * Generates a clean slug for heading anchors
   * @param {string} text 
   * @returns {string}
   */
  function slugify(text) {
    if (!text || typeof text !== 'string') return '';
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF\- ]+/g, '')
      .replace(/\s+/g, '-');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Copy code from code block button
   */
  function copyCode(btn) {
    const wrapper = btn.closest('.codeblock-wrapper');
    if (!wrapper) return;
    const codeElement = wrapper.querySelector('pre code');
    if (!codeElement) return;

    const text = codeElement.innerText || codeElement.textContent;
    navigator.clipboard.writeText(text).then(() => {
      const copyText = btn.querySelector('.copy-text');
      const originalText = copyText ? copyText.textContent : 'کپی';
      if (copyText) copyText.textContent = 'کپی شد!';
      btn.classList.add('copied');
      setTimeout(() => {
        if (copyText) copyText.textContent = originalText;
        btn.classList.remove('copied');
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy code: ', err);
    });
  }

  /**
   * Render Markdown text to HTML using BiDi pipeline and full token resolution
   */
  function renderMarkdown(markdownText, options = {}) {
    const headings = [];

    const renderer = {
      // 1. Headings - BiDi isolated so parentheses, emoji and numbers never flip
      heading(token) {
        const text = typeof token === 'object' ? token.text : token;
        const depth = typeof token === 'object' ? token.depth : 1;
        const dir = detectBlockDirection(text);
        const id = slugify(text || '') || `heading-${headings.length + 1}`;
        const inlineHtml = (token.tokens && this.parser) ? this.parser.parseInline(token.tokens) : text;

        headings.push({
          id,
          text,
          level: depth,
          dir
        });

        return `<h${depth} id="${id}" class="content-heading" dir="${dir}">
          <a href="#${id}" class="heading-anchor" title="پیوند مستقیم به این بخش">#</a>
          <span class="heading-text"><bdi>${inlineHtml}</bdi></span>
        </h${depth}>\n`;
      },

      // 2. Paragraphs - naturally right-aligned RTL with BiDi detection
      paragraph(token) {
        const text = typeof token === 'object' ? token.text : token;
        const dir = detectBlockDirection(text);
        const inlineHtml = (token.tokens && this.parser) ? this.parser.parseInline(token.tokens) : text;
        return `<p dir="${dir}" class="bidi-block">${inlineHtml}</p>\n`;
      },

      // 3. Blockquotes - RTL bordered quote blocks
      blockquote(token) {
        const text = typeof token === 'object' ? token.text : token;
        const dir = detectBlockDirection(text);
        const body = (token.tokens && this.parser) ? this.parser.parse(token.tokens) : text;
        return `<blockquote dir="${dir}" class="bidi-quote">
          <div class="quote-content">${body}</div>
        </blockquote>\n`;
      },

      // 4. List items - Clean task lists & standard lists with RTL bullet alignment
      listitem(token) {
        const text = typeof token === 'object' ? token.text : token;
        const dir = detectBlockDirection(text);
        const isTask = typeof token === 'object' ? !!token.task : false;
        const isChecked = typeof token === 'object' ? !!token.checked : false;

        let body = '';
        if (token.tokens && this.parser) {
          body = this.parser.parse(token.tokens, !!token.loose);
        } else {
          body = text;
        }

        if (isTask) {
          return `<li dir="${dir}" class="task-list-item">
            <span class="task-checkbox ${isChecked ? 'checked' : ''}" aria-hidden="true">${isChecked ? '☑' : '☐'}</span>
            <span class="task-label">${body}</span>
          </li>\n`;
        }
        return `<li dir="${dir}" class="bidi-list-item">${body}</li>\n`;
      },

      // 5. Code blocks - Strictly LTR with syntax highlighting & copy button (rtlmd principle)
      code(token) {
        const code = typeof token === 'object' ? token.text : token;
        let lang = ((typeof token === 'object' ? token.lang : '') || 'plaintext').trim().toLowerCase();

        // Common language alias resolution
        const langAliases = {
          'sh': 'bash', 'shell': 'bash', 'zsh': 'bash', 'console': 'bash', 'terminal': 'bash',
          'cmd': 'batch', 'bat': 'batch', 'dos': 'batch',
          'ps1': 'powershell', 'ps': 'powershell', 'posh': 'powershell',
          'yml': 'yaml',
          'golang': 'go',
          'md': 'markdown',
          'py': 'python',
          'js': 'javascript',
          'ts': 'typescript',
          'dockerfile': 'docker'
        };
        if (langAliases[lang]) {
          lang = langAliases[lang];
        }

        let highlighted = '';
        if (window.Prism && window.Prism.languages[lang]) {
          try {
            highlighted = window.Prism.highlight(code, window.Prism.languages[lang], lang);
          } catch (e) {
            highlighted = escapeHtml(code);
          }
        } else {
          highlighted = escapeHtml(code);
        }

        const displayLang = lang || 'کد';

        return `<div class="codeblock-wrapper" dir="ltr">
          <div class="codeblock-header">
            <span class="codeblock-lang">${displayLang}</span>
            <button type="button" class="btn-copy-code" onclick="RastNegarBiDi.copyCode(this)" title="کپی کردن کد">
              <span class="copy-text">کپی</span>
            </button>
          </div>
          <pre class="codeblock-pre language-${lang}"><code class="language-${lang}">${highlighted}</code></pre>
        </div>\n`;
      },

      // 6. Inline code - strictly isolated with <bdi> (rtlmd principle)
      codespan(token) {
        const code = typeof token === 'object' ? token.text : token;
        return `<code class="inline-code" dir="ltr"><bdi>${escapeHtml(code)}</bdi></code>`;
      },

      // 7. Tables - full RTL support with responsive wrapping
      table(token) {
        if (typeof token !== 'object' || !token.header) return '';

        let headerCells = '';
        for (let i = 0; i < token.header.length; i++) {
          const c = token.header[i];
          const align = (token.align && token.align[i]) ? ` style="text-align:${token.align[i]}"` : '';
          const cellContent = (c.tokens && this.parser) ? this.parser.parseInline(c.tokens) : c.text;
          headerCells += `<th${align}>${cellContent}</th>`;
        }

        let bodyRows = '';
        if (token.rows && Array.isArray(token.rows)) {
          for (const row of token.rows) {
            let rowCells = '';
            for (let i = 0; i < row.length; i++) {
              const c = row[i];
              const align = (token.align && token.align[i]) ? ` style="text-align:${token.align[i]}"` : '';
              const cellContent = (c.tokens && this.parser) ? this.parser.parseInline(c.tokens) : c.text;
              rowCells += `<td${align}>${cellContent}</td>`;
            }
            bodyRows += `<tr>${rowCells}</tr>\n`;
          }
        }

        return `<div class="table-responsive" dir="rtl">
          <table class="bidi-table">
            <thead><tr>${headerCells}</tr></thead>
            <tbody>${bodyRows}</tbody>
          </table>
        </div>\n`;
      }
    };

    let processedText = markdownText || '';

    // Create a fresh Marked instance with BiDi renderer
    const markedInstance = new window.marked.Marked();
    markedInstance.use({
      renderer,
      gfm: true,
      breaks: true,
      pedantic: false
    });

    const rawHtml = markedInstance.parse(processedText);
    const cleanHtml = window.DOMPurify ? window.DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ['bdi', 'wbr'],
      ADD_ATTR: ['dir', 'target', 'onclick', 'id', 'class', 'style', 'aria-hidden']
    }) : rawHtml;

    return {
      html: cleanHtml,
      headings: headings
    };
  }

  // Export to global scope
  window.RastNegarBiDi = {
    detectBlockDirection,
    toPersianDigits,
    toEnglishDigits,
    slugify,
    renderMarkdown,
    copyCode
  };

})(window);
