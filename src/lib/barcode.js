import { decodeEan } from './ean.js';
import { loadScript, guessProduct } from './utils.js';
import { db } from './firebase.js';

// ---------- Camera-scanner ----------
// 1) BarcodeDetector van de browser (Chrome/Android), 2) ZXing via CDN (o.a. iPhone),
// 3) eigen EAN-lezer als laatste vangnet. Werkt op een <video>-element dat we zelf beheren.
const ZXING = ['https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js', 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js'];
let zxingPromise = null;
function loadZxing() {
    if (window.ZXing) return Promise.resolve(window.ZXing);
    if (!zxingPromise) {
        zxingPromise = (async () => {
            for (const src of ZXING) {
                try {
                    await Promise.race([loadScript(src), new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000))]);
                    if (window.ZXing) return window.ZXing;
                } catch (e) { /* volgende proberen */ }
            }
            return null;
        })();
    }
    return zxingPromise;
}

async function nativeDetector() {
    if (!('BarcodeDetector' in window)) return null;
    try {
        const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code', 'code_128', 'code_39'];
        const have = await window.BarcodeDetector.getSupportedFormats();
        const formats = want.filter(f => have.includes(f));
        return formats.length ? new window.BarcodeDetector({ formats }) : null;
    } catch (e) { return null; }
}

export async function startScanner(video, onCode, onStatus = () => { }) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Je browser geeft geen toegang tot de camera.');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
    video.srcObject = stream;
    video.setAttribute('playsinline', ''); video.muted = true;
    await video.play().catch(() => { });

    let stopped = false, zx = null, zxReader = null;
    const native = await nativeDetector();
    if (!native) {
        onStatus('loading');
        loadZxing().then(Z => {
            if (!Z || stopped) return;
            try {
                zx = Z;
                const hints = new Map();
                hints.set(Z.DecodeHintType.POSSIBLE_FORMATS, [Z.BarcodeFormat.EAN_13, Z.BarcodeFormat.EAN_8, Z.BarcodeFormat.UPC_A, Z.BarcodeFormat.UPC_E, Z.BarcodeFormat.QR_CODE, Z.BarcodeFormat.CODE_128]);
                hints.set(Z.DecodeHintType.TRY_HARDER, true);
                zxReader = new Z.MultiFormatReader(); zxReader.setHints(hints);
            } catch (e) { zxReader = null; }
            onStatus('ready');
        });
    } else onStatus('ready');

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let found = false;
    const tick = async () => {
        if (stopped || found) return;
        try {
            if (video.readyState >= 2 && video.videoWidth) {
                let code = null;
                if (native) {
                    const r = await native.detect(video);
                    if (r && r.length) code = r[0].rawValue;
                } else {
                    // middelste strook van het beeld, breed genoeg voor een barcode
                    const vw = video.videoWidth, vh = video.videoHeight;
                    const w = Math.min(960, vw), h = Math.round((w / vw) * vh);
                    canvas.width = w; canvas.height = h;
                    ctx.drawImage(video, 0, 0, w, h);
                    code = decodeEan(ctx.getImageData(0, Math.round(h * 0.25), w, Math.round(h * 0.5)));
                    if (!code && zxReader) {
                        try {
                            const src = new zx.HTMLCanvasElementLuminanceSource(canvas);
                            code = zxReader.decodeWithState(new zx.BinaryBitmap(new zx.HybridBinarizer(src))).getText();
                        } catch (e) { /* niets gevonden */ }
                    }
                }
                if (code && !stopped) { found = true; onCode(String(code).trim()); return; }
            }
        } catch (e) { /* frame overslaan */ }
        setTimeout(tick, native ? 180 : 120);
    };
    tick();

    return () => {
        stopped = true;
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
    };
}

// ---------- Product opzoeken ----------
// Eerst wat de gebruiker zelf al eens bewaarde (owner.barcodes), dan Open Food Facts.
export async function lookupBarcode(code, known = {}, shared = true) {
    if (known[code]) return { ...known[code], bron: 'eigen' };
    if (shared) {
        try {
            const d = await db.collection('barcodes').doc(code).get();
            if (d.exists && d.data().naam) return { ...d.data(), bron: 'gedeeld' };
        } catch (e) { /* geen toegang of offline */ }
    }
    try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 7000);
        const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,product_name_nl,product_name_fr,brands,quantity,image_front_small_url,image_front_thumb_url&lc=nl`, { signal: ctrl.signal });
        clearTimeout(t);
        const j = await res.json();
        if (j.status !== 1 || !j.product) return null;
        const p = j.product;
        const raw = (p.product_name_nl || p.product_name || p.product_name_fr || '').trim();
        const brand = ((p.brands || '').split(',')[0] || '').trim();
        if (!raw && !brand) return null;
        const naam = raw && brand && !raw.toLowerCase().includes(brand.toLowerCase()) ? `${raw} (${brand})` : (raw || brand);
        const g = guessProduct(raw || naam);
        return { naam, categorie: g ? g.cat : undefined, emoji: g ? g.emoji : undefined, days: g ? g.days : undefined, foto: p.image_front_small_url || p.image_front_thumb_url || '', hoeveelheid: p.quantity || '', bron: 'openfoodfacts' };
    } catch (e) { return null; }
}

// QR-codes van onze eigen etiketten: ...#/p/<itemId>
export const itemIdFromQr = (text) => { const m = /#\/p\/([A-Za-z0-9_-]+)/.exec(text || ''); return m ? m[1] : null; };
export const itemLink = (id) => `${location.origin}${location.pathname}#/p/${id}`;
