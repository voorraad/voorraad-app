import React, { useEffect, useRef, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { cx, num, round2, formatAantal } from '../lib/utils.js';
import { BADGE, DOT, WINKELS } from '../lib/constants.js';

// ---------- Sheet: onderaan op gsm, gecentreerd op groot scherm ----------
let openSheets = 0;
const sheetStack = []; // alleen de bovenste sheet reageert op Escape
export function Sheet({ open, onClose, title, subtitle, children, footer, size = 'md', dismissable = true }) {
    const panelRef = useRef(null);
    useEffect(() => {
        if (!open) return;
        const token = {};
        sheetStack.push(token);
        openSheets++;
        document.body.classList.add('overflow-hidden');
        return () => {
            sheetStack.splice(sheetStack.indexOf(token), 1);
            openSheets = Math.max(0, openSheets - 1);
            if (!openSheets) document.body.classList.remove('overflow-hidden');
        };
    }, [open]);
    const closeRef = useRef(onClose);
    closeRef.current = dismissable ? onClose : null;
    const tokenRef = useRef(null);
    useEffect(() => {
        if (!open) return;
        tokenRef.current = sheetStack[sheetStack.length - 1];
        const onKey = (e) => {
            if (e.key !== 'Escape' || sheetStack[sheetStack.length - 1] !== tokenRef.current) return;
            e.stopImmediatePropagation();
            closeRef.current && closeRef.current();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);
    if (!open) return null;
    const width = size === 'lg' ? 'sm:max-w-2xl' : size === 'xl' ? 'sm:max-w-4xl' : size === 'sm' ? 'sm:max-w-sm' : 'sm:max-w-lg';
    return (
        <div data-sheet-open className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 print:hidden" role="dialog" aria-modal="true" aria-label={typeof title === 'string' ? title : undefined}>
            <div className="absolute inset-0 bg-stone-900/40 dark:bg-black/60 backdrop-blur-[2px] anim-fade" onClick={() => dismissable && onClose && onClose()} />
            <div ref={panelRef} className={cx('relative w-full bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh] anim-sheet', width)}>
                <div className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-stone-200 dark:bg-stone-700 flex-shrink-0" />
                {(title || dismissable) && (
                    <div className="flex items-start gap-3 px-5 pt-3 sm:pt-5 pb-3 flex-shrink-0">
                        <div className="min-w-0 flex-1">
                            {title && <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50 leading-tight">{title}</h2>}
                            {subtitle && <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">{subtitle}</p>}
                        </div>
                        {dismissable && (
                            <button onClick={onClose} className="-mr-2 -mt-1 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 dark:hover:text-stone-200" aria-label="Sluiten">
                                <Icon name="X" size={20} />
                            </button>
                        )}
                    </div>
                )}
                <div className="px-5 pb-5 overflow-y-auto overscroll-contain flex-1 min-h-0">{children}</div>
                {footer && <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-800 flex-shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
            </div>
        </div>
    );
}

// ---------- Knoppen ----------
const BTN = {
    primary: 'bg-teal-600 text-white hover:bg-teal-700 active:bg-teal-800 shadow-sm',
    secondary: 'bg-stone-100 text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
    outline: 'border border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    'danger-soft': 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50',
    ghost: 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800',
    soft: 'bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950/60 dark:text-teal-200 dark:hover:bg-teal-900/60'
};
export function Button({ variant = 'primary', size = 'md', icon, children, className, block, ...rest }) {
    const sz = size === 'sm' ? 'h-9 px-3 text-sm gap-1.5' : size === 'lg' ? 'h-12 px-5 text-base gap-2' : 'h-11 px-4 text-sm gap-2';
    return (
        <button type="button" {...rest} className={cx('inline-flex items-center justify-center rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none select-none', sz, BTN[variant], block && 'w-full', className)}>
            {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} />}
            {children}
        </button>
    );
}
export function IconButton({ icon, label, className, size = 20, variant = 'ghost', ...rest }) {
    return (
        <button type="button" aria-label={label} title={label} {...rest} className={cx('inline-flex items-center justify-center rounded-full w-10 h-10 transition-colors flex-shrink-0', BTN[variant], className)}>
            <Icon name={icon} size={size} />
        </button>
    );
}

// ---------- Formulieren ----------
export const inputCls = 'w-full h-11 px-3 rounded-xl border border-stone-200 bg-white text-stone-900 placeholder-stone-400 text-[15px] outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-100 dark:placeholder-stone-500 transition';
// group: gebruik <div> i.p.v. <label> wanneer het veld knoppen bevat (anders klikt het label de eerste knop aan).
export function Field({ label, hint, children, className, group }) {
    const Tag = group ? 'div' : 'label';
    return (
        <Tag className={cx('block', className)} role={group ? 'group' : undefined} aria-label={group ? label : undefined}>
            {label && <span className="block text-xs font-semibold text-stone-500 dark:text-stone-400 mb-1.5">{label}</span>}
            {children}
            {hint && <span className="block text-xs text-stone-400 dark:text-stone-500 mt-1">{hint}</span>}
        </Tag>
    );
}
export const Input = React.forwardRef(function Input({ className, ...rest }, ref) {
    return <input ref={ref} {...rest} className={cx(inputCls, className)} />;
});
export function Select({ className, children, ...rest }) {
    return (
        <div className="relative">
            <select {...rest} className={cx(inputCls, 'appearance-none pr-9', className)}>{children}</select>
            <Icon name="ChevronDown" size={16} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400" />
        </div>
    );
}
export function Textarea({ className, ...rest }) {
    return <textarea {...rest} className={cx(inputCls, 'h-auto py-2.5 min-h-[80px] resize-y', className)} />;
}

// Getal met - en + knoppen (stappen van 1, of 0,25 onder 1).
export function Stepper({ value, onChange, min = 0, max = 5000, step, className, size = 'md' }) {
    const v = num(value);
    const stepFor = (dir) => step || ((dir < 0 ? v <= 1 : v < 1) ? 0.25 : 1);
    const set = (n) => onChange(Math.min(max, Math.max(min, round2(n))));
    const h = size === 'sm' ? 'h-9' : 'h-11';
    return (
        <div className={cx('flex items-stretch rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden', h, className)}>
            <button type="button" aria-label="Minder" onClick={() => set(v - stepFor(-1))} className="w-10 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700 active:bg-stone-200"><Icon name="Minus" size={16} /></button>
            <input inputMode="decimal" value={value} onChange={e => onChange(e.target.value.replace(',', '.'))} onBlur={() => set(v)}
                className="w-14 flex-1 min-w-0 text-center bg-transparent font-semibold text-stone-900 dark:text-stone-100 outline-none" />
            <button type="button" aria-label="Meer" onClick={() => set(v + stepFor(1))} className="w-10 flex items-center justify-center text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700 active:bg-stone-200"><Icon name="Plus" size={16} /></button>
        </div>
    );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
    return (
        <button type="button" role="switch" aria-checked={!!checked} disabled={disabled} onClick={() => onChange(!checked)}
            className="w-full flex items-center gap-3 text-left py-2 disabled:opacity-50">
            <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-medium text-stone-800 dark:text-stone-100">{label}</span>
                {description && <span className="block text-xs text-stone-500 dark:text-stone-400 mt-0.5">{description}</span>}
            </span>
            <span className={cx('relative w-11 h-6 rounded-full transition-colors flex-shrink-0', checked ? 'bg-teal-600' : 'bg-stone-300 dark:bg-stone-600')}>
                <span className={cx('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
            </span>
        </button>
    );
}

// Gesegmenteerde keuze (bv. Vriezer / Frigo / Stock)
export function Segmented({ options, value, onChange, className, size = 'md' }) {
    return (
        <div className={cx('flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800 gap-1', className)} role="tablist">
            {options.map(o => (
                <button key={o.id} type="button" role="tab" aria-selected={value === o.id} onClick={() => onChange(o.id)}
                    className={cx('flex-1 min-w-0 flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-all',
                        size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm',
                        value === o.id ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm' : 'text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200')}>
                    {o.icon && <Icon name={o.icon} size={size === 'sm' ? 14 : 16} />}
                    <span className="truncate">{o.label}</span>
                    {o.count != null && <span className={cx('text-[11px] tabular-nums', value === o.id ? 'text-stone-400' : 'text-stone-400/80')}>{o.count}</span>}
                </button>
            ))}
        </div>
    );
}

export function Chip({ active, onClick, children, color, className }) {
    return (
        <button type="button" onClick={onClick} className={cx('inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-sm font-medium border transition-colors flex-shrink-0',
            active ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-stone-900 dark:border-white' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700', className)}>
            {color && !active && <span className={cx('w-2 h-2 rounded-full', DOT[color] || DOT.gray)} />}
            {children}
        </button>
    );
}

export function Badge({ color = 'gray', children, className }) {
    return <span className={cx('inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-semibold leading-none', BADGE[color] || BADGE.gray, className)}>{children}</span>;
}

export function Card({ children, className, ...rest }) {
    return <div {...rest} className={cx('bg-white dark:bg-stone-900 rounded-2xl border border-stone-200/70 dark:border-stone-800', className)}>{children}</div>;
}

export function SectionTitle({ children, action, className }) {
    return (
        <div className={cx('flex items-center justify-between gap-2 mb-2', className)}>
            <h3 className="text-[13px] font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">{children}</h3>
            {action}
        </div>
    );
}

export function EmptyState({ icon = 'Box', title, text, action }) {
    return (
        <div className="text-center py-10 px-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-400 flex items-center justify-center mb-3">
                <Icon name={icon} size={26} />
            </div>
            <p className="font-semibold text-stone-800 dark:text-stone-100">{title}</p>
            {text && <p className="text-sm text-stone-500 dark:text-stone-400 mt-1 max-w-xs mx-auto">{text}</p>}
            {action && <div className="mt-4 flex justify-center">{action}</div>}
        </div>
    );
}

export function Toast({ toast, onClose }) {
    const [leaving, setLeaving] = useState(false);
    useEffect(() => {
        if (!toast) return;
        setLeaving(false);
        const t = setTimeout(() => onClose(), toast.action ? 6000 : 3000);
        return () => clearTimeout(t);
    }, [toast && toast.id]);
    if (!toast) return null;
    const tone = toast.type === 'error' ? 'bg-red-600' : 'bg-stone-900 dark:bg-stone-100 dark:text-stone-900';
    return (
        <div className="fixed left-0 right-0 z-[70] flex justify-center px-4 pointer-events-none top-[calc(0.75rem+env(safe-area-inset-top))] lg:top-auto lg:bottom-6 print:hidden" role="status" aria-live="polite">
            <div className={cx('pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-2xl text-white shadow-lg max-w-md anim-toast', tone, leaving && 'opacity-0')}>
                <Icon name={toast.type === 'error' ? 'Alert' : toast.type === 'info' ? 'Info' : 'Check'} size={18} className="flex-shrink-0" />
                <span className="text-sm font-medium py-1">{toast.msg}</span>
                {toast.action ? (
                    <button onClick={async () => { onClose(); await toast.action.fn(); }} className="ml-1 px-3 h-8 rounded-xl text-sm font-bold text-teal-300 dark:text-teal-700 hover:bg-white/10 flex-shrink-0">{toast.action.label}</button>
                ) : <span className="w-2" />}
            </div>
        </div>
    );
}

export function QtyText({ item, className }) {
    return <span className={className}><span className="font-semibold tabular-nums">{formatAantal(item.aantal)}</span> {item.eenheid}</span>;
}

// Lijst-rij voor menu's en instellingen
export function Row({ icon, iconTone, title, subtitle, right, onClick, danger, className }) {
    const C = onClick ? 'button' : 'div';
    return (
        <C type={onClick ? 'button' : undefined} onClick={onClick} className={cx('w-full flex items-center gap-3 px-4 py-3 text-left', onClick && 'hover:bg-stone-50 dark:hover:bg-stone-800/60 active:bg-stone-100 dark:active:bg-stone-800', className)}>
            {icon && <span className={cx('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconTone || 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300', danger && 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400')}><Icon name={icon} size={18} /></span>}
            <span className="flex-1 min-w-0">
                <span className={cx('block text-[15px] font-medium truncate', danger ? 'text-red-600 dark:text-red-400' : 'text-stone-800 dark:text-stone-100')}>{title}</span>
                {subtitle && <span className="block text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">{subtitle}</span>}
            </span>
            {right !== undefined ? right : (onClick && <Icon name="ChevronRight" size={18} className="text-stone-300 dark:text-stone-600 flex-shrink-0" />)}
        </C>
    );
}

// Logo van een winkel (favicon van hun eigen website). Valt terug op een gekleurde letter.
export function StoreIcon({ name, size = 20, className }) {
    const w = WINKELS.find(x => x.name === name);
    const [failed, setFailed] = useState(false);
    const box = { width: size, height: size };
    if (!w || !w.domain || failed) {
        return <span style={box} className={cx('inline-flex items-center justify-center rounded-md text-white font-bold flex-shrink-0', DOT[w ? w.color : 'gray'], className)}>
            <span style={{ fontSize: size * 0.55 }}>{(name || '?')[0].toUpperCase()}</span></span>;
    }
    return <img src={`https://www.google.com/s2/favicons?domain=${w.domain}&sz=64`} alt="" style={box} loading="lazy" referrerPolicy="no-referrer"
        onError={() => setFailed(true)} className={cx('rounded-md bg-white object-contain flex-shrink-0 ring-1 ring-stone-200 dark:ring-stone-700', className)} />;
}

// Kies een winkel met logo's (horizontaal scrollen).
export function StorePicker({ value, onChange, className }) {
    return (
        <div className={cx('flex flex-wrap gap-1.5', className)} role="radiogroup" aria-label="Winkel">
            <button type="button" role="radio" aria-checked={!value} onClick={() => onChange('')}
                className={cx('h-9 px-3 rounded-full border text-sm font-medium flex-shrink-0', !value ? 'bg-stone-900 text-white border-stone-900 dark:bg-white dark:text-stone-900' : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-300')}>Geen</button>
            {WINKELS.filter(w => w.domain).map(w => (
                <button key={w.name} type="button" role="radio" aria-checked={value === w.name} onClick={() => onChange(w.name)}
                    className={cx('h-9 pl-1.5 pr-3 rounded-full border text-sm font-medium flex items-center gap-1.5 flex-shrink-0', value === w.name ? 'border-teal-600 bg-teal-50 text-teal-900 ring-2 ring-teal-600/20 dark:bg-teal-950/50 dark:text-teal-100' : 'bg-white border-stone-200 text-stone-700 dark:bg-stone-800 dark:border-stone-700 dark:text-stone-200')}>
                    <StoreIcon name={w.name} size={22} className="rounded-full" />{w.name}
                </button>
            ))}
        </div>
    );
}

const COLOR_NAMES = { gray: 'Grijs', red: 'Rood', orange: 'Oranje', yellow: 'Geel', green: 'Groen', teal: 'Turquoise', blue: 'Blauw', indigo: 'Indigo', purple: 'Paars', pink: 'Roze' };

// Kleurkiezer: klik op het bolletje en kies een kleur uit de lijst.
// colors: { sleutel: 'tailwind-klasse' }  (bv. DOT of LOC_DOT)
export function ColorPicker({ value, onChange, colors, names = COLOR_NAMES, size = 'md', label = 'Kleur kiezen' }) {
    const [pos, setPos] = useState(null);
    const btn = useRef(null);
    useEffect(() => {
        if (!pos) return;
        const close = (e) => { if (e.type === 'keydown' ? e.key === 'Escape' : !e.target.closest('[data-colorpop]')) setPos(null); };
        const t = setTimeout(() => { document.addEventListener('mousedown', close); document.addEventListener('touchstart', close); }, 0);
        document.addEventListener('keydown', close);
        window.addEventListener('scroll', () => setPos(null), { once: true, capture: true });
        return () => { clearTimeout(t); document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); document.removeEventListener('keydown', close); };
    }, [pos]);
    const open = () => {
        const r = btn.current.getBoundingClientRect();
        const w = 5 * 40 + 16;
        setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - w - 8)), top: r.bottom + 6 + 120 > window.innerHeight ? r.top - 6 - 104 : r.bottom + 6 });
    };
    const big = size === 'lg';
    return (
        <>
            <button ref={btn} type="button" onClick={() => (pos ? setPos(null) : open())} aria-label={label} aria-haspopup="true" aria-expanded={!!pos} title={label}
                className={cx('flex items-center justify-center flex-shrink-0 rounded-xl transition-colors', big ? 'w-11 h-11 border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800' : 'w-9 h-9 hover:bg-stone-100 dark:hover:bg-stone-800')}>
                <span className={cx('rounded-full ring-2 ring-white dark:ring-stone-900 shadow-sm', big ? 'w-5 h-5' : 'w-6 h-6', colors[value] || Object.values(colors)[0])} />
            </button>
            {pos && (
                <div data-colorpop role="listbox" aria-label={label} style={{ position: 'fixed', left: pos.left, top: pos.top }}
                    className="z-[80] p-2 grid grid-cols-5 gap-1 rounded-2xl bg-white dark:bg-stone-800 shadow-xl border border-stone-200 dark:border-stone-700 anim-fade">
                    {Object.entries(colors).map(([k, cls]) => (
                        <button key={k} type="button" role="option" aria-selected={value === k} aria-label={names[k] || k} title={names[k] || k}
                            onClick={() => { onChange(k); setPos(null); }}
                            className={cx('w-9 h-9 rounded-xl flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-700', value === k && 'bg-stone-100 dark:bg-stone-700')}>
                            <span className={cx('w-6 h-6 rounded-full flex items-center justify-center text-white', cls)}>{value === k && <Icon name="Check" size={14} strokeWidth={3} />}</span>
                        </button>
                    ))}
                </div>
            )}
        </>
    );
}
