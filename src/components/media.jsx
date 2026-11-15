import React, { useEffect, useRef, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Sheet, Button, Input, Segmented, Stepper, Toggle } from './ui.jsx';
import { startScanner, lookupBarcode, itemIdFromQr, itemLink } from '../lib/barcode.js';
import { resizeImage } from '../lib/photo.js';
import { qrSvg } from '../lib/qr.js';
import { cx, emojiFor, formatAantal, formatDate, dateKey, addDays, num } from '../lib/utils.js';

// ================= Foto =================
// Knop die een foto laat kiezen of nemen, verkleint en teruggeeft als data-URL.
export function PhotoInput({ onPhoto, max = 360, children, className, label = 'Foto kiezen' }) {
    const ref = useRef(null);
    const { actions } = useStore();
    const [busy, setBusy] = useState(false);
    const pick = async (e) => {
        const f = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!f) return;
        setBusy(true);
        try { onPhoto(await resizeImage(f, max)); actions.track('fotos'); }
        catch (err) { actions.notify(err.message || 'Kon de foto niet lezen', 'error'); }
        finally { setBusy(false); }
    };
    return (
        <>
            <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} aria-label={label} />
            <button type="button" onClick={() => ref.current && ref.current.click()} disabled={busy} className={className} aria-label={label} title={label}>
                {busy ? <Icon name="Clock" size={16} className="animate-spin" /> : children}
            </button>
        </>
    );
}

// Kleine vierkante foto of emoji
export function Thumb({ item, size = 'w-8 h-8', emojiSize = 'text-2xl', onClick }) {
    if (item.foto) {
        const img = <img src={item.foto} alt="" loading="lazy" className={cx(size, 'rounded-lg object-cover bg-stone-100 dark:bg-stone-800 flex-shrink-0')} />;
        return onClick ? <button type="button" onClick={onClick} aria-label="Foto groot bekijken" className="flex-shrink-0">{img}</button> : img;
    }
    return <span className={cx(emojiSize, 'w-8 text-center flex-shrink-0 leading-none')} aria-hidden="true">{emojiFor(item)}</span>;
}

export function PhotoViewer() {
    const { photo, closePhoto } = useUi();
    useEffect(() => {
        if (!photo) return;
        const k = (e) => e.key === 'Escape' && closePhoto();
        document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
    }, [photo]);
    if (!photo) return null;
    return (
        <div className="fixed inset-0 z-[90] bg-black/85 flex flex-col items-center justify-center p-4 anim-fade" onClick={closePhoto} role="dialog" aria-label="Foto">
            <img src={photo.src} alt={photo.title || ''} className="max-w-full max-h-[80vh] rounded-2xl object-contain" />
            {photo.title && <p className="text-white font-semibold mt-3">{photo.title}</p>}
            <button type="button" onClick={closePhoto} className="absolute top-[max(1rem,env(safe-area-inset-top))] right-4 w-11 h-11 rounded-full bg-white/15 text-white flex items-center justify-center" aria-label="Sluiten"><Icon name="X" size={22} /></button>
        </div>
    );
}

