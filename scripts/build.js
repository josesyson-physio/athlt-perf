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

// 3. Make it small and fast: one minified script bundle (the coach workspace is a separate chunk
//    loaded on demand), one engine file, one stylesheet. A size budget stops it quietly growing.
const esbuild = require('esbuild');
const zlib = require('zlib');
const target = ['es2020', 'chrome90', 'safari15', 'firefox90'];
fs.rmSync(path.join(dist, 'js'), { recursive: true, force: true });
const bundle = esbuild.buildSync({
  entryPoints: [path.join(root, 'app/js/main.js')], bundle: true, splitting: true, format: 'esm', minify: true,
  target, outdir: path.join(dist, 'js'), entryNames: '[name]', chunkNames: 'c-[hash]', legalComments: 'eof', logLevel: 'warning', metafile: true,
});
fs.copyFileSync(path.join(root, 'app/js/vendor/LICENSE-htm'), path.join(dist, 'js/LICENSE-htm'));

const ENGINES = ['engine.js', 'metrics.js', 'monitor.js', 'tests.js'];
fs.mkdirSync(path.join(dist, 'engine'), { recursive: true });
const engine = ENGINES.map((f) => read('engine/' + f)).join(';\n');
fs.writeFileSync(path.join(dist, 'engine/core.js'), esbuild.transformSync(engine, { minify: true, target }).code);

const css = ['styles.css', 'athlete.css'].map((f) => read('app/' + f)).join('\n');
fs.writeFileSync(path.join(dist, 'app.css'), esbuild.transformSync(css, { loader: 'css', minify: true, target }).code);
for (const f of ['styles.css', 'athlete.css']) fs.rmSync(path.join(dist, f));

let page = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const swap = (from, to) => { if (!page.includes(from)) throw new Error('index.html is missing: ' + from); page = page.replace(from, to); };
swap('<link rel="stylesheet" href="styles.css">\n<link rel="stylesheet" href="athlete.css">', '<link rel="stylesheet" href="app.css">');
swap(ENGINES.map((f) => '<script defer src="engine/' + f + '"></script>').join('\n'), '<script defer src="engine/core.js"></script>');
swap('<script type="module" src="js/main.js"></script>', '<link rel="modulepreload" href="js/main.js">\n<script type="module" src="js/main.js"></script>');
fs.writeFileSync(path.join(dist, 'index.html'), page);

const gz = (f) => zlib.gzipSync(fs.readFileSync(path.join(dist, f))).length;
// The first screen needs the page, styles, engine, font, main bundle and the chunks it imports up front.
const outs = bundle.metafile.outputs;
const staticChunks = (out) => (outs[out].imports || []).filter((i) => i.kind === 'import-statement').map((i) => i.path);
const mainOut = Object.keys(outs).find((o) => o.endsWith('js/main.js'));
const firstLoad = ['index.html', 'app.css', 'engine/core.js', 'fonts/plus-jakarta-sans-latin.woff2']
  .concat([mainOut].concat(staticChunks(mainOut)).map((o) => path.relative(dist, path.resolve(root, o))));
const kb = (n) => Math.round(n / 102.4) / 10;
const firstKb = kb(firstLoad.reduce((n, f) => n + gz(f), 0));
const BUDGET_KB = 130;
console.log('First load: ' + firstKb + ' KB gzipped (budget ' + BUDGET_KB + ' KB)');
if (firstKb > BUDGET_KB) throw new Error('First load is ' + firstKb + ' KB, over the ' + BUDGET_KB + ' KB budget. Trim it or raise the budget on purpose.');

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
