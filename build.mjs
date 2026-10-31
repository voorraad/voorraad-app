// Bouwt de app: src/ → assets/app.js + assets/app.css
// Gebruik:  npm run build        (eenmalig)
//           npm run dev          (opnieuw bouwen bij elke wijziging + lokale server op :5173)
import * as esbuild from 'esbuild';
import { compile } from 'tailwindcss';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const watch = process.argv.includes('--watch');
const root = path.dirname(new URL(import.meta.url).pathname);
const outdir = path.join(root, 'assets');
fs.mkdirSync(outdir, { recursive: true });

// ---------- CSS via Tailwind v4 ----------
const twDir = path.dirname(require.resolve('tailwindcss/package.json'));
const listFiles = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d =>
    d.isDirectory() ? listFiles(path.join(dir, d.name)) : /\.(jsx?|tsx?)$/.test(d.name) ? [path.join(dir, d.name)] : []);

async function buildCss() {
    const input = fs.readFileSync(path.join(root, 'src/styles.css'), 'utf8');
    const compiler = await compile(input, {
        base: root,
        loadStylesheet: async (id, base) => {
            const file = id === 'tailwindcss' ? path.join(twDir, 'index.css')
                : id.startsWith('tailwindcss/') ? path.join(twDir, id.slice('tailwindcss/'.length))
                    : path.resolve(base, id);
            return { path: file, base: path.dirname(file), content: fs.readFileSync(file, 'utf8') };
        }
    });
    // Kandidaat-classnamen: alle "woorden" uit de broncode (Tailwind negeert wat geen class is).
    const candidates = new Set();
    for (const f of listFiles(path.join(root, 'src'))) {
        for (const tok of fs.readFileSync(f, 'utf8').split(/[\s'"`{}<>\\]+/)) {
            if (!tok || tok.length > 120) continue;
            candidates.add(tok);
            candidates.add(tok.replace(/[),;]+$/, ''));
        }
    }
    const css = compiler.build([...candidates]);
    const min = await esbuild.transform(css, { loader: 'css', minify: true, target: ['chrome111', 'safari16.4', 'firefox128'] });
    fs.writeFileSync(path.join(outdir, 'app.css'), min.code);
    return min.code.length;
}

// ---------- JS via esbuild ----------
const jsOptions = {
    entryPoints: [path.join(root, 'src/main.jsx')],
    bundle: true,
    outfile: path.join(outdir, 'app.js'),
    format: 'iife',
    target: ['chrome90', 'safari15', 'firefox90'],
    jsx: 'automatic',
    minify: !watch,
    sourcemap: watch ? 'inline' : false,
    legalComments: 'none',
    define: { 'process.env.NODE_ENV': watch ? '"development"' : '"production"' },
    logLevel: 'warning'
};

const stamp = () => {
    // Versienummer in index.html en sw.js bijwerken zodat browsers de nieuwe versie ophalen.
    const v = Date.now().toString(36);
    for (const f of ['index.html', 'dev.html', 'sw.js']) {
        const p = path.join(root, f);
        const s = fs.readFileSync(p, 'utf8').replace(/(app\.(?:js|css)\?v=)[\w]+/g, `$1${v}`).replace(/(const BUILD = ')[\w]+(')/, `$1${v}$2`);
        fs.writeFileSync(p, s);
    }
};

if (watch) {
    const ctx = await esbuild.context({
        ...jsOptions,
        plugins: [{ name: 'css', setup(b) { b.onEnd(async () => { const n = await buildCss(); console.log(`[${new Date().toLocaleTimeString()}] gebouwd (css ${(n / 1024).toFixed(0)} kB)`); }); } }]
    });
    await ctx.watch();
    const { port } = await ctx.serve({ servedir: root, port: 5173 });
    console.log(`Dev-server: http://localhost:${port}/dev.html  (met testdata, zonder Firebase)`);
} else {
    await esbuild.build(jsOptions);
    const cssSize = await buildCss();
    stamp();
    const jsSize = fs.statSync(path.join(outdir, 'app.js')).size;
    console.log(`Klaar: assets/app.js ${(jsSize / 1024).toFixed(0)} kB, assets/app.css ${(cssSize / 1024).toFixed(0)} kB`);
}
