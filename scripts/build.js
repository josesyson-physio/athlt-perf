// Builds:
//   dist/                          installable offline app (published to GitHub Pages)
//   prototype/motionplus-vo2.html  single-file VO2 preview with the engine inlined
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// 1. Single-file VO2 preview (kept for sharing as one page).
const tpl = read('prototype/template.html');
const ENGINE_BLOCK = '<script>\n/*ENGINE*/\n</script>';
if (!tpl.includes(ENGINE_BLOCK)) throw new Error('prototype/template.html is missing the engine marker');
fs.writeFileSync(
  path.join(root, 'prototype/motionplus-vo2.html'),
  tpl.replace(ENGINE_BLOCK, () => '<script>\n' + read('engine/engine.js') + '\n</script>').replace('<!--HEAD-->\n', '').replace('<!--PWA-->\n', '')
);

// 2. Offline app.
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
const skip = (f) => f.endsWith('.test.js') || f.endsWith('.test.mjs') || f === 'sw.js' || f === 'package.json';
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d);
    else if (!skip(e.name)) fs.copyFileSync(s, d);
  }
}
copyDir(path.join(root, 'app'), dist);
fs.mkdirSync(path.join(dist, 'engine'), { recursive: true });
for (const f of ['engine.js', 'metrics.js', 'monitor.js']) fs.copyFileSync(path.join(root, 'engine', f), path.join(dist, 'engine', f));

function list(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? list(path.join(dir, e.name), base + e.name + '/') : [base + e.name]));
}
const files = list(dist).filter((f) => !f.startsWith('.')).sort();
const hash = crypto.createHash('sha256');
for (const f of files) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
const buildId = hash.digest('hex').slice(0, 12);
fs.writeFileSync(path.join(dist, 'sw.js'), read('app/sw.js').replace('__BUILD_ID__', buildId).replace('__APP_FILES__', JSON.stringify(['./'].concat(files))));
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log('Built dist/ (' + files.length + ' files, build ' + buildId + ') and prototype/motionplus-vo2.html');