// ================= Scanner =================
export function ScanSheet() {
    const { scan, closeScan, openItem, openForm, openConsume, go } = useUi();
    const { items, owner, typeOf, actions, globalSettings, canSee } = useStore();
    const video = useRef(null);
    const [status, setStatus] = useState('start'); // start | loading | ready | error | busy
    const [err, setErr] = useState('');
    const [manual, setManual] = useState('');
    const [hit, setHit] = useState(null); // { code, items: [...] }
    const [round, setRound] = useState(0);

    useEffect(() => {
        if (!scan || hit) return;
        let stop = null, alive = true;
        setStatus('start'); setErr('');
        startScanner(video.current, (code) => alive && handle(code), (s) => alive && setStatus(s))
            .then(s => { if (alive) stop = s; else s(); })
            .catch(e => { if (!alive) return; setStatus('error'); setErr(e && e.name === 'NotAllowedError' ? 'Geef de app toegang tot je camera (in de instellingen van je browser) en probeer opnieuw.' : (e.message || 'Camera niet beschikbaar.')); });
        return () => { alive = false; stop && stop(); };
    }, [scan, hit, round]);

    if (!scan || !canSee('scan')) return null;

    async function handle(raw) {
        if (navigator.vibrate) navigator.vibrate(60);
        actions.track('scans');
        // QR van een eigen etiket
        const id = itemIdFromQr(raw);
        if (id) {
            const it = items.find(i => i.id === id);
            closeScan();
            if (it) { go('voorraad/' + typeOf(it)); openItem(id); }
            else actions.notify('Dit product staat niet (meer) in deze voorraad.', 'error');
            return;
        }
        const code = raw.replace(/\s/g, '');
        // Formulier vroeg om een code: gewoon teruggeven
        if (scan.onCode) { setStatus('busy'); const info = await lookupBarcode(code, owner.barcodes || {}, globalSettings.barcodesDelen !== false); closeScan(); scan.onCode(code, info); return; }
        const have = items.filter(i => i.barcode === code);
        if (have.length) { setHit({ code, items: have }); return; }
        if (!canSee('toevoegen')) { closeScan(); actions.notify('Dit product staat niet in je voorraad.', 'error'); return; }
        setStatus('busy');
        const info = await lookupBarcode(code, owner.barcodes || {}, globalSettings.barcodesDelen !== false);
        closeScan();
        openForm({ type: scan.type, prefill: { ...prefillFrom(code, info), ...(scan.type ? { type: scan.type } : {}) }, nonce: Date.now() });
        if (!info) actions.notify('Onbekend product: vul de naam in. Volgende keer herkent de app het.');
    }

    const close = () => { setHit(null); closeScan(); };
    return (
        <Sheet open onClose={close} title={hit ? 'Al in je voorraad' : 'Barcode scannen'} subtitle={hit ? null : 'Houd de streepjescode of QR-code in het kader'}>
            {hit ? (
                <div className="space-y-3">
                    {hit.items.map(i => (
                        <div key={i.id} className="flex items-center gap-3 p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60">
                            <Thumb item={i} size="w-12 h-12" emojiSize="text-3xl" />
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{i.naam}</p>
                                <p className="text-sm text-stone-500">{formatAantal(i.aantal)} {i.eenheid}{i.ingevrorenOp ? ' · ' + formatDate(i.ingevrorenOp) : ''}</p>
                            </div>
                            {canSee('opmaken') && <button type="button" onClick={() => { close(); openConsume(i); }} className="w-10 h-10 rounded-full bg-orange-500 text-white flex items-center justify-center" aria-label="Opmaken"><Icon name="Utensils" size={18} /></button>}
                            <button type="button" onClick={() => { close(); openItem(i.id); }} className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center" aria-label="Bekijken"><Icon name="Eye" size={18} /></button>
                        </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button variant="secondary" icon="Scan" onClick={() => { setHit(null); setRound(r => r + 1); }}>Opnieuw scannen</Button>
                        {canSee('toevoegen') && <Button icon="Plus" onClick={() => { const src = hit.items[0]; close(); openForm({ duplicateOf: src }); }}>Nog één toevoegen</Button>}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3]">
                        <video ref={video} className="w-full h-full object-cover" playsInline muted />
                        <div className="absolute inset-x-[10%] top-1/4 bottom-1/4 border-2 border-white/90 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] pointer-events-none">
                            {status === 'ready' && <span className="absolute inset-x-2 top-1/2 h-0.5 bg-red-500/80 animate-pulse" />}
                        </div>
                        {(status === 'start' || status === 'loading' || status === 'busy') && (
                            <p className="absolute bottom-3 inset-x-0 text-center text-white text-sm font-medium drop-shadow">{status === 'busy' ? 'Product opzoeken…' : 'Camera starten…'}</p>
                        )}
                        {status === 'error' && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white gap-3">
                                <Icon name="Camera" size={32} />
                                <p className="text-sm">{err}</p>
                                <Button size="sm" variant="secondary" onClick={() => setRound(r => r + 1)}>Opnieuw proberen</Button>
                            </div>
                        )}
                    </div>
                    <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (manual.trim()) handle(manual.trim()); }}>
                        <Input inputMode="numeric" placeholder="Of typ de cijfers onder de streepjes" value={manual} onChange={e => setManual(e.target.value)} />
                        <Button type="submit" variant="secondary" disabled={!manual.trim()}>Zoek</Button>
                    </form>
                    <p className="text-xs text-stone-500">Productinfo komt van Open Food Facts. Producten die je zelf invult, onthoudt de app voor de volgende keer.</p>
                </div>
            )}
        </Sheet>
    );
}

