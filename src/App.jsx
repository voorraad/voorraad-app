import React, { useEffect, useRef, useState } from 'react';
import Icon from './lib/icons.jsx';
import { useStore } from './state/store.jsx';
import { useUi } from './state/ui.jsx';
import { Toast, Button, IconButton } from './components/ui.jsx';
import { ItemSheet } from './components/items.jsx';
import ItemForm from './components/ItemForm.jsx';
import AuditSheet from './components/AuditSheet.jsx';
import { ConfirmDialog, PromptDialog, RemoveDialog, MoveSheet, PlanSheet, NewsSheet, Tour } from './components/dialogs.jsx';
import Overview from './pages/Overview.jsx';
import Stock from './pages/Stock.jsx';
import Shopping from './pages/Shopping.jsx';
import Menu from './pages/Menu.jsx';
import More, { subpageTitle } from './pages/More.jsx';
import { APP_VERSION } from './lib/constants.js';
import { cx, itemStatus, todayKey } from './lib/utils.js';

const NAV = [
    { id: 'overzicht', label: 'Overzicht', icon: 'Home' },
    { id: 'voorraad', label: 'Voorraad', icon: 'Layers' },
    { id: 'lijst', label: 'Boodschappen', short: 'Lijst', icon: 'Cart' },
    { id: 'menu', label: 'Menu', icon: 'Utensils', need: ['weekmenu', 'recepten'] },
    { id: 'meer', label: 'Meer', icon: 'Settings', desktopOnly: true }
];

export default function App() {
    const { authState, user, me, isAdmin, globalSettings } = useStore();
    useEffect(() => {
        if (me.darkMode === undefined) return;
        document.documentElement.classList.toggle('dark', !!me.darkMode);
        try { localStorage.setItem('voorraad_dark', me.darkMode ? '1' : '0'); } catch (e) { }
    }, [me.darkMode]);

    if (authState === 'loading' || (authState === 'in' && !user)) return <Splash />;
    if (authState === 'out') return <Login />;
    if (me.disabled && !isAdmin) return <Blocked />;
    if (globalSettings.maintenance && !isAdmin) return <Maintenance />;
    return <Shell />;
}

