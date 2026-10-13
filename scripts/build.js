// Inlines engine/engine.js into the single-page prototype.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const tpl = fs.readFileSync(path.join(root, 'prototype/template.html'), 'utf8');
const engine = fs.readFileSync(path.join(root, 'engine/engine.js'), 'utf8');
fs.writeFileSync(path.join(root, 'prototype/motionplus-vo2.html'), tpl.replace('/*ENGINE*/', () => engine));
console.log('Built prototype/motionplus-vo2.html');
