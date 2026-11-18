import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../lib/icons.jsx';
import { db } from '../lib/firebase.js';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, Toggle, IconButton, SectionTitle, Segmented, Select, ColorPicker } from '../components/ui.jsx';
import { useAllUserData } from './admin/data.js';
import { UserMessages, useUnreadCount } from '../components/Berichten.jsx';
import { ServerPanel } from './admin/Server.jsx';
import { OnlineNow, HolidayMode, StorageUsage, NewUserDefaults, MonthReport, isOnline } from './admin/More2.jsx';
import { GlobalSearch, StockValue, useTotalValue, FeatureUsage, BlockedAttempts, BulkRights, Invites, RestoreUser, SharedBarcodes, CopyLocation, LabelPicker } from './admin/More.jsx';
import { NewUsersBanner, InactiveUsers, inactiveUsers, ActivityChart, WasteRanking, AnnouncementEditor, BackupAll, AdminNote, Cleanup } from './admin/Extra.jsx';
import { userToneKey, USER_TONE_DOTS, USER_TONE_NAMES } from '../lib/userColors.js';
import Stock from './Stock.jsx';
import { UserRights, TourEditor, TAB_OPTIONS } from './meer/Admin.jsx';
import { Logboek, Statistieken, logTone, userTone, LogMeta } from './meer/Inzicht.jsx';
import { Locaties, Categorieen, Eenheden } from './meer/Beheer.jsx';
import Shopping from './Shopping.jsx';
import { Week, Recipes } from './Menu.jsx';
import { UrgentList } from '../components/Urgent.jsx';
import { exportCSV, exportPDF, exportBackup } from '../lib/exporters.js';
import { APP_VERSION, TYPES } from '../lib/constants.js';
import { cx, formatDateTime, toDate, itemStatus, isMenuEntry, smartMatch, statusText, STATUS_TONE, emojiFor, formatAantal, URGENCY, euro } from '../lib/utils.js';

// Aparte beheerpagina voor admins (#/admin). Admins komen hier na het inloggen terecht.
const TABS = [
    { id: 'overzicht', label: 'Overzicht', icon: 'Dashboard' },
    { id: 'dashboard', label: 'Per gebruiker', short: 'Gebruiker', icon: 'User' },
    { id: 'verlopen', label: 'Verlopen', icon: 'Alert' },
    { id: 'inzicht', label: 'Inzicht', icon: 'Chart' },
    { id: 'logboek', label: 'Logboek', icon: 'Log' },
    { id: 'app', label: 'App-instellingen', short: 'Instellingen', icon: 'Settings' }
];

export default function AdminPage() {
    const { user, me, actions } = useStore();
    const { route, go } = useUi();
    const sub = route.sub === 'gebruikers' ? 'dashboard' : route.sub; // oude link
    const tab = TABS.some(t => t.id === sub) ? sub : 'overzicht';

    return (
        <div className="min-h-dvh">
            <header className="sticky top-0 z-30 bg-stone-50/85 dark:bg-stone-950/85 backdrop-blur-md border-b border-stone-200/70 dark:border-stone-800 print:hidden pt-[env(safe-area-inset-top)]">
                <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-2">
                    <span className="font-extrabold tracking-tight text-lg text-stone-900 dark:text-white flex items-center gap-2">
                        <img src="./icon_logo_96.png?v=12" alt="" className="w-7 h-7 rounded-lg" /><span className="hidden sm:inline">Voorraad<span className="text-teal-600">.</span></span>
                    </span>
                    <span className="ml-1 text-xs font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200">Beheer</span>
                    <div className="flex-1" />
                    <Button size="sm" icon="Home" onClick={() => { actions.switchAccount(user.uid, true); go('voorraad'); }}>Mijn voorraad</Button>
                    <IconButton icon={me.darkMode ? 'Sun' : 'Moon'} label="Thema wisselen" onClick={actions.toggleDark} />
                    <IconButton icon="LogOut" label="Uitloggen" onClick={actions.logout} />
                </div>
                <nav className="hidden lg:flex max-w-7xl mx-auto px-2 flex-wrap gap-1 pb-2">
                    {TABS.map(t => (
                        <a key={t.id} href={'#/admin/' + t.id}
                            className={cx('h-10 px-3.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors',
                                tab === t.id ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-200' : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800')}>
                            <Icon name={t.icon} size={18} />{t.label}
                        </a>
                    ))}
                </nav>
            </header>
            <main className="max-w-7xl mx-auto px-4 pt-4 pb-28 lg:pb-16">
                {tab === 'overzicht' && <AdminOverview />}
                {tab === 'dashboard' && <AdminUser />}
                {tab === 'verlopen' && <AllExpired />}
                {tab === 'inzicht' && <div className="space-y-6"><ActivityChart /><WasteRanking /><div className="grid gap-6 lg:grid-cols-2 items-start"><MonthReport /><StorageUsage /></div><div className="grid gap-6 lg:grid-cols-2 items-start"><StockValue /><FeatureUsage /></div><div className="grid gap-6 lg:grid-cols-2 items-start"><InactiveUsers /><BlockedAttempts /></div></div>}
                {tab === 'logboek' && <Logboek defaultAll />}
                {tab === 'app' && <AppSettings />}
                <p className="text-xs text-stone-400 mt-10">Ingelogd als {user.email}</p>
            </main>
            {/* Zwevende navigatie onderaan op gsm/tablet, zoals in de app */}
            <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)] print:hidden">
                <div className="max-w-md mx-auto grid h-16 items-center" style={{ gridTemplateColumns: `repeat(${TABS.length}, minmax(0, 1fr))` }}>
                    {TABS.map(t => (
                        <a key={t.id} href={'#/admin/' + t.id} className={cx('flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-semibold', tab === t.id ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400 dark:text-stone-500')}>
                            <span className={cx('w-12 h-7 rounded-full flex items-center justify-center transition-colors', tab === t.id && 'bg-teal-50 dark:bg-teal-950/60')}><Icon name={t.icon} size={21} /></span>
                            {t.short || t.label}
                        </a>
                    ))}
                </div>
            </nav>
        </div>
    );
}

