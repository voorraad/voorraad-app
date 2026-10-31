import React, { useEffect, useRef, useState } from 'react';
import Icon from './lib/icons.jsx';
import { useStore } from './state/store.jsx';
import { useUi } from './state/ui.jsx';
import { Toast, Button, IconButton, Sheet } from './components/ui.jsx';
import { ItemSheet } from './components/items.jsx';
import ItemForm from './components/ItemForm.jsx';
import AuditSheet from './components/AuditSheet.jsx';
import { ConfirmDialog, PromptDialog, RemoveDialog, MoveSheet, PlanSheet, NewsSheet, Tour } from './components/dialogs.jsx';
import Stock from './pages/Stock.jsx';
import Shopping from './pages/Shopping.jsx';
import Menu from './pages/Menu.jsx';
import More, { subpageTitle } from './pages/More.jsx';
import { UserList } from './pages/meer/Admin.jsx';
import { APP_VERSION, TYPES, TYPE_BY_ID } from './lib/constants.js';
import { cx, itemStatus, todayKey } from './lib/utils.js';

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
    const types = TYPES.filter(t => t.id === 'vriezer' || canSee(t.id));
    const menuTabs = [canSee('weekmenu') && 'week', canSee('recepten') && 'recepten'].filter(Boolean);
    const PAGES = ['voorraad', 'lijst', 'meer', ...(menuTabs.length ? ['menu'] : [])];
    const page = PAGES.includes(route.page) ? route.page : 'voorraad';
    const stockType = types.some(t => t.id === route.sub) ? route.sub : 'vriezer';
    const menuTab = menuTabs.includes(route.sub) ? route.sub : menuTabs[0];
    const activeKey = page === 'voorraad' ? 'voorraad/' + stockType : page === 'menu' ? 'menu/' + menuTab : page;
    const [drawer, setDrawer] = useState(false);
    const [adminOpen, setAdminOpen] = useState(false);
    const onMenu = page === 'menu'; // weekmenu en recepten: zonder voorraad-knoppen
    useEffect(() => { setDrawer(false); }, [route.page, route.sub]);
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

    const openAdd = () => openForm({ type: page === 'voorraad' ? stockType : 'vriezer', nonce: Date.now() });

    const sub = page === 'meer' && subpageTitle(route.sub);
    const title = sub || (page === 'voorraad' ? TYPE_BY_ID[stockType].label : page === 'lijst' ? 'Boodschappen' : page === 'menu' ? (menuTab === 'week' ? 'Weekmenu' : 'Recepten') : 'Instellingen');
    const ownerAcc = accounts.find(a => a.id === ownerId);
    const counts = Object.fromEntries(types.map(t => [t.id, items.filter(i => typeOf(i) === t.id).length]));

    // Onderste balk: de voorraadtypes + boodschappen, met de + in het midden.
    const bottom = [...types.map(t => ({ key: 'voorraad/' + t.id, label: t.label, icon: t.icon })), { key: 'lijst', label: 'Lijst', icon: 'Cart', badge: openCount }];
    const mid = Math.ceil(bottom.length / 2);

    const menuList = (
        <NavMenu activeKey={activeKey} types={types} counts={counts} menuTabs={menuTabs} openCount={openCount}
            onSwitch={accounts.length > 1 ? () => setSwitcher(true) : null} ownerAcc={ownerAcc} isOwn={isOwnAccount} />
    );

    return (
        <div className="min-h-dvh">
            {/* Hamburgermenu */}
            {drawer && (
                <div className="fixed inset-0 z-50 print:hidden" role="dialog" aria-modal="true" aria-label="Menu">
                    <div className="absolute inset-0 bg-stone-900/40 anim-fade" onClick={() => setDrawer(false)} />
                    <div className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-white dark:bg-stone-900 shadow-2xl flex flex-col anim-drawer pt-[env(safe-area-inset-top)]">
                        <div className="flex items-center justify-between px-5 h-14"><Logo small /><IconButton icon="X" label="Menu sluiten" onClick={() => setDrawer(false)} className="-mr-2" /></div>
                        {menuList}
                    </div>
                </div>
            )}

            {/* Kopbalk */}
            <header className="sticky top-0 z-30 bg-stone-50/85 dark:bg-stone-950/85 backdrop-blur-md print:hidden pt-[env(safe-area-inset-top)]">
                <div className={cx('mx-auto px-4 h-14 flex items-center gap-2', 'max-w-7xl')}>
                    {sub ? <IconButton icon="ChevronLeft" label="Terug" onClick={() => go('meer')} className="-ml-2" />
                        : <IconButton icon="Menu" label="Menu openen" onClick={() => setDrawer(true)} className="-ml-2" />}
                    <h1 className={cx('text-xl font-bold text-stone-900 dark:text-white truncate', (page === 'voorraad' || page === 'lijst') && !sub && 'lg:hidden')}>{title}</h1>
                    {(page === 'voorraad' || page === 'lijst') && !sub && <span className="hidden lg:block"><Logo small /></span>}
                    {!onMenu && <nav className="hidden lg:flex items-center gap-1 ml-6">
                        {bottom.map(n => (
                            <a key={n.key} href={'#/' + n.key} className={cx('relative flex items-center gap-2 h-10 px-3.5 rounded-xl text-sm font-semibold transition-colors',
                                activeKey === n.key ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800')}>
                                <Icon name={n.icon} size={18} />{n.key === 'lijst' ? 'Boodschappen' : n.label}
                                {n.badge > 0 && <span className="text-[11px] font-bold bg-teal-600 text-white rounded-full px-1.5">{n.badge}</span>}
                            </a>
                        ))}
                    </nav>}
                    <div className="flex-1" />
                    {accounts.length > 1 && <AccountButton acc={ownerAcc} isOwn={isOwnAccount} compact onClick={() => setSwitcher(true)} />}
                    
                    {isAdmin && (
                        <button type="button" onClick={() => setAdminOpen(true)} aria-label="Admin: gebruikers wisselen" title="Admin: gebruikers, rechten en dashboard"
                            className={cx('h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-sm font-semibold transition-colors',
                                isOwnAccount ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-200' : 'bg-purple-600 text-white hover:bg-purple-700')}>
                            <Icon name="Users" size={17} /><span className="hidden sm:inline">Admin</span>
                        </button>
                    )}
                    {me.showHelpButton && <IconButton icon="Help" label="Rondleiding" onClick={() => setShowTour(true)} className="text-red-500" />}
                </div>
            </header>

            <main className={cx('mx-auto px-4 pt-2 lg:pb-12 max-w-7xl', onMenu ? 'pb-12' : 'pb-32')}>
                {page === 'voorraad' && <Stock />}
                {page === 'lijst' && <Shopping />}
                {page === 'menu' && <Menu />}
                {page === 'meer' && <More />}
            </main>

            {/* Zwevende + (computer) */}
            {!onMenu && <button type="button" onClick={openAdd} aria-label="Product toevoegen" title="Product toevoegen"
                className="hidden lg:flex fixed bottom-8 right-8 z-40 w-16 h-16 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-xl shadow-teal-600/30 items-center justify-center transition print:hidden">
                <Icon name="Plus" size={30} strokeWidth={2.5} />
            </button>}

            {/* Onderste navigatie (gsm) */}
            {!onMenu && <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)] print:hidden">
                <div className="max-w-md mx-auto grid h-16 items-center" style={{ gridTemplateColumns: `repeat(${bottom.length + 1}, minmax(0, 1fr))` }}>
                    {bottom.slice(0, mid).map(n => <NavBtn key={n.key} n={n} active={activeKey === n.key} />)}
                    <div className="flex justify-center">
                        <button type="button" onClick={openAdd} aria-label="Product toevoegen" className="w-14 h-14 -mt-7 rounded-full bg-teal-600 hover:bg-teal-700 active:scale-95 text-white shadow-lg shadow-teal-600/30 flex items-center justify-center ring-4 ring-stone-50 dark:ring-stone-950 transition">
                            <Icon name="Plus" size={28} strokeWidth={2.5} />
                        </button>
                    </div>
                    {bottom.slice(mid).map(n => <NavBtn key={n.key} n={n} active={activeKey === n.key} />)}
                </div>
            </nav>}

            {switcher && <AccountSwitcher onClose={() => setSwitcher(false)} />}
            {isAdmin && (
                <Sheet open={adminOpen} onClose={() => setAdminOpen(false)} size="lg" title="Admin"
                    subtitle={isOwnAccount ? 'Je bekijkt je eigen voorraad' : `Je bekijkt de voorraad van ${(ownerAcc && ownerAcc.label) || 'een andere gebruiker'}`}>
                    {!isOwnAccount && <Button variant="secondary" icon="Home" block className="mb-3" onClick={() => { actions.switchAccount(user.uid); setAdminOpen(false); }}>Terug naar mijn eigen voorraad</Button>}
                    <UserList onNavigate={() => setAdminOpen(false)} />
                </Sheet>
            )}

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

function NavBtn({ n, active }) {
    return (
        <a href={'#/' + n.key} className={cx('relative flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-semibold', active ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400 dark:text-stone-500')}>
            <span className={cx('w-12 h-7 rounded-full flex items-center justify-center transition-colors', active && 'bg-teal-50 dark:bg-teal-950/60')}><Icon name={n.icon} size={21} /></span>
            {n.label}
            {n.badge > 0 && <span className="absolute top-1.5 left-1/2 ml-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">{n.badge > 99 ? '99+' : n.badge}</span>}
        </a>
    );
}

// Inhoud van het hamburgermenu (gsm) en de zijbalk (groot scherm).
function NavMenu({ activeKey, types, counts, menuTabs, openCount, onSwitch, ownerAcc, isOwn }) {
    const { user, me, actions } = useStore();
    const { setShowNews } = useUi();
    const Item = ({ k, icon, label, right }) => (
        <a href={'#/' + k} className={cx('flex items-center gap-3 h-11 px-3 rounded-xl font-medium transition-colors',
            activeKey === k ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200' : 'text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800')}>
            <Icon name={icon} size={20} className="flex-shrink-0" /><span className="flex-1 truncate">{label}</span>{right}
        </a>
    );
    const Head = ({ children }) => <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">{children}</p>;
    const count = (n) => n > 0 ? <span className="text-xs text-stone-400 tabular-nums">{n}</span> : null;
    return (
        <>
            <nav className="px-3 flex-1 overflow-y-auto overscroll-contain">
                {onSwitch && <div className="pb-2"><AccountButton acc={ownerAcc} isOwn={isOwn} onClick={onSwitch} /></div>}
                <Head>Voorraad</Head>
                {types.map(t => <Item key={t.id} k={'voorraad/' + t.id} icon={t.icon} label={t.label} right={count(counts[t.id])} />)}
                <Item k="lijst" icon="Cart" label="Boodschappen" right={openCount > 0 ? <span className="text-xs font-bold bg-teal-600 text-white rounded-full px-2 py-0.5">{openCount}</span> : null} />
                {menuTabs.length > 0 && <Head>Koken</Head>}
                {menuTabs.includes('week') && <Item k="menu/week" icon="Calendar" label="Weekmenu" />}
                {menuTabs.includes('recepten') && <Item k="menu/recepten" icon="Book" label="Recepten" />}
                <Head>Meer</Head>
                <Item k="meer/statistieken" icon="Chart" label="Statistieken" />
                <Item k="meer/delen" icon="Users" label="Delen" />
                <Item k="meer" icon="Settings" label="Instellingen" />
                <button type="button" onClick={() => setShowNews(true)} className="w-full flex items-center gap-3 h-11 px-3 rounded-xl font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800">
                    <Icon name="Sparkles" size={20} />Wat is er nieuw
                </button>
            </nav>
            <div className="p-3 border-t border-stone-100 dark:border-stone-800 flex items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Avatar user={user} />
                <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{user.displayName || user.email}</p><p className="text-xs text-stone-400 truncate">{user.email}</p></div>
                <IconButton icon={me.darkMode ? 'Sun' : 'Moon'} label="Thema wisselen" onClick={actions.toggleDark} />
            </div>
        </>
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
    return (
        <div className="min-h-dvh flex items-center justify-center bg-stone-50 dark:bg-stone-950">
            <img src="./icon_192x192.png" alt="Voorraad wordt geladen" className="w-16 h-16 rounded-2xl animate-pulse" />
        </div>
    );
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
