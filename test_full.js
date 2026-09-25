const fs = require('fs');
const { JSDOM } = require('jsdom');
const markedCode = fs.readFileSync('./public/vendor/marked.min.js', 'utf8');
const DOMPurifyCode = fs.readFileSync('./public/vendor/purify.min.js', 'utf8');
const bidiCode = fs.readFileSync('./public/js/bidi-engine.js', 'utf8');

const dom = new JSDOM('', { runScripts: 'dangerously' });
dom.window.eval(markedCode);
dom.window.eval(DOMPurifyCode);
dom.window.eval(bidiCode);

const md = **C2** ???? **Command and Control** ???.

**????? C2:**
- **???? C2:** ???????? ??? (?? VPS)
- **Agent / Implant:** ????????? ?? ??? ????? ??? ??? ??????;

const result = dom.window.RastNegarBiDi.renderMarkdown(md);
console.log(result.html);