export function prefillFrom(code, info) {
    const p = { barcode: code };
    if (info) {
        p.naam = info.naam;
        if (info.categorie) p.categorie = info.categorie;
        if (info.emoji) p.emoji = info.emoji;
        if (info.eenheid) p.eenheid = info.eenheid;
        if (info.foto) p.foto = info.foto;
        if (info.days) p.houdbaarheidsDatum = dateKey(addDays(new Date(), info.days));
    }
    return p;
}

// ================= Etiketten =================
const FORMATS = {
    a4: { label: 'A4-vel', sub: '3 × 8 etiketten (70 × 37 mm)', page: 'A4', w: 70, h: 37, cols: 3, rows: 8 },
    l62: { label: 'Labelprinter', sub: '62 × 29 mm, één per etiket', page: '62mm 29mm', w: 62, h: 29 },
    l50: { label: 'Klein', sub: '50 × 25 mm, één per etiket', page: '50mm 25mm', w: 50, h: 25 }
};
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function labelHtml(item, { locNaam, type, qr, fmt }) {
    const date = type === 'vriezer'
        ? (item.ingevrorenOp ? 'Ingevroren ' + formatDate(item.ingevrorenOp) : '')
        : (item.houdbaarheidsDatum ? 'THT ' + formatDate(item.houdbaarheidsDatum) : (item.ingevrorenOp ? 'Sinds ' + formatDate(item.ingevrorenOp) : ''));
    const qs = Math.round(fmt.h * 0.8);
    return `<div class="lbl" style="width:${fmt.w}mm;height:${fmt.h}mm">
        <div class="txt">
            <div class="nm">${esc(item.naam)}</div>
            <div class="qt">${esc(formatAantal(item.aantal))} ${esc(item.eenheid || '')}</div>
            ${date ? `<div class="dt">${esc(date)}</div>` : ''}
            ${locNaam ? `<div class="lc">${esc(locNaam)}</div>` : ''}
        </div>
        ${qr ? `<div class="qr" style="width:${qs}mm;height:${qs}mm">${qrSvg(itemLink(item.id), { size: '100%' })}</div>` : ''}
    </div>`;
}

export function buildLabelDoc(list, opts) {
    const fmt = FORMATS[opts.format];
    const labels = list.flatMap(x => Array.from({ length: opts.copies }, () => labelHtml(x.item, { ...x, qr: opts.qr, fmt })));
    const sheet = fmt.cols
        ? `<div class="sheet">${'<div></div>'.repeat(opts.skip || 0)}${labels.join('')}</div>`
        : labels.map(l => `<div class="one">${l}</div>`).join('');
    return `<!DOCTYPE html><html lang="nl"><head><meta charset="utf-8"><title>Etiketten</title><style>
        @page { size: ${fmt.page}; margin: ${fmt.cols ? '0' : '0'}; }
        * { box-sizing: border-box; } body { margin: 0; font-family: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; color: #111; }
        .sheet { display: grid; grid-template-columns: repeat(${fmt.cols || 1}, ${fmt.w}mm); grid-auto-rows: ${fmt.h}mm; justify-content: center; padding-top: ${fmt.cols ? '0.5mm' : '0'}; }
        .one { page-break-after: always; break-after: page; }
        .lbl { display: flex; align-items: center; gap: 2mm; padding: 2.5mm 3mm; overflow: hidden; ${fmt.cols ? 'outline: 0.2mm dashed #ddd;' : ''} }
        .txt { flex: 1; min-width: 0; line-height: 1.15; }
        .nm { font-weight: 800; font-size: ${fmt.h < 28 ? 10 : 12}pt; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .qt { font-size: 9pt; font-weight: 600; margin-top: 0.8mm; }
        .dt { font-size: 8.5pt; margin-top: 0.6mm; } .lc { font-size: 7.5pt; color: #555; margin-top: 0.6mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .qr { flex-shrink: 0; } .qr svg { width: 100%; height: 100%; display: block; }
        @media screen { body { background: #eee; padding: 16px; } .sheet, .one { background: #fff; margin: 0 auto 12px; width: fit-content; } .hint { font: 14px sans-serif; text-align: center; margin-bottom: 12px; } }
        @media print { .hint { display: none; } }
    </style></head><body><p class="hint">Druk af met <b>schaal 100%</b> (niet "passend maken").</p>${sheet}<script>setTimeout(function(){window.print()},400)<\/script></body></html>`;
}

