// Kleine QR-code-generator (byte-modus, foutcorrectie M, versie 1–9).
// Genoeg voor korte links op etiketten; geen externe bibliotheek nodig.

const EC_M = { // versie: [ecPerBlok, [aantalBlokken, dataPerBlok], ...]
    1: [10, [1, 16]], 2: [16, [1, 28]], 3: [26, [1, 44]], 4: [18, [2, 32]], 5: [24, [2, 43]],
    6: [16, [4, 27]], 7: [18, [4, 31]], 8: [22, [2, 38], [2, 39]], 9: [22, [3, 36], [2, 37]]
};
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46] };

const gfMul = (x, y) => {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z & 0xff;
};
const rsDivisor = (degree) => {
    const r = new Array(degree).fill(0); r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
        root = gfMul(root, 0x02);
    }
    return r;
};
const rsRemainder = (data, div) => {
    const r = div.map(() => 0);
    for (const b of data) {
        const f = b ^ r.shift(); r.push(0);
        div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
};
const bit = (x, i) => ((x >>> i) & 1) !== 0;

export function qrMatrix(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let ver = 0, cap = 0;
    for (let v = 1; v <= 9; v++) {
        const t = EC_M[v]; cap = t.slice(1).reduce((a, [n, d]) => a + n * d, 0);
        if (4 + 8 + bytes.length * 8 <= cap * 8) { ver = v; break; }
    }
    if (!ver) throw new Error('Tekst te lang voor QR-code');

    // Databits
    const bits = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    for (let p = 0xec; data.length < cap; p ^= 0xec ^ 0x11) data.push(p);

    // Blokken + foutcorrectie, dan verweven
    const [ecLen, ...groups] = EC_M[ver];
    const div = rsDivisor(ecLen);
    const blocks = []; let k = 0;
    groups.forEach(([n, d]) => { for (let i = 0; i < n; i++) { const blk = data.slice(k, k + d); k += d; blocks.push([blk, rsRemainder(blk, div)]); } });
    const all = [];
    const maxD = Math.max(...blocks.map(b => b[0].length));
    for (let i = 0; i < maxD; i++) blocks.forEach(b => { if (i < b[0].length) all.push(b[0][i]); });
    for (let i = 0; i < ecLen; i++) blocks.forEach(b => all.push(b[1][i]));

    // Matrix
    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const setF = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(([cx, cy]) => {
        for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
            const x = cx + dx, y = cy + dy;
            if (x >= 0 && x < size && y >= 0 && y < size) { const d = Math.max(Math.abs(dx), Math.abs(dy)); setF(x, y, d !== 2 && d !== 4); }
        }
    });
    const al = ALIGN[ver], last = al.length - 1;
    al.forEach((ax, i) => al.forEach((ay, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) setF(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const drawFormat = (mask) => {
        const d = (0 << 3) | mask; // M = 00
        let r = d; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
        const b = ((d << 10) | r) ^ 0x5412;
        for (let i = 0; i <= 5; i++) setF(8, i, bit(b, i));
        setF(8, 7, bit(b, 6)); setF(8, 8, bit(b, 7)); setF(7, 8, bit(b, 8));
        for (let i = 9; i < 15; i++) setF(14 - i, 8, bit(b, i));
        for (let i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(b, i));
        for (let i = 8; i < 15; i++) setF(8, size - 15 + i, bit(b, i));
        setF(8, size - 8, true);
    };
    drawFormat(0);
    if (ver >= 7) {
        let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
        const b = (ver << 12) | r;
        for (let i = 0; i < 18; i++) { const a = size - 11 + (i % 3), c = Math.floor(i / 3); setF(a, c, bit(b, i)); setF(c, a, bit(b, i)); }
    }
    // Codewoorden plaatsen
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
        if (right === 6) right = 5;
        for (let vert = 0; vert < size; vert++) for (let j = 0; j < 2; j++) {
            const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
            if (!fn[y][x] && i < all.length * 8) { mod[y][x] = bit(all[i >>> 3], 7 - (i & 7)); i++; }
        }
    }
    // Masker kiezen (laagste strafscore)
    const MASKS = [
        (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
        (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
        (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0
    ];
    const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x]; };
    const penalty = () => {
        let p = 0, dark = 0;
        for (let a = 0; a < 2; a++) for (let u = 0; u < size; u++) {
            let run = 1;
            for (let v = 1; v < size; v++) {
                const c = a ? mod[v][u] : mod[u][v], prev = a ? mod[v - 1][u] : mod[u][v - 1];
                if (c === prev) { run++; if (run === 5) p += 3; else if (run > 5) p++; } else run = 1;
            }
        }
        for (let y = 0; y < size - 1; y++) for (let x = 0; x < size - 1; x++) {
            const c = mod[y][x]; if (c === mod[y][x + 1] && c === mod[y + 1][x] && c === mod[y + 1][x + 1]) p += 3;
        }
        mod.forEach(r => r.forEach(c => { if (c) dark++; }));
        return p + Math.floor(Math.abs(dark * 20 - size * size * 10) / (size * size)) * 10;
    };
    let best = 0, bestP = Infinity;
    for (let m = 0; m < 8; m++) { applyMask(m); drawFormat(m); const s = penalty(); if (s < bestP) { bestP = s; best = m; } applyMask(m); }
    applyMask(best); drawFormat(best);
    return mod;
}

// SVG-string (met stille zone van 4 modules)
export function qrSvg(text, { size = 120, color = '#000' } = {}) {
    const m = qrMatrix(text), n = m.length, q = 4, t = n + q * 2;
    let d = '';
    m.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + q} ${y + q}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${t} ${t}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${t}" height="${t}" fill="#fff"/><path d="${d}" fill="${color}"/></svg>`;
}
