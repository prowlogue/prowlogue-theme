// Static guardrails over what ships in dist/v1 (the two stylesheets and potato-mode.js). `npm test` builds first.
// Each test encodes a rule that is cheap to check and expensive to get wrong.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Script } from 'node:vm';
import { bundle, entries } from '../tools/build.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '');
const shipped = (name) => withoutComments(readFileSync(resolve(root, 'dist/v1', name), 'utf8'));
const code = shipped('prowlogue.css');

// The first header lets a load use the browser's copy at once and still fetch a deploy in the background. Without
// the second, the domain's cache keeps a deploy from a returning user for hours, with no error anywhere.
test('a load uses its copy at once and a deploy arrives one load later', () => {
    const headers = readFileSync(resolve(root, 'dist/_headers'), 'utf8');
    assert.match(headers, /^\s+Cache-Control: max-age=0, stale-while-revalidate=604800\s*$/m);
    assert.match(headers, /^\s+Cloudflare-CDN-Cache-Control: no-store\s*$/m);
});

test('the licence and notices ship beside the stylesheets', () => {
    assert.ok(existsSync(resolve(root, 'dist/v1/NOTICE.txt')), 'dist/v1/NOTICE.txt is missing');
    assert.ok(existsSync(resolve(root, 'dist/v1/LICENSE.txt')), 'dist/v1/LICENSE.txt is missing');
});

// Walks the stylesheet's blocks: at-rule preludes vs style-rule selectors, and nesting depth.
function blocks(source) {
    const found = [];
    const stack = [];
    let prelude = '';
    let quote = null;
    for (const char of source) {
        if (quote) {
            if (char === quote) quote = null;
            prelude += char;
            continue;
        }
        if (char === '"' || char === "'") {
            quote = char;
            prelude += char;
        } else if (char === '{') {
            const text = prelude.trim();
            const parent = stack.at(-1);
            const kind = text.startsWith('@') ? 'at' : parent?.keyframes ? 'frame' : 'rule';
            found.push({ kind, text, nestedInRule: parent?.kind === 'rule' });
            stack.push({ kind, keyframes: /^@(-webkit-)?keyframes\b/.test(text) });
            prelude = '';
        } else if (char === '}') {
            stack.pop();
            prelude = '';
        } else if (char === ';') {
            prelude = '';
        } else {
            prelude += char;
        }
    }
    return found;
}

