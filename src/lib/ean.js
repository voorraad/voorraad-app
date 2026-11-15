// Eenvoudige EAN-13 / EAN-8 / UPC-A lezer op basis van horizontale scanlijnen.
// Wordt gebruikt als de browser zelf geen barcodes kan lezen (bv. Safari op iPhone)
// en de ZXing-bibliotheek niet geladen kon worden.

const L = ['3211', '2221', '2122', '1411', '1132', '1231', '1114', '1312', '1213', '3112'].map(s => s.split('').map(Number));
const G = L.map(w => [...w].reverse());
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

// Lijst van lopen [lengte, donker?] voor één rij grijswaarden.
function runsOf(row) {
    let lo = 255, hi = 0;
    for (const v of row) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (hi - lo < 40) return null;
    const thr = (lo + hi) / 2;
    const runs = []; let cur = row[0] < thr, len = 0;
    for (const v of row) {
        const d = v < thr;
        if (d === cur) len++; else { runs.push([len, cur]); cur = d; len = 1; }
    }
    runs.push([len, cur]);
    return runs;
}

function matchDigit(w, unit) {
    const s = w[0] + w[1] + w[2] + w[3];
    if (s < unit * 7 * 0.6 || s > unit * 7 * 1.45) return null;
    const n = w.map(x => (x * 7) / s);
    let best = null, bestErr = 9;
    for (const [set, tab] of [['L', L], ['G', G]]) tab.forEach((p, d) => {
        const err = Math.abs(n[0] - p[0]) + Math.abs(n[1] - p[1]) + Math.abs(n[2] - p[2]) + Math.abs(n[3] - p[3]);
        if (err < bestErr) { bestErr = err; best = [d, set]; }
    });
    return bestErr < 1.6 ? best : null;
}

const checksumOk = (digits) => {
    const body = digits.slice(0, -1), chk = digits[digits.length - 1];
    let sum = 0;
    body.slice().reverse().forEach((d, i) => { sum += d * (i % 2 === 0 ? 3 : 1); });
    return (10 - (sum % 10)) % 10 === chk;
};

function tryAt(runs, i, kind) {
    // runs[i] = eerste donkere balk van de startbewaking
    const half = kind === 13 ? 6 : 4;
    const need = 3 + half * 4 + 5 + half * 4 + 3;
    if (i + need > runs.length) return null;
    const w = runs.slice(i, i + need).map(r => r[0]);
    const unit = (w[0] + w[1] + w[2]) / 3;
    if ([w[0], w[1], w[2]].some(x => x < unit * 0.5 || x > unit * 1.6)) return null;
    // stille zone links
    if (i > 0 && runs[i - 1][0] < unit * 4) return null;
    const left = [], sets = [];
    let k = 3;
    for (let d = 0; d < half; d++, k += 4) { const m = matchDigit(w.slice(k, k + 4), unit); if (!m) return null; left.push(m[0]); sets.push(m[1]); }
    const mid = w.slice(k, k + 5); k += 5;
    if (mid.some(x => x < unit * 0.4 || x > unit * 1.8)) return null;
    const right = [];
    for (let d = 0; d < half; d++, k += 4) { const m = matchDigit(w.slice(k, k + 4), unit); if (!m || m[1] !== 'L') return null; right.push(m[0]); }
    let digits;
    if (kind === 13) {
        const first = PARITY.indexOf(sets.join(''));
        if (first < 0) return null;
        digits = [first, ...left, ...right];
    } else {
        if (sets.some(s => s !== 'L')) return null;
        digits = [...left, ...right];
    }
    return checksumOk(digits) ? digits.join('') : null;
}

function decodeRow(row) {
    const runs = runsOf(row);
    if (!runs) return null;
    for (const rr of [runs, [...runs].reverse()]) {
        for (let i = 0; i < rr.length; i++) {
            if (!rr[i][1]) continue;
            const r = tryAt(rr, i, 13) || tryAt(rr, i, 8);
            if (r) return r;
        }
    }
    return null;
}

// Zoek een barcode in ImageData. Geeft de code terug als minstens twee scanlijnen
// hetzelfde resultaat geven (dat voorkomt verkeerde lezingen).
export function decodeEan(img) {
    const { width, height, data } = img;
    const counts = {};
    const lines = 24;
    for (let n = 0; n < lines; n++) {
        const y = Math.floor(height * (0.2 + (0.6 * n) / (lines - 1)));
        const row = new Array(width);
        for (let x = 0; x < width; x++) {
            const o = (y * width + x) * 4;
            row[x] = data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114;
        }
        const r = decodeRow(row);
        if (r) { counts[r] = (counts[r] || 0) + 1; if (counts[r] >= 2) return r; }
    }
    return null;
}

export const _test = { decodeRow };