function Shell() {
    const store = useStore();
    const { user, me, meLoaded, isAdmin, canSee, shopping, items, typeOf, toast, setToast, accounts, ownerId, isOwnAccount, actions, dataLoaded, globalSettings } = store;
    const ui = useUi();
    const { route, go, openForm, setShowTour, setShowNews } = ui;
    const nav = NAV.filter(n => !n.need || n.need.some(canSee));
    const page = nav.some(n => n.id === route.page) ? route.page : 'overzicht';
    const [switcher, setSwitcher] = useState(false);
    const openCount = shopping.filter(s => !s.checked).length;

    // Rondleiding voor nieuwe gebruikers, daarna eenmalig "wat is er nieuw" bij een nieuwe versie.
    const checked = useRef(false);
    useEffect(() => {
        if (checked.current || !dataLoaded || !meLoaded || !globalSettings.onboardingLoaded) return;
        checked.current = true;
        const seenVersion = localStorage.getItem('app_version');
        if (globalSettings.onboardingActive && !me.tourDisabled && me.hasSeenTutorial !== true) setShowTour(true);
        else if (seenVersion && seenVersion !== APP_VERSION) setShowNews(true);
        localStorage.setItem('app_version', APP_VERSION);
    }, [dataLoaded, meLoaded, globalSettings.onboardingLoaded]);

    // Browsermelding (max. 1× per dag) wanneer er producten verlopen zijn.
    useEffect(() => {
        if (!dataLoaded || me.notificationsEnabled === false || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
        const urgent = items.filter(i => ['expired', 'veryold'].includes(itemStatus(i, typeOf(i)).level));
        const key = 'gemeld_' + todayKey();
        if (!urgent.length || localStorage.getItem(key)) return;
        const title = urgent.length === 1 ? '1 product moet dringend op' : `${urgent.length} producten moeten dringend op`;
        const body = urgent.slice(0, 5).map(i => i.naam).join(', ') + (urgent.length > 5 ? '…' : '');
        const opts = { body, icon: './icon_192x192.png', badge: './icon_192x192.png', tag: 'voorraad-alerts' };
        (navigator.serviceWorker ? navigator.serviceWorker.ready.then(r => r.showNotification(title, opts)) : Promise.reject())
            .catch(() => { try { new Notification(title, opts); } catch (e) { } });
        localStorage.setItem(key, '1');
    }, [dataLoaded, items.length]);

    const addType = page === 'voorraad' && ['vriezer', 'frig', 'voorraad'].includes(route.sub) ? route.sub : (page === 'voorraad' ? 'vriezer' : undefined);
    const openAdd = () => openForm({ type: addType || 'vriezer', nonce: Date.now() });

    const sub = page === 'meer' && subpageTitle(route.sub);
    const title = sub || (nav.find(n => n.id === page) || {}).label;
    const ownerAcc = accounts.find(a => a.id === ownerId);

    return (
        <div className="min-h-dvh lg:pl-64">
            {/* Zijbalk (groot scherm) */}
            <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 print:hidden">
                <div className="px-6 pt-6 pb-4"><Logo /></div>
                <div className="px-4">
                    <Button block icon="Plus" onClick={openAdd} className="mb-4">Product toevoegen</Button>
                </div>
                <nav className="px-3 space-y-0.5 flex-1">
                    {nav.map(n => (
                        <a key={n.id} href={'#/' + n.id} className={cx('flex items-center gap-3 h-11 px-3 rounded-xl font-medium transition-colors', page === n.id ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800')}>
                            <Icon name={n.icon} size={20} />{n.label}
                            {n.id === 'lijst' && openCount > 0 && <span className="ml-auto text-xs font-bold bg-teal-600 text-white rounded-full px-2 py-0.5">{openCount}</span>}
                        </a>
                    ))}
                </nav>
                {accounts.length > 1 && <div className="p-3"><AccountButton acc={ownerAcc} isOwn={isOwnAccount} onClick={() => setSwitcher(true)} /></div>}
                <div className="p-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-3">
                    <Avatar user={user} />
                    <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{user.displayName || user.email}</p><p className="text-xs text-stone-400 truncate">{user.email}</p></div>
                    <IconButton icon={me.darkMode ? 'Sun' : 'Moon'} label="Thema wisselen" onClick={actions.toggleDark} />
                </div>
            </aside>

            {/* Kopbalk */}
            <header className="sticky top-0 z-30 bg-stone-50/85 dark:bg-stone-950/85 backdrop-blur-md print:hidden pt-[env(safe-area-inset-top)]">
                <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
                    {sub && <IconButton icon="ChevronLeft" label="Terug" onClick={() => go('meer')} className="-ml-2" />}
                    {page === 'overzicht' && !sub && <span className="lg:hidden"><Logo small /></span>}
                    <h1 className={cx('text-xl font-bold text-stone-900 dark:text-white truncate', page === 'overzicht' && !sub && 'hidden lg:block')}>{title}</h1>
                    <div className="flex-1" />
                    {accounts.length > 1 && <span className="lg:hidden"><AccountButton acc={ownerAcc} isOwn={isOwnAccount} compact onClick={() => setSwitcher(true)} /></span>}
                    {me.showHelpButton && <IconButton icon="Help" label="Rondleiding" onClick={() => setShowTour(true)} className="text-red-500" />}
                    <button type="button" onClick={() => go('meer')} className="lg:hidden rounded-full ring-2 ring-transparent hover:ring-teal-500/40" aria-label="Meer en instellingen"><Avatar user={user} /></button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 pt-2 pb-32 lg:pb-12">
                {page === 'overzicht' && <Overview />}
                {page === 'voorraad' && <Stock />}
                {page === 'lijst' && <Shopping />}
                {page === 'menu' && <Menu />}
                {page === 'meer' && <More />}
            </main>

            {/* Onderste navigatie (gsm) */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)] print:hidden">
                <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center">
                    {nav.filter(n => !n.desktopOnly).slice(0, 2).map(n => <NavBtn key={n.id} n={n} active={page === n.id} />)}
                    <div className="flex justify-center">
                        <button type="button" onClick={openAdd} aria-label="Product toevoegen" className="w-14 h-14 -mt-7 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-lg shadow-teal-600/30 flex items-center justify-center ring-4 ring-stone-50 dark:ring-stone-950 transition">
                            <Icon name="Plus" size={28} strokeWidth={2.5} />
                        </button>
                    </div>
                    {nav.filter(n => !n.desktopOnly).slice(2).map(n => <NavBtn key={n.id} n={n} active={page === n.id} badge={n.id === 'lijst' ? openCount : 0} />)}
                    {nav.filter(n => !n.desktopOnly).length < 4 && <NavBtn n={NAV[4]} active={page === 'meer'} />}
                </div>
            </nav>

            {switcher && <AccountSwitcher onClose={() => setSwitcher(false)} />}

            <ItemSheet />
            <AuditSheet />
            <ItemForm />
            <RemoveDialog />
            <MoveSheet />
            <PlanSheet />
            <NewsSheet />
            <Tour />
            <PromptDialog />
            <ConfirmDialog />
            <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
    );
}

function NavBtn({ n, active, badge }) {
    return (
        <a href={'#/' + n.id} className={cx('relative flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-semibold', active ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400 dark:text-stone-500')}>
            <span className={cx('w-12 h-7 rounded-full flex items-center justify-center transition-colors', active && 'bg-teal-50 dark:bg-teal-950/60')}><Icon name={n.icon} size={21} /></span>
            {n.short || n.label}
            {badge > 0 && <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{badge > 99 ? '99+' : badge}</span>}
        </a>
    );
}

function AccountButton({ acc, isOwn, onClick, compact }) {
    return (
        <button type="button" onClick={onClick} className={cx('flex items-center gap-2 rounded-xl text-left transition-colors', compact ? 'h-9 px-2.5 max-w-[10rem]' : 'w-full h-12 px-3',
            isOwn ? 'bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700' : 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-200')}>
            <Icon name={isOwn ? 'Home' : 'Users'} size={16} className="flex-shrink-0" />
            <span className="text-sm font-semibold truncate flex-1">{compact ? (isOwn ? 'Mijn' : (acc && acc.label || '').split('@')[0]) : (acc ? acc.label : 'Mijn voorraad')}</span>
            <Icon name="ChevronDown" size={14} className="flex-shrink-0 opacity-60" />
        </button>
    );
}

function AccountSwitcher({ onClose }) {
    const { accounts, ownerId, user, actions } = useStore();
    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-stone-900/40" onClick={onClose} />
            <div className="relative w-full sm:max-w-sm bg-white dark:bg-stone-900 rounded-t-3xl sm:rounded-2xl p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] anim-sheet">
                <p className="px-3 pt-2 pb-2 font-bold">Welke voorraad?</p>
                {accounts.map(a => (
                    <button key={a.id} type="button" onClick={() => { if (a.id !== ownerId) actions.switchAccount(a.id); onClose(); }}
                        className={cx('w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left', a.id === ownerId ? 'bg-teal-50 dark:bg-teal-950/50' : 'hover:bg-stone-50 dark:hover:bg-stone-800')}>
                        <Icon name={a.id === user.uid ? 'Home' : 'Users'} size={18} className="text-stone-500" />
                        <span className="flex-1 min-w-0"><span className="block font-medium truncate">{a.label}</span>{a.id !== user.uid && <span className="block text-xs text-stone-400">{a.viaAdmin ? 'via admin' : 'gedeeld met jou'}</span>}</span>
                        {a.id === ownerId && <Icon name="Check" size={18} className="text-teal-600" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function Logo({ small }) {
    return (
        <span className={cx('font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-2', small ? 'text-lg' : 'text-xl')}>
            <img src="./icon_192x192.png" alt="" className={cx('rounded-lg', small ? 'w-7 h-7' : 'w-8 h-8')} />
            Voorraad<span className="text-teal-600 -ml-2">.</span>
        </span>
    );
}

function Avatar({ user }) {
    return user.photoURL
        ? <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        : <span className="w-9 h-9 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-200 flex items-center justify-center font-bold flex-shrink-0">{(user.displayName || user.email || '?')[0].toUpperCase()}</span>;
}

function CenterCard({ children }) {
    return (
        <div className="min-h-dvh flex items-center justify-center p-6 bg-stone-50 dark:bg-stone-950">
            <div className="w-full max-w-sm text-center">{children}</div>
        </div>
    );
}

function Splash() {
    return <CenterCard><div className="animate-pulse"><Logo /></div></CenterCard>;
}

function Login() {
    const { actions } = useStore();
    return (
        <CenterCard>
            <div className="flex justify-center mb-6"><img src="./icon_512x512.png" alt="" className="w-20 h-20 rounded-3xl shadow-lg" /></div>
            <h1 className="text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">Voorraad<span className="text-teal-600">.</span></h1>
            <p className="text-stone-500 dark:text-stone-400 mt-2 mb-8">Weet wat er in je vriezer, frigo en kast zit, en gooi minder weg.</p>
            <button type="button" onClick={actions.login} className="w-full h-12 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 font-semibold flex items-center justify-center gap-3 shadow-sm hover:shadow">
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
                Inloggen met Google
            </button>
        </CenterCard>
    );
}

function Maintenance() {
    const { actions } = useStore();
    return (
        <CenterCard>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-4"><Icon name="Wrench" size={30} /></div>
            <h1 className="text-xl font-bold">Even onderhoud</h1>
            <p className="text-stone-500 mt-2 mb-6">We werken aan een update. Probeer het straks opnieuw.</p>
            <Button variant="ghost" icon="LogOut" onClick={actions.logout}>Uitloggen</Button>
        </CenterCard>
    );
}

function Blocked() {
    const { actions } = useStore();
    return (
        <CenterCard>
            <div className="w-16 h-16 mx-auto rounded-2xl bg-red-100 text-red-700 flex items-center justify-center mb-4"><Icon name="Lock" size={30} /></div>
            <h1 className="text-xl font-bold">Account geblokkeerd</h1>
            <p className="text-stone-500 mt-2 mb-6">Je account is uitgeschakeld door de beheerder.</p>
            <Button variant="ghost" icon="LogOut" onClick={actions.logout}>Uitloggen</Button>
        </CenterCard>
    );
}