// Splits a selector list on top-level commas (not inside parentheses or brackets).
function selectorList(text) {
    const parts = [];
    let depth = 0;
    let current = '';
    for (const char of text) {
        if (char === '(' || char === '[') depth++;
        if (char === ')' || char === ']') depth--;
        if (char === ',' && depth === 0) {
            parts.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    parts.push(current.trim());
    return parts;
}

const allBlocks = blocks(code);
const styleRules = allBlocks.filter((block) => block.kind === 'rule');

// Only what ships belongs in src/: a file no bundle imports would be published without ever being used.
test('every file in src/ reaches a bundle', () => {
    const reached = new Set();
    const visit = (file) => {
        reached.add(file);
        const source = withoutComments(readFileSync(file, 'utf8'));
        for (const [, target] of source.matchAll(/@import\s+"(\.[^"]+)"/g)) visit(resolve(dirname(file), target));
    };
    for (const name of entries) visit(resolve(root, 'src', name));
    const files = readdirSync(resolve(root, 'src'), { recursive: true })
        .filter((file) => file.endsWith('.css'))
        .map((file) => resolve(root, 'src', file));
    assert.deepEqual(files.filter((file) => !reached.has(file)), []);
});

test('the bundle is not empty', () => {
    assert.ok(styleRules.length > 0, 'dist/v1/prowlogue.css has no style rules');
});

test('each shipped bundle keeps every rule of its source, in order', () => {
    const selectors = (source) => blocks(source)
        .filter((block) => block.kind === 'rule')
        .map((block) => block.text.replace(/\s+/g, ' ').replace(/ ?, ?/g, ','));
    for (const name of entries) {
        assert.deepEqual(selectors(shipped(name)), selectors(withoutComments(bundle(name))), name);
    }
});

// The body of every @media block whose prelude matches, braces balanced.
function mediaBodies(source, prelude) {
    const bodies = [];
    for (const match of source.matchAll(/@media[^{]*\{/g)) {
        if (!prelude.test(match[0])) continue;
        let depth = 1;
        let at = match.index + match[0].length;
        while (at < source.length && depth > 0) {
            if (source[at] === '{') depth++;
            if (source[at] === '}') depth--;
            at++;
        }
        bodies.push(source.slice(match.index + match[0].length, at - 1).trim());
    }
    return bodies;
}

// prowlogue-lite.css is the theme with potato mode on. It can only turn on what the theme reads from the switch, so
// a value the system's preference changed some other way would be missing from it. Being the theme plus one rule,
// it passes every other test here too.
test('potato mode is one switch, and prowlogue-lite.css is the theme with it on', () => {
    const lite = shipped('prowlogue-lite.css');
    const theme = code.trimEnd();
    assert.ok(lite.startsWith(theme), 'prowlogue-lite.css must start with all of prowlogue.css');
    // An empty value is on. The minifier keeps its space: `--x:;` is invalid in older engines.
    assert.match(lite.slice(theme.length).trim(), /^@supports selector\(:has\(\*\)\)\{:root\{--pl-lite: ;--pl-lite-why:"[^"]+"\}\s*\}$/);
    assert.match(code, /var\(--pl-lite\)/);
    const bodies = mediaBodies(code, /prefers-reduced-transparency|\(update\b/);
    assert.ok(bodies.length > 0, 'nothing turns potato mode on from the system');
    const offenders = bodies.filter((body) => !/^(:root\{--pl-lite[\w-]*:[^;{}]*(;--pl-lite[\w-]*:[^;{}]*)*\})+$/.test(body));
    assert.deepEqual(offenders, [], 'a system preference may only set --pl-lite* tokens on :root');
});

// potato-mode.js ships as written and the README carries the same text to paste. It names a mark, the badge's
// selector and an animation, so the stylesheet has to keep all three.
test('potato-mode.js parses, matches the README, and names only what the stylesheet has', () => {
    const script = readFileSync(resolve(root, 'dist/v1/potato-mode.js'), 'utf8').replace(/\r\n/g, '\n');
    assert.doesNotThrow(() => new Script(script), 'potato-mode.js has a syntax error');
    const readme = readFileSync(resolve(root, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
    assert.ok(readme.includes(`\`\`\`js\n${script.trim()}\n\`\`\``), "the README's copy of potato-mode.js differs from the file");
    const badge = script.match(/const badge = '([^']+)'/)?.[1];
    assert.ok(badge && code.includes(`:root[data-prowlogue-lite] ${badge}::before{`), 'the badge selector or its mark is gone');
    assert.ok(script.includes("'pl-potato-announce'") && /@keyframes pl-potato-announce\{/.test(code), 'the announcement is gone');
});

test('no hashed MUI/emotion classes (they change on every jellyfin-web build)', () => {
    assert.doesNotMatch(code, /\.css-[a-z0-9]{4,}\b/i);
});

test('no cascade layers (a layered rule loses to jellyfin-web\'s unlayered CSS)', () => {
    assert.doesNotMatch(code, /@layer\b/);
});

test('no CSS nesting (older engines drop nested rules)', () => {
    const nested = allBlocks.filter((block) => block.nestedInRule).map((block) => block.text);
    assert.deepEqual(nested, [], `nested rules found: ${nested.join(' | ')}`);
});

test('selectors newer than the @supports gate never share a selector list', () => {
    // One unsupported selector invalidates the whole list. Every engine inside the :has() gate knows
    // :is(), :where() and :focus-visible, so those are safe in a list; anything newer, and any vendor
    // pseudo-element, gets its own rule.
    const newer = /:open\b|::picker\b|::picker-icon\b|::checkmark\b|:popover-open\b|:state\(|::-webkit-|::-moz-/;
    const offenders = styleRules
        .map((rule) => selectorList(rule.text))
        .filter((list) => list.length > 1 && list.some((selector) => newer.test(selector)))
        .map((list) => list.join(', '));
    assert.deepEqual(offenders, [], `split these rules:\n${offenders.join('\n')}`);
});

test('every backdrop-filter has a -webkit- twin (iOS/iPadOS < 18 WebKit)', () => {
    const plain = (code.match(/(?<!-webkit-)backdrop-filter\s*:/g) ?? []).length;
    const prefixed = (code.match(/-webkit-backdrop-filter\s*:/g) ?? []).length;
    assert.equal(prefixed, plain);
});

test('live blur stays on the surfaces cheap enough for it', () => {
    // A backdrop-filter's cost is its area times how often what's behind it changes, in software on a
    // machine with no GPU. The Home panel and top bar are the two big ones; the rest are small and only
    // there for a moment.
    const allowed = /header\.MuiAppBar-root|\.homeSectionsContainer::before|\.actionSheet|\.MuiDrawer-paper|\.MuiTooltip-tooltip|::picker\(select\)|\.selectionCommandsPanel|\.videoOsdBottom|\.playerStats|\.nowPlayingBar/;
    const offenders = [...code.matchAll(/([^{}]*)\{[^{}]*?(?<![\w-])backdrop-filter\s*:(?!\s*none\b)/g)]
        .map((match) => match[1].trim())
        .filter((selector) => !allowed.test(selector));
    assert.deepEqual(offenders, []);
});

test('every var(--pl-*) used is defined', () => {
    const defined = new Set([...code.matchAll(/(--pl-[\w-]+)\s*:/g)].map((match) => match[1]));
    const used = new Set([...code.matchAll(/var\(\s*(--pl-[\w-]+)/g)].map((match) => match[1]));
    const missing = [...used].filter((name) => !defined.has(name));
    assert.deepEqual(missing, []);
});

test('every token is read', () => {
    const read = new Set([...code.matchAll(/var\(\s*(--pl-[\w-]+)/g)].map((match) => match[1]));
    const defined = new Set([...code.matchAll(/(--pl-[\w-]+)\s*:/g)].map((match) => match[1]));
    assert.deepEqual([...defined].filter((name) => !read.has(name)), []);
});

test('motion respects prefers-reduced-motion', () => {
    if (/\banimation\s*:|@keyframes\b/.test(code)) {
        assert.match(code, /prefers-reduced-motion/);
    }
});

test('every selector is scoped to the Modern app (never Legacy or TV)', () => {
    // Legacy has no <main>, and renders no MUI portals, so these paths can't reach it.
    // Tokens may sit on :root, its potato mode mark and the layout classes: custom properties only change values the
    // scoped rules read.
    const anchors = [
        /^(:root(\[data-prowlogue-lite\])?|\.layout-(tv|mobile|desktop))$/,
        /^(\.layout-(desktop|mobile) )?(:root\[data-prowlogue-lite(="new")?\] )?(\[dir="rtl"\] )?#reactRoot > div > (main|header\.MuiAppBar-root)\b/,
        /^(\.layout-(desktop|mobile) )?body:has\(> /,
        /^(\.layout-(desktop|mobile) )?#reactRoot ~ \* \.Mui/,
        /^html:has\(> body > /,
    ];
    const offenders = styleRules
        .flatMap((rule) => selectorList(rule.text))
        .filter((selector) => !anchors.some((anchor) => anchor.test(selector)));
    assert.deepEqual(offenders, []);
});

// The argument of every :has() on one element of a selector, with its nesting intact.
function hasArguments(selector, anchor) {
    const found = [];
    for (let at = selector.indexOf(`${anchor}:has(`); at !== -1; at = selector.indexOf(`${anchor}:has(`, at + 1)) {
        let cursor = at + anchor.length;
        while (selector.startsWith(':has(', cursor)) {
            let depth = 0;
            let close = cursor + 4;
            for (; close < selector.length; close++) {
                if (selector[close] === '(') depth++;
                if (selector[close] === ')' && --depth === 0) break;
            }
            found.push(selector.slice(cursor + 5, close));
            cursor = close + 1;
        }
    }
    return found;
}

test('a :has() high in the tree follows an exact path, it never scans', () => {
    // On html, body, #reactRoot or main a re-check covers the whole page, and a descendant combinator makes
    // each one walk every element below it.
    const scanning = (argument) => selectorList(argument).some((relative) => {
        let flat = relative;
        for (let previous; previous !== flat;) {
            previous = flat;
            flat = flat.replace(/\([^()]*\)|\[[^[\]]*\]/g, '');
        }
        return !/^[>+~]/.test(flat) || flat.slice(1).replace(/ [>+~] /g, '>').trim().includes(' ');
    });
    const offenders = styleRules
        .flatMap((rule) => selectorList(rule.text))
        .filter((selector) => ['html', 'body', '#reactRoot', 'main', '.mainAnimatedPages']
            .some((anchor) => hasArguments(selector, anchor).some(scanning)));
    assert.deepEqual(offenders, []);
});

test('html:has() only sets values on html itself', () => {
    // A rule that hangs page content off html:has() restyles that content every time html is re-checked.
    const offenders = styleRules
        .flatMap((rule) => selectorList(rule.text))
        .filter((selector) => selector.startsWith('html:has(') && !/\)(::-webkit-scrollbar)?$/.test(selector));
    assert.deepEqual(offenders, []);
});

// Where each :has() that isn't nested in another one ends.
function hasEnds(selector) {
    const ends = [];
    for (let at = selector.indexOf(':has('); at !== -1;) {
        let depth = 0;
        let close = at + 4;
        for (; close < selector.length; close++) {
            if (selector[close] === '(') depth++;
            if (selector[close] === ')' && --depth === 0) break;
        }
        ends.push(close + 1);
        at = selector.indexOf(':has(', close);
    }
    return ends;
}

// Where the last compound of a selector starts.
function lastCompoundStart(selector) {
    let depth = 0;
    for (let at = selector.length - 1; at >= 0; at--) {
        const char = selector[at];
        if (char === ')' || char === ']') depth++;
        if (char === '(' || char === '[') depth--;
        if (depth === 0 && /[\s>+~]/.test(char)) return at + 1;
    }
    return 0;
}

test('no sibling combinator follows a :has()', () => {
    // Blink keeps ONE invalidation set for every :has() that isn't in a rule's last compound, on the whole
    // page. `x:has(…) ~ y` gives that set a sibling part, so every plugin's `.card:has(…)` then restyles all
    // the card's siblings: one small change costs as much as a full restyle.
    const offenders = styleRules
        .flatMap((rule) => selectorList(rule.text))
        .filter((selector) => hasEnds(selector).some((end) => /^[^\s,)]*\s*[~+]/.test(selector.slice(end))));
    assert.deepEqual(offenders, []);
});

test('a rule with a :has() before its last compound ends in a class or an id', () => {
    // That same set is narrowed by each rule's last compound. A last compound Blink can't reduce to a
    // feature (`> *`, `> :not(…)`, a bare pseudo-class) marks the set whole-subtree, and then any change
    // restyles everything under every element with such a :has(), body included.
    const nested = /:(not|has)\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)/g;
    const offenders = styleRules
        .flatMap((rule) => selectorList(rule.text))
        .filter((selector) => {
            const start = lastCompoundStart(selector);
            return selector.slice(0, start).includes(':has(') && !/[.#[]/.test(selector.slice(start).replace(nested, ''));
        });
    assert.deepEqual(offenders, []);
});

test('transitions animate only transform, translate and opacity (TVs repaint anything else)', () => {
    const offenders = [...code.matchAll(/(?<![\w-])transition\s*:\s*([^;}]+)/g)]
        .map((match) => match[1].trim())
        .filter((value) => value !== 'none')
        .filter((value) => value.split(',').some((part) => !/^\s*(transform|translate|opacity)\b/.test(part)));
    assert.deepEqual(offenders, []);
});

test('braces and parentheses balance', () => {
    let braces = 0;
    let parens = 0;
    for (const char of code.replace(/(["'])(?:\\.|(?!\1).)*\1/g, '""')) {
        if (char === '{') braces++;
        if (char === '}') braces--;
        if (char === '(') parens++;
        if (char === ')') parens--;
        assert.ok(braces >= 0 && parens >= 0, 'a closing brace or parenthesis comes before its opener');
    }
    assert.equal(braces, 0, 'unclosed {');
    assert.equal(parens, 0, 'unclosed (');
});