export function LabelSheet() {
    const { labelIds, closeLabels } = useUi();
    const { items, locById, ladeById, typeOf, actions, canSee } = useStore();
    const [format, setFormat] = useState(() => { try { return localStorage.getItem('voorraad_etiket') || 'a4'; } catch (e) { return 'a4'; } });
    const [copies, setCopies] = useState(1);
    const [qr, setQr] = useState(true);
    const [start, setStart] = useState(1);
    if (!labelIds || !canSee('etiketten')) return null;
    const list = labelIds.map(id => items.find(i => i.id === id)).filter(Boolean).map(item => {
        const loc = locById[item.vriezerId], lade = ladeById[item.ladeId];
        return { item, type: typeOf(item), locNaam: `${loc ? loc.naam : ''}${lade ? ' › ' + lade.naam : ''}` };
    });
    const total = list.length * copies;
    const fmt = FORMATS[format];
    const print = () => {
        try { localStorage.setItem('voorraad_etiket', format); } catch (e) { }
        const html = buildLabelDoc(list, { format, copies, qr, skip: format === 'a4' ? start - 1 : 0 });
        const w = window.open('', '_blank');
        if (!w) { actions.notify('Sta pop-ups toe om te kunnen afdrukken.', 'error'); return; }
        w.document.open(); w.document.write(html); w.document.close();
        actions.track('etiketten');
    };
    const preview = list[0];
    return (
        <Sheet open onClose={closeLabels} title="Etiketten afdrukken" subtitle={`${list.length} ${list.length === 1 ? 'product' : 'producten'} · ${total} ${total === 1 ? 'etiket' : 'etiketten'}`}
            footer={<div className="flex gap-2"><Button variant="secondary" onClick={closeLabels} className="flex-1 sm:flex-none">Annuleren</Button><Button icon="Printer" className="flex-1" disabled={!list.length} onClick={print}>Afdrukken</Button></div>}>
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Formaat">
                    {Object.entries(FORMATS).map(([id, f]) => (
                        <button key={id} type="button" role="radio" aria-checked={format === id} onClick={() => setFormat(id)}
                            className={cx('rounded-2xl border-2 p-2.5 text-left', format === id ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40' : 'border-stone-200 dark:border-stone-700')}>
                            <p className="text-sm font-semibold">{f.label}</p><p className="text-[11px] text-stone-500 leading-tight mt-0.5">{f.sub}</p>
                        </button>
                    ))}
                </div>
                {preview && (
                    <div className="rounded-2xl bg-stone-100 dark:bg-stone-800 p-4 flex justify-center">
                        <div className="bg-white text-stone-900 rounded-md shadow flex items-center gap-2 px-3" style={{ width: fmt.w * 3.4, height: fmt.h * 3.4 }}>
                            <div className="flex-1 min-w-0 leading-tight">
                                <p className="font-extrabold text-sm line-clamp-2">{preview.item.naam}</p>
                                <p className="text-xs font-semibold mt-0.5">{formatAantal(preview.item.aantal)} {preview.item.eenheid}</p>
                                <p className="text-[11px]">{preview.type === 'vriezer' ? (preview.item.ingevrorenOp ? 'Ingevroren ' + formatDate(preview.item.ingevrorenOp) : '') : (preview.item.houdbaarheidsDatum ? 'THT ' + formatDate(preview.item.houdbaarheidsDatum) : '')}</p>
                                <p className="text-[10px] text-stone-500 truncate">{preview.locNaam}</p>
                            </div>
                            {qr && <div className="flex-shrink-0" style={{ width: fmt.h * 2.7, height: fmt.h * 2.7 }} dangerouslySetInnerHTML={{ __html: qrSvg(itemLink(preview.item.id), { size: '100%' }) }} />}
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Aantal per product</span>
                    <Stepper value={copies} onChange={c => setCopies(Math.max(1, Math.round(num(c, 1))))} min={1} max={50} step={1} className="w-36" />
                </div>
                {format === 'a4' && (
                    <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-medium">Begin bij etiket<span className="block text-xs text-stone-500 font-normal">Handig voor een half gebruikt vel (1 = linksboven)</span></span>
                        <Stepper value={start} onChange={c => setStart(Math.min(24, Math.max(1, Math.round(num(c, 1)))))} min={1} max={24} step={1} className="w-36" />
                    </div>
                )}
                <Toggle checked={qr} onChange={setQr} label="QR-code op het etiket" description="Scan met je gsm-camera om het product meteen te openen en op te maken." />
                {format === 'a4' && <p className="text-xs text-stone-500">Past op A4-etiketvellen met 3 × 8 etiketten van ongeveer 70 × 37 mm. Druk af op schaal 100%.</p>}
            </div>
        </Sheet>
    );
}