const useUserStats = useAllUserData;

function AdminOverview() {
    const { usersList, globalSettings, ownerId, actions } = useStore();
    const { go } = useUi();
    const stats = useUserStats(usersList);
    const totalValue = useTotalValue();
    const [logs, setLogs] = useState([]);
    const [q, setQ] = useState('');
    const [sort, setSort] = useState('gezien');
    useEffect(() => db.collection('logs').orderBy('timestamp', 'desc').limit(8)
        .onSnapshot(s => setLogs(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => { }), []);

    const weekAgo = Date.now() - 7 * 864e5;
    const active7 = usersList.filter(u => (toDate(u.laatstGezien) || 0) >= weekAgo).length;
    const blocked = usersList.filter(u => u.disabled).length;
    const loaded = Object.values(stats).filter(s => !s.error);
    const totalItems = loaded.reduce((a, s) => a + s.items, 0);
    const totalExpired = loaded.reduce((a, s) => a + s.expired, 0);
    const done = Object.keys(stats).length >= usersList.length;
    const emailOf = (id) => ((usersList.find(u => u.id === id) || {}).email || '?');

    // Gedeelde voorraden: wie beheert mee bij wie (aanvaarde deel-verzoeken)
    const [shares, setShares] = useState([]);
    useEffect(() => db.collection('shares').where('status', '==', 'accepted').onSnapshot(s => setShares(s.docs.map(d => d.data())), () => { }), []);
    const members = useMemo(() => {
        const m = {};
        shares.forEach(sh => {
            const u = usersList.find(x => x.id === sh.acceptedUid || (x.email || '').toLowerCase() === (sh.sharedWithEmail || '').toLowerCase());
            if (u && u.id !== sh.ownerId) (m[sh.ownerId] = m[sh.ownerId] || []).some(x => x.id === u.id) || m[sh.ownerId].push(u);
        });
        return m;
    }, [shares, usersList]);
    const memberOf = (uid) => Object.keys(members).filter(o => members[o].some(x => x.id === uid));
    // Wie meebeheert en zelf geen producten heeft (lege locaties tellen niet), staat alleen ingesprongen onder de eigenaar.
    const onlyMember = (u) => memberOf(u.id).length > 0 && stats[u.id] && !stats[u.id].error && !stats[u.id].items;
    const matches = (u) => smartMatch(u.email || u.displayName || '', q);
    const rows = useMemo(() => usersList.filter(u => !onlyMember(u) && (matches(u) || (members[u.id] || []).some(matches))).sort((a, b) => {
        if (sort === 'producten') return ((stats[b.id] || {}).items || 0) - ((stats[a.id] || {}).items || 0);
        if (sort === 'verlopen') return ((stats[b.id] || {}).expired || 0) - ((stats[a.id] || {}).expired || 0);
        return (toDate(b.laatstGezien) || 0) - (toDate(a.laatstGezien) || 0);
    }), [usersList, stats, q, sort, members]);
    const nm = (id) => { const u = usersList.find(x => x.id === id); return u ? (u.email || u.displayName || '').split('@')[0] : '?'; };

    return (
        <div className="space-y-6">
            <NewUsersBanner />
            <OnlineNow />
            <GlobalSearch />
            {globalSettings.maintenance && (
                <Card className="p-4 flex items-center gap-3 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
                    <Icon name="Wrench" size={20} className="text-amber-600" />
                    <p className="flex-1 text-sm font-medium">De onderhoudsmodus staat <b>aan</b>: gewone gebruikers kunnen de app niet gebruiken.</p>
                    <Button size="sm" onClick={() => actions.setGlobal('maintenance', { active: false })}>Uitzetten</Button>
                </Card>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
                <Kpi label="Gebruikers" value={usersList.length} icon="Users" onClick={() => go('admin/dashboard')} />
                <Kpi label="Actief (7 dagen)" value={active7} icon="Clock" />
                <Kpi label="Inactief (30 dagen)" value={inactiveUsers(usersList).length} icon="Clock" tone={inactiveUsers(usersList).length ? 'text-amber-600' : undefined} onClick={() => go('admin/inzicht')} />
                <Kpi label="Geblokkeerd" value={blocked} icon="Lock" tone={blocked ? 'text-red-600' : undefined} />
                <Kpi label="Producten (alle)" value={done ? totalItems : '…'} icon="Box" />
                <Kpi label="Verlopen (alle)" value={done ? totalExpired : '…'} icon="Alert" tone={totalExpired ? 'text-red-600' : undefined} />
                <Kpi label="Waarde (alle)" value={totalValue == null ? '…' : euro(totalValue)} icon="Tag" onClick={() => go('admin/inzicht')} />
            </div>

            <div className="grid gap-6 xl:grid-cols-3 items-start grid-cols-1">
                <section className="xl:col-span-2 min-w-0">
                    <SectionTitle>Alle gebruikers</SectionTitle>
                    <div className="flex flex-wrap gap-2 mb-3">
                        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Zoek gebruiker…"
                            className="flex-1 min-w-[12rem] h-10 px-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none focus:border-teal-500 text-sm" />
                        {[['gezien', 'Laatst gezien'], ['producten', 'Meeste producten'], ['verlopen', 'Meeste verlopen']].map(([id, lbl]) => (
                            <button key={id} type="button" onClick={() => setSort(id)} className={cx('h-10 px-3 rounded-xl text-sm font-semibold', sort === id ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800')}>{lbl}</button>
                        ))}
                    </div>
                    <Card className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-xs text-stone-500 border-b border-stone-100 dark:border-stone-800">
                                <tr><th className="px-3 sm:px-4 py-2.5 font-semibold">Gebruiker</th><th className="px-2 py-2.5 font-semibold hidden sm:table-cell">Laatst gezien</th><th className="px-2 py-2.5 font-semibold text-right"><span className="sm:hidden">Prod.</span><span className="hidden sm:inline">Producten</span></th><th className="px-2 py-2.5 font-semibold text-right"><span className="sm:hidden">Verl.</span><span className="hidden sm:inline">Verlopen</span></th><th className="px-2 sm:px-4 py-2.5" /></tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                                {rows.map(u => {
                                    const s = stats[u.id];
                                    const mem = members[u.id] || [];
                                    const also = memberOf(u.id);
                                    return (
                                        <React.Fragment key={u.id}>
                                        <tr className={cx(u.id === ownerId && 'bg-teal-50/50 dark:bg-teal-950/20')}>
                                            <td className="px-3 sm:px-4 py-2.5">
                                                <span className="flex items-center gap-2 min-w-0">
                                                    <span className={cx('relative w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold', userTone(u.id, usersList).pill)}>
                                                        {(u.email || u.displayName || '?')[0].toUpperCase()}
                                                        <span title={u.disabled ? 'Geblokkeerd' : 'Actief'} className={cx('absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-stone-900', u.disabled ? 'bg-red-500' : 'bg-emerald-500')} />
                                                    </span>
                                                    <span className="min-w-0">
                                                        <span className="block truncate max-w-[6.5rem] sm:max-w-[16rem] font-medium">{u.email || u.displayName || u.id}</span>
                                                        {mem.length > 0 && <span className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-300"><Icon name="Users" size={11} />gedeeld met {mem.length}</span>}
                                                        {also.length > 0 && <span className="block truncate max-w-[6.5rem] sm:max-w-[16rem] text-[11px] text-stone-400">ook bij {also.map(nm).join(', ')}</span>}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-2 py-2.5 text-stone-500 whitespace-nowrap hidden sm:table-cell">{u.laatstGezien ? formatDateTime(u.laatstGezien) : 'nooit'}</td>
                                            <td className="px-2 py-2.5 text-right tabular-nums">{s ? (s.error ? '–' : s.items) : '…'}</td>
                                            <td className={cx('px-2 py-2.5 text-right tabular-nums', s && s.expired ? 'text-red-600 font-semibold' : '')}>{s ? (s.error ? '–' : s.expired) : '…'}</td>
                                            <td className="px-2 sm:px-4 py-1.5">
                                                <span className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" icon="Box" aria-label="Bekijk" onClick={() => go('admin/dashboard/' + u.id)}><span className="hidden sm:inline">Bekijk</span></Button>
                                                    <Button size="sm" variant="soft" icon="Swap" aria-label="Open" onClick={() => { actions.switchAccount(u.id); go('voorraad'); }}><span className="hidden sm:inline">Open</span></Button>
                                                </span>
                                            </td>
                                        </tr>
                                        {mem.map((m, mi) => (
                                            <tr key={u.id + m.id} className="bg-stone-50/60 dark:bg-stone-900/40 !border-t-0">
                                                <td className="pl-5 sm:pl-6 pr-3 py-1.5" colSpan={1}>
                                                    <span className="flex items-center gap-2 min-w-0">
                                                        <span className="relative w-5 h-8 flex-shrink-0" aria-hidden="true">
                                                            <span className={cx('absolute left-1/2 top-0 w-px bg-stone-300 dark:bg-stone-600', mi === mem.length - 1 ? 'h-1/2' : 'h-full')} />
                                                            <span className="absolute left-1/2 top-1/2 h-px w-2.5 bg-stone-300 dark:bg-stone-600" />
                                                        </span>
                                                        <span className={cx('w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold', userTone(m.id, usersList).pill)}>{(m.email || '?')[0].toUpperCase()}</span>
                                                        <span className="min-w-0">
                                                            <span className="block truncate max-w-[5.5rem] sm:max-w-[14rem] text-sm">{m.email || m.displayName}</span>
                                                            <span className="block text-[11px] text-stone-400">beheert mee{stats[m.id] && !stats[m.id].items && stats[m.id].locs ? ' · eigen voorraad leeg' : ''}</span>
                                                        </span>
                                                    </span>
                                                </td>
                                                <td className="hidden sm:table-cell" />
                                                <td className="px-2 text-right text-xs text-stone-400" colSpan={2}>{stats[m.id] && stats[m.id].items ? `eigen: ${stats[m.id].items}` : ''}</td>
                                                <td className="px-2 sm:px-4 py-1">
                                                    <span className="flex justify-end"><Button size="sm" variant="ghost" icon="Box" aria-label={`Bekijk ${m.email}`} onClick={() => go('admin/dashboard/' + m.id)}><span className="hidden sm:inline">Bekijk</span></Button></span>
                                                </td>
                                            </tr>
                                        ))}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </Card>
                    <p className="text-xs text-stone-400 mt-2">"Bekijk" toont de voorraad hier op de beheerpagina. "Open" opent de app zelf met de voorraad van die gebruiker.</p>
                </section>

                <section>
                    <SectionTitle action={<a href="#/admin/logboek" className="text-sm font-semibold text-teal-700 dark:text-teal-300">Alles</a>}>Recente activiteit</SectionTitle>
                    <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                        {logs.length === 0 && <p className="p-4 text-sm text-stone-500">Nog geen activiteit.</p>}
                        {logs.map(l => {
                            const [ic, cl] = logTone(l.action);
                            const ut = userTone(l.actorId || l.actorName, usersList);
                            return (
                                <div key={l.id} className={cx('flex gap-3 px-4 py-2.5 border-l-4', ut.bar)}>
                                    <span className={cx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5', cl)}><Icon name={ic} size={15} /></span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between gap-2"><p className="font-semibold text-sm truncate">{l.item || l.action}</p><p className="text-xs text-stone-400 flex-shrink-0 tabular-nums">{formatDateTime(l.timestamp)}</p></div>
                                        {l.details && <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{l.details}</p>}
                                        <LogMeta l={l} usersList={usersList} />
                                    </div>
                                </div>
                            );
                        })}
                    </Card>
                </section>
            </div>
        </div>
    );
}

function Kpi({ label, value, icon, tone, onClick }) {
    const C = onClick ? 'button' : 'div';
    return (
        <C type={onClick ? 'button' : undefined} onClick={onClick} className="text-left p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/70 dark:border-stone-800">
            <Icon name={icon} size={18} className="text-stone-400" />
            <p className={cx('text-2xl font-bold mt-2 tabular-nums', tone || 'text-stone-900 dark:text-white')}>{value}</p>
            <p className="text-sm text-stone-500">{label}</p>
        </C>
    );
}

const APP_SUBS = [
    { id: 'algemeen', label: 'Algemeen', icon: 'Settings' },
    { id: 'gebruikers', label: 'Gebruikers', icon: 'Users' },
    { id: 'gegevens', label: 'Gegevens', icon: 'Download' },
    { id: 'server', label: 'Server & meldingen', icon: 'Bell' },
    { id: 'rondleiding', label: 'Rondleiding', icon: 'Help' }
];
function AppSettings() {
    const { globalSettings, actions } = useStore();
    const { confirm, route, go } = useUi();
    const sub = APP_SUBS.some(t => t.id === route.extra) ? route.extra : 'algemeen';
    return (
        <div className="space-y-6">
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                <div className="flex gap-1.5 w-max">
                    {APP_SUBS.map(t => (
                        <button key={t.id} type="button" onClick={() => go('admin/app/' + t.id)}
                            className={cx('h-9 px-3 rounded-full text-sm font-semibold flex items-center gap-1.5 border', sub === t.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white border-stone-200 text-stone-600 dark:bg-stone-900 dark:border-stone-800 dark:text-stone-300')}>
                            <Icon name={t.icon} size={15} />{t.label}
                        </button>
                    ))}
                </div>
            </div>
            {sub === 'algemeen' && (
                <div className="grid gap-6 lg:grid-cols-2 items-start">
                    <section>
                        <SectionTitle>Toegang</SectionTitle>
                        <Card className="px-4 py-2">
                            <Toggle checked={globalSettings.maintenance} onChange={c => actions.setGlobal('maintenance', { active: c })} label="Onderhoudsmodus" description="Gewone gebruikers zien een onderhoudsscherm. Admins kunnen de app blijven gebruiken." />
                        </Card>
                        <SectionTitle className="mt-6">Rondleiding</SectionTitle>
                        <Card className="px-4 py-2">
                            <Toggle checked={globalSettings.onboardingActive} onChange={c => actions.setGlobal('onboarding', { isActive: c })} label="Tonen aan nieuwe gebruikers" />
                        </Card>
                        <Button variant="secondary" block className="mt-3" icon="Undo" onClick={async () => { if (await confirm({ title: 'Rondleiding resetten voor iedereen?', message: 'Alle gebruikers zien de rondleiding opnieuw bij de volgende keer openen.', confirmLabel: 'Resetten', danger: true })) actions.resetTourForEveryone(); }}>Rondleiding resetten voor iedereen</Button>
                    </section>
                    <AnnouncementEditor />
                </div>
            )}
            {sub === 'gebruikers' && <div className="grid gap-6 xl:grid-cols-2 items-start"><div className="space-y-6"><Invites /><NewUserDefaults /></div><BulkRights /></div>}
            {sub === 'gegevens' && <div className="grid gap-6 lg:grid-cols-2 items-start"><div className="space-y-6"><BackupAll /><RestoreUser /></div><SharedBarcodes /></div>}
            {sub === 'server' && <ServerPanel />}
            {sub === 'rondleiding' && <section><SectionTitle>Stappen van de rondleiding</SectionTitle><TourEditor /></section>}
        </div>
    );
}


// ---------------- Alles over één gebruiker ----------------
const USER_TABS = [
    { id: 'voorraad', label: 'Voorraad', icon: 'Box' },
    { id: 'eerst', label: 'Verlopen & eerst op', icon: 'Alert' },
    { id: 'lijst', label: 'Boodschappen', icon: 'Cart' },
    { id: 'week', label: 'Weekmenu', icon: 'Calendar' },
    { id: 'recepten', label: 'Recepten', icon: 'Book' },
    { id: 'locaties', label: 'Locaties & lades', icon: 'Layers' },
    { id: 'categorieen', label: 'Categorieën', icon: 'Tag' },
    { id: 'eenheden', label: 'Eenheden', icon: 'List' },
    { id: 'stats', label: 'Statistieken', icon: 'Chart' },
    { id: 'berichten', label: 'Berichten', icon: 'Message' },
    { id: 'log', label: 'Logboek', icon: 'Log' },
    { id: 'etiketten', label: 'Etiketten afdrukken', icon: 'Printer' },
    { id: 'kopieer', label: 'Locatie kopiëren', icon: 'Copy' },
    { id: 'opkuisen', label: 'Opkuisen', icon: 'Wrench' },
    { id: 'rechten', label: 'Rechten', icon: 'Lock' },
    { id: 'delen', label: 'Delen & export', icon: 'Share' }
];

// Uitklapmenu met de onderdelen per gebruiker
function TabDropdown({ tabs, value, hrefFor }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const cur = tabs.find(t => t.id === value) || tabs[0];
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
    }, [open]);
    return (
        <div ref={ref} className="relative">
            <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(o => !o)}
                className="h-11 w-full sm:w-auto sm:min-w-[16rem] pl-3 pr-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:border-stone-300 flex items-center gap-2.5 text-left font-semibold">
                <span className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0"><Icon name={cur.icon} size={15} /></span>
                <span className="flex-1 truncate">{cur.label}</span>
                <Icon name="ChevronDown" size={18} className={cx('text-stone-400 transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
                <div role="menu" className="absolute z-30 left-0 mt-1.5 w-full sm:w-80 max-h-[70vh] overflow-y-auto p-1.5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-xl">
                    {tabs.map(t => (
                        <a key={t.id} role="menuitem" href={hrefFor(t.id)} onClick={() => setOpen(false)}
                            className={cx('flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-semibold',
                                t.id === cur.id ? 'bg-teal-50 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200' : 'text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800')}>
                            <Icon name={t.icon} size={16} className={t.id === cur.id ? '' : 'text-stone-400'} />
                            <span className="flex-1">{t.label}</span>
                            {t.id === cur.id && <Icon name="Check" size={16} />}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}

function AdminUser() {
    const { usersList, ownerId, user, actions, items, vriezers, lades, shopping, recepten, typeOf, locById, ladeById, loaded } = useStore();
    const { route, go, openForm } = useUi();
    const uid = route.extra || ownerId;
    const sub = USER_TABS.some(t => t.id === route.extra2) ? route.extra2 : 'voorraad';
    const [type, setType] = useState('vriezer');
    const [isAdminUser, setIsAdminUser] = useState(false);
    useEffect(() => { if (uid && uid !== ownerId) actions.switchAccount(uid, true); }, [uid]);
    useEffect(() => { db.collection('admins').doc(ownerId).get().then(d => setIsAdminUser(!!d.exists)).catch(() => setIsAdminUser(false)); }, [ownerId]);
    const u = usersList.find(x => x.id === ownerId) || { id: ownerId };
    const ready = uid === ownerId && loaded.items;
    const urgentCount = items.filter(i => ['expired', 'veryold'].includes(itemStatus(i, typeOf(i)).level)).length;
    const counts = Object.fromEntries(TYPES.map(t => [t.id, items.filter(i => typeOf(i) === t.id).length]));
    const to = (tab) => go(`admin/dashboard/${ownerId}/${tab}`);
    const unread = useUnreadCount(ownerId);

    return (
        <div className="space-y-4">
            <Card className="p-3 flex flex-wrap items-center gap-3">
                <span className="text-sm font-semibold text-stone-500 flex items-center gap-1.5"><Icon name="Users" size={16} />Gebruiker</span>
                <div className="flex-1 min-w-[14rem]">
                    <Select value={ownerId || ''} onChange={e => go(`admin/dashboard/${e.target.value}/${sub}`)}>
                        {usersList.map(x => <option key={x.id} value={x.id}>{(x.email || x.displayName || x.id) + (x.id === user.uid ? ' (jij)' : '')}</option>)}
                    </Select>
                </div>
                {ownerId !== user.uid && <Button size="sm" variant="soft" icon="Swap" title="Open de app met de voorraad van deze gebruiker" onClick={() => { actions.switchAccount(ownerId); go('voorraad'); }}>Wissel</Button>}
            </Card>

            {/* Profiel van de gebruiker */}
            <Card className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                    <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <span className={cx('w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold', userTone(u.id, usersList).pill)}>{(u.email || u.displayName || '?')[0].toUpperCase()}</span>
                        <ColorPicker value={userToneKey(u.id, usersList)} colors={USER_TONE_DOTS} names={USER_TONE_NAMES} label="Kleur van deze gebruiker" onChange={k => actions.setUserField(u.id, { adminKleur: k })} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-bold text-lg truncate">{u.displayName || u.email || 'Gebruiker'}</p>
                        <p className="text-sm text-stone-500 truncate">{u.email}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[11px] font-bold">
                            {isAdminUser && <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-200">Admin</span>}
                            {u.disabled ? <span className="px-2 py-0.5 rounded bg-red-100 text-red-700">Geblokkeerd</span> : <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">Actief</span>}
                            {(u.hiddenTabs || []).length > 0 && <span className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300 inline-flex items-center gap-1"><Icon name="Lock" size={11} />Verborgen: {(u.hiddenTabs || []).map(t => (TAB_OPTIONS.find(o => o[0] === t) || [t, t])[1]).join(', ')}</span>}
                            {u.publicShareEnabled && <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">bekijk-link aan</span>}
                        </div>
                    </div>
                    <div className="w-full sm:w-auto text-xs text-stone-500 space-y-0.5 sm:text-right">
                        <p>Laatst gezien: <b className="text-stone-700 dark:text-stone-200">{u.laatstGezien ? formatDateTime(u.laatstGezien) : 'nooit'}</b></p>
                        <p className="font-mono break-all">{u.id}</p>
                    </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-2 mt-4">
                    {[...TYPES.map(t => [t.label, counts[t.id], 'voorraad']), ['Verlopen', urgentCount, 'eerst'], ['Locaties', vriezers.length, 'locaties'], ['Lades', lades.length, 'locaties'], ['Op lijstje', shopping.filter(x => !x.checked).length, 'lijst'], ['Recepten', recepten.length, 'recepten']]
                        .map(([lbl, n, tab]) => (
                            <button key={lbl} type="button" onClick={() => to(tab)} className="text-left rounded-xl bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-800 px-3 py-2">
                                <p className={cx('text-lg font-bold tabular-nums', lbl === 'Verlopen' && n ? 'text-red-600' : '')}>{ready ? n : '…'}</p>
                                <p className="text-xs text-stone-500">{lbl}</p>
                            </button>
                        ))}
                </div>
                <AdminNote uid={ownerId} />
                <HolidayMode u={u} />
                <button type="button" onClick={() => to('berichten')} className="mt-3 w-full h-11 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 text-sm font-semibold flex items-center justify-center gap-2">
                    <Icon name="Message" size={17} />Bericht sturen{unread > 0 && <span className="text-xs font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">{unread} ongelezen</span>}
                </button>
            </Card>

            <TabDropdown tabs={USER_TABS} value={sub} hrefFor={(id) => `#/admin/dashboard/${ownerId}/${id}`} />

            {ownerId !== user.uid && (
                <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-1.5 px-1"><Icon name="Info" size={15} />
                    Je beheert de gegevens van {u.email || 'deze gebruiker'}. Wat je hier aanpast, wordt in hun account opgeslagen.</p>
            )}

            {!ready ? <div className="h-40 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 animate-pulse" /> : (
                <div key={ownerId + sub}>
                    {sub === 'voorraad' && (
                        <div className="space-y-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <Segmented value={type} onChange={setType} className="max-w-xl flex-1" options={TYPES.map(t => ({ id: t.id, label: t.label, icon: t.icon, count: counts[t.id] }))} />
                                <Button icon="Plus" onClick={() => openForm({ type, nonce: Date.now() })}>Product</Button>
                            </div>
                            <Stock type={type} embedded />
                        </div>
                    )}
                    {sub === 'eerst' && <UrgentList />}
                    {sub === 'lijst' && <Shopping />}
                    {sub === 'week' && <Week />}
                    {sub === 'recepten' && <Recipes />}
                    {sub === 'locaties' && <div className="max-w-3xl"><Locaties /></div>}
                    {sub === 'categorieen' && <div className="max-w-3xl"><Categorieen /></div>}
                    {sub === 'eenheden' && <div className="max-w-3xl"><Eenheden /></div>}
                    {sub === 'stats' && <Statistieken />}
                    {sub === 'log' && <Logboek />}
                    {sub === 'opkuisen' && <Cleanup />}
                    {sub === 'berichten' && <UserMessages uid={ownerId} />}
                    {sub === 'etiketten' && <LabelPicker />}
                    {sub === 'kopieer' && <CopyLocation />}
                    {sub === 'rechten' && <Card className="px-4 pb-4 max-w-2xl"><UserRights u={u} /></Card>}
                    {sub === 'delen' && <SharesAndExport u={u} />}
                </div>
            )}
        </div>
    );
}

function SharesAndExport({ u }) {
    const { items, locById, ladeById, ownerId, actions } = useStore();
    const { confirm } = useUi();
    const [out, setOut] = useState(null);
    const [inc, setInc] = useState(null);
    useEffect(() => {
        const a = db.collection('shares').where('ownerId', '==', u.id).onSnapshot(s => setOut(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setOut('error'));
        const b = u.email ? db.collection('shares').where('sharedWithEmail', '==', u.email.toLowerCase()).onSnapshot(s => setInc(s.docs.map(d => ({ id: d.id, ...d.data() }))), () => setInc('error')) : () => { };
        if (!u.email) setInc([]);
        return () => { a(); b(); };
    }, [u.id, u.email]);
    const status = (st) => st === 'accepted' ? ['Heeft toegang', 'text-emerald-600'] : st === 'declined' ? ['Geweigerd', 'text-red-500'] : ['Wacht op antwoord', 'text-amber-600'];
    const revoke = async (sh) => { if (await confirm({ title: 'Toegang intrekken?', message: `${sh.ownerEmail} → ${sh.sharedWithEmail}`, confirmLabel: 'Intrekken', danger: true })) actions.revokeShare(sh); };
    const List = ({ data, empty, render }) => data === null ? <p className="p-4 text-sm text-stone-400">Laden…</p>
        : data === 'error' ? <p className="p-4 text-sm text-stone-500">Kon niet geladen worden (geen leesrechten).</p>
            : data.length === 0 ? <p className="p-4 text-sm text-stone-500">{empty}</p>
                : data.map(sh => (
                    <div key={sh.id} className="flex items-center gap-3 pl-4 pr-1.5 py-2">
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{render(sh)}</p><p className={cx('text-xs font-semibold', status(sh.status)[1])}>{status(sh.status)[0]}</p></div>
                        <IconButton icon="Trash" label="Intrekken" className="text-red-500" onClick={() => revoke(sh)} />
                    </div>
                ));
    return (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
            <section>
                <SectionTitle>Deelt eigen voorraad met</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800"><List data={out} empty="Deelt met niemand." render={sh => sh.sharedWithEmail} /></Card>
                <SectionTitle className="mt-6">Heeft toegang tot voorraad van</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800"><List data={inc} empty="Geen gedeelde voorraden." render={sh => sh.ownerEmail} /></Card>
                <SectionTitle className="mt-6">Bekijk-link</SectionTitle>
                <Card className="px-4 py-1">
                    <Toggle checked={!!u.publicShareEnabled} onChange={c => actions.setUserField(u.id, { publicShareEnabled: c })} label="Bekijk-link actief" description={u.publicShareToken ? `Token: ${u.publicShareToken}` : 'Nog geen link aangemaakt'} />
                </Card>
            </section>
            <section>
                <SectionTitle>Gegevens exporteren</SectionTitle>
                <Card className="divide-y divide-stone-100 dark:divide-stone-800">
                    {[['Excel (CSV)', 'Alle producten van deze gebruiker', () => exportCSV(items, locById, ladeById)],
                    ['PDF', 'Overzicht om te printen', () => exportPDF(items, locById, ladeById)],
                    ['Volledige back-up', 'Alles als JSON-bestand', () => exportBackup(ownerId)]].map(([t, d, fn]) => (
                        <button key={t} type="button" onClick={async () => { try { await fn(); } catch (e) { actions.notify(e.message || 'Mislukt', 'error'); } }} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/60">
                            <span className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center"><Icon name="Download" size={18} /></span>
                            <span><span className="block font-medium">{t}</span><span className="block text-xs text-stone-500">{d}</span></span>
                        </button>
                    ))}
                </Card>
            </section>
        </div>
    );
}

// ---------------- Verlopen over alle gebruikers ----------------
function AllExpired() {
    const { usersList } = useStore();
    const { go } = useUi();
    const stats = useUserStats(usersList);
    const [onlyExpired, setOnlyExpired] = useState(false);
    const done = Object.keys(stats).length >= usersList.length;
    const rows = usersList.map(u => ({ u, list: ((stats[u.id] || {}).urgent || []).filter(x => !onlyExpired || x.st.level !== 'soon') }))
        .filter(r => r.list.length).sort((a, b) => b.list.length - a.list.length);
    const total = rows.reduce((a, r) => a + r.list.length, 0);
    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-stone-500 flex-1">{done ? `${total} producten bij ${rows.length} gebruikers` : 'Gegevens van alle gebruikers laden…'}</p>
                <button type="button" onClick={() => setOnlyExpired(false)} className={cx('h-9 px-3 rounded-xl text-sm font-semibold', !onlyExpired ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800')}>Verlopen + binnen 3 dagen</button>
                <button type="button" onClick={() => setOnlyExpired(true)} className={cx('h-9 px-3 rounded-xl text-sm font-semibold', onlyExpired ? 'bg-stone-900 text-white dark:bg-white dark:text-stone-900' : 'bg-white border border-stone-200 dark:bg-stone-900 dark:border-stone-800')}>Enkel verlopen</button>
            </div>
            {done && rows.length === 0 && <Card className="p-5 text-sm text-stone-500 flex items-center gap-2"><Icon name="Check" size={18} className="text-emerald-600" />Bij niemand is iets verlopen.</Card>}
            <div className="grid gap-4 items-start md:grid-cols-2 xl:grid-cols-3">
                {rows.map(({ u, list }) => (
                    <Card key={u.id} className="overflow-hidden">
                        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
                            <p className="font-semibold truncate flex-1">{u.email || u.displayName}</p>
                            <span className="text-xs font-bold text-red-600 tabular-nums">{list.length}</span>
                            <Button size="sm" variant="soft" onClick={() => go(`admin/dashboard/${u.id}/eerst`)}>Openen</Button>
                        </div>
                        <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                            {list.slice(0, 12).map(({ item, st, loc }) => (
                                <li key={item.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                                    <span className="text-xl w-7 text-center">{emojiFor(item)}</span>
                                    <span className="flex-1 min-w-0"><span className="block font-medium truncate">{item.naam}</span><span className="block text-xs text-stone-500 truncate">{formatAantal(item.aantal)} {item.eenheid} · {loc}</span></span>
                                    <span className={cx('text-xs font-semibold text-right', STATUS_TONE[st.level])}>{statusText(st)}</span>
                                </li>
                            ))}
                            {list.length > 12 && <li className="px-4 py-2 text-xs text-stone-500">en nog {list.length - 12}…</li>}
                        </ul>
                    </Card>
                ))}
            </div>
        </div>
    );
}
