// After each build: add a content hash to the main script and stylesheet links (?v=…), so phones
// always load the newest version instead of an old cached copy.
import fs from 'node:fs'; import crypto from 'node:crypto';
const h = f => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 10);
const files = { 'js/build/app.js': h('js/build/app.js'), 'js/build/portal.js': h('js/build/portal.js'), 'css/style.css': h('css/style.css'), 'css/portal.css': h('css/portal.css') };
for (const page of ['index.html', 'portal/index.html', 'portal/setup.html']) {
  let s = fs.readFileSync(page, 'utf8');
  for (const [f, v] of Object.entries(files)) s = s.replace(new RegExp(`(${f.replace(/[./]/g, m => '\\' + m)})(\\?v=[0-9a-f]+)?(?=["'])`, 'g'), `$1?v=${v}`);
  fs.writeFileSync(page, s);
}
console.log('stamped', files);
