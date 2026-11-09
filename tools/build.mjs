// Bundles each entry in src/ into one stylesheet.
//
// Local `@import "./file.css";` lines are inlined depth-first in source order, so the shipped theme
// is ONE request (chained @imports load one after another and flash unstyled UI).
// Remote imports (`@import url("https://...")`) are hoisted to the top of the bundle, because CSS
// ignores an @import that follows any other rule.
//
//   node tools/build.mjs            dist/v1/prowlogue.css and dist/v1/prowlogue-lite.css, minified, with
//                                   dist/v1/potato-mode.js as written, their notices and dist/_headers: dist/ is
//                                   exactly what Cloudflare Pages publishes
//
// Zero dependencies. Minifying only removes comments and whitespace; selectors
// keep their spaces around > + ~, so what ships still reads like the source, and gzip takes those
// spaces anyway.
import { copyFileSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));

// The theme, and the theme with potato mode on (src/tokens.css).
export const entries = ['prowlogue.css', 'prowlogue-lite.css'];

const importPattern = /^[ \t]*@import\s+(?:url\(\s*)?(["'])([^"']+)\1\s*\)?\s*;[ \t]*\r?\n?/gm;

export function bundle(name = 'prowlogue.css') {
    const remote = [];
    const seen = new Set();

    const inline = (file) => {
        if (seen.has(file)) throw new Error(`Circular or duplicate @import: ${relative(root, file)}`);
        seen.add(file);
        const css = readFileSync(file, 'utf8');
        return css.replace(importPattern, (line, _quote, target) => {
            if (/^(https?:)?\/\//.test(target)) {
                remote.push(line.trim());
                return '';
            }
            const child = resolve(dirname(file), target);
            return `/* ── ${relative(root, child).replaceAll('\\', '/')} ── */\n${inline(child)}\n`;
        });
    };

    const body = inline(resolve(root, 'src', name));
    const banner = `/*! ${pkg.title} v${pkg.version} | (c) 2026 ${pkg.author} | ${pkg.license} | ${pkg.homepage} */\n`;
    return banner + [...new Set(remote)].map((line) => `${line}\n`).join('') + body;
}

// Splits CSS into [code, string or comment, code, ...], so edits to the code can't touch a string.
const protectedText = /("(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'|\/\*[\s\S]*?\*\/)/;

export function minify(css) {
    const banner = css.slice(0, css.indexOf('\n') + 1);
    const noComments = css.slice(banner.length)
        .split(protectedText)
        .map((piece, index) => (index % 2 && piece.startsWith('/*') ? ' ' : piece))
        .join('');
    // A custom property set to nothing but a space keeps that space: `--x: ;` is an empty value in every engine,
    // where older ones reject `--x:;`.
    const tight = noComments
        .split(protectedText)
        .map((piece, index) => (index % 2 ? piece : piece
            .replace(/\s+/g, ' ')
            .replace(/ ?([{};,]) ?/g, '$1')
            .replace(/([\w-]): /g, '$1:')
            .replace(/ !important/g, '!important')
            .replace(/;}/g, '}')
            .replace(/(--[\w-]+):(?=[;}])/g, '$1: ')
            .replace(/}/g, '}\n')))
        .join('');
    return `${banner}${tight.trim()}\n`;
}

function build() {
    const started = performance.now();
    const outDir = resolve(root, 'dist/v1');
    mkdirSync(outDir, { recursive: true });
    const kb = (size) => (size / 1024).toFixed(1);
    const sizes = entries.map((name) => {
        const css = minify(bundle(name));
        writeFileSync(resolve(outDir, name), css);
        return `${relative(root, resolve(outDir, name)).split(sep).join('/')} (${kb(Buffer.byteLength(css))} KB, ${kb(gzipSync(css).length)} KB gzip)`;
    });
    copyFileSync(resolve(root, 'src/potato-mode.js'), resolve(outDir, 'potato-mode.js'));
    copyFileSync(resolve(root, 'NOTICE'), resolve(outDir, 'NOTICE.txt'));
    copyFileSync(resolve(root, 'LICENSE'), resolve(outDir, 'LICENSE.txt'));
    copyFileSync(resolve(root, '_headers'), resolve(root, 'dist/_headers'));
    console.log(`built ${sizes.join(', ')} in ${Math.round(performance.now() - started)} ms`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) build();
