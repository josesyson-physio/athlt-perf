// Builds two outputs from prototype/template.html and engine/engine.js:
//   prototype/motionplus-vo2.html  single file with the engine inlined (web preview)
//   dist/                          installable offline app (GitHub Pages)
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const tpl = read('prototype/template.html');
const engine = read('engine/engine.js');
const ENGINE_BLOCK = '<script>\n/*ENGINE*/\n</script>';
if (!tpl.includes(ENGINE_BLOCK) || !tpl.includes('<!--HEAD-->') || !tpl.includes('<!--PWA-->')) {
  throw new Error('template.html is missing a build marker');
}

// 1. Single-file preview.
const preview = tpl
  .replace(ENGINE_BLOCK, () => '<script>\n' + engine + '\n</script>')
  .replace('<!--HEAD-->\n', '')
  .replace('<!--PWA-->\n', '');
fs.writeFileSync(path.join(root, 'prototype/motionplus-vo2.html'), preview);

// 2. Offline app.
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'icons'), { recursive: true });

const head = [
  '<meta name="theme-color" content="#16213a">',
  '<meta name="description" content="VO2 max testing ranked by accuracy, with safety screening and traceable results. Works offline.">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="icon" href="icons/icon.svg" type="image/svg+xml">',
  '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="MotionPlus">',
  '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}img{max-width:100%}</style>',
].join('\n');

const index =
  '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
  tpl
    .replace(ENGINE_BLOCK, '<script src="engine.js"></script>')
    .replace('<!--HEAD-->', head)
    .replace('<!--PWA-->', '<script src="pwa.js"></script>') +
  '</html>\n';

const files = {
  'index.html': index,
  'engine.js': engine,
  'pwa.js': read('app/pwa.js'),
  'manifest.webmanifest': read('app/manifest.webmanifest'),
};
for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dist, name), body);
const icons = fs.readdirSync(path.join(root, 'app/icons'));
for (const f of icons) fs.copyFileSync(path.join(root, 'app/icons', f), path.join(dist, 'icons', f));

const precache = ['./', 'index.html', 'engine.js', 'pwa.js', 'manifest.webmanifest', ...icons.map((f) => 'icons/' + f)];
const hash = crypto.createHash('sha256');
for (const f of precache.slice(1)) hash.update(fs.readFileSync(path.join(dist, f)));
const buildId = hash.digest('hex').slice(0, 12);
fs.writeFileSync(
  path.join(dist, 'sw.js'),
  read('app/sw.js').replace('__BUILD_ID__', buildId).replace('__APP_FILES__', JSON.stringify(precache))
);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');

console.log('Built prototype/motionplus-vo2.html and dist/ (build ' + buildId + ')');
