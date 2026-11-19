import React, { useMemo, useState, useEffect } from 'react';
import Icon from '../lib/icons.jsx';
import { useStore } from '../state/store.jsx';
import { useUi } from '../state/ui.jsx';
import { Card, Button, Segmented, Chip, Sheet, EmptyState, IconButton } from '../components/ui.jsx';
import { ItemRow } from '../components/items.jsx';
import { PhotoInput } from '../components/media.jsx';
import { UrgentBanner, PendingInvites } from '../components/Urgent.jsx';
import { TYPES, TYPE_BY_ID, LOC_DOT } from '../lib/constants.js';
import { cx, smartMatch, sortLocaties, byName, itemStatus, URGENCY, daysUntil, daysSince, toDate, formatDate, categoriesFor, guessProduct, addDays, emojiForCategory, emojiFor } from '../lib/utils.js';

const GROUP_KEY = 'voorraad_groep';

export default function Stock({ type: typeProp, embedded } = {}) {
    const store = useStore();
    const { vriezers, lades, items, me, owner, typeOf, canSee, actions, dataLoaded, opVakantie } = store;
    const { route, go, openForm, openMove, openAudit, prompt, confirm, openScan, openLabels, openPhoto } = useUi();
    const visibleTypes = TYPES.filter(t => t.id === 'vriezer' || canSee(t.id));
    const canSelect = ['recepten', 'etiketten', 'bewerken', 'verwijderen'].some(canSee);
    const wanted = typeProp || route.sub;
    const type = visibleTypes.some(t => t.id === wanted) ? wanted : 'vriezer';

    const [group, setGroup] = useState(() => localStorage.getItem(GROUP_KEY) || 'Thuis');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [catFilter, setCatFilter] = useState(null);
    const [view, setView] = useState(() => localStorage.getItem('voorraad_weergave') || 'lades');
    const [showFilter, setShowFilter] = useState(false);
    const [selecting, setSelecting] = useState(false);
    const [selected, setSelected] = useState(new Set());
    const [quick, setQuick] = useState('');

    useEffect(() => { setCatFilter(null); setSelecting(false); setSelected(new Set()); }, [type]);
    useEffect(() => { localStorage.setItem(GROUP_KEY, group); }, [group]);
    useEffect(() => { localStorage.setItem('voorraad_weergave', view); }, [view]);

    const groups = useMemo(() => [...new Set(['Thuis', ...vriezers.map(v => v.locatieGroep || 'Thuis')])], [vriezers]);
    useEffect(() => { if (!groups.includes(group)) setGroup('Thuis'); }, [groups.join('|')]);

    const locs = useMemo(() => sortLocaties(vriezers.filter(v => v.type === type && (v.locatieGroep || 'Thuis') === group
        // de automatische "Ongesorteerd"-locatie (van snelle invoer) enkel tonen als er iets in zit
        && !((v.naam || '').toLowerCase() === 'ongesorteerd' && !items.some(i => i.vriezerId === v.id)))), [vriezers, items, type, group]);
    const locIds = new Set(locs.map(l => l.id));
    const typeItems = items.filter(i => locIds.has(i.vriezerId));
    const filtering = !!search.trim() || !!catFilter;
    const shown = typeItems.filter(i => smartMatch(i.naam, search) && (!catFilter || i.categorie === catFilter));
    const cats = categoriesFor(owner.customCategories, type);

    const sorter = (a, b) => {
        if (sortBy === 'expiry') {
            const sa = itemStatus(a, type), sb = itemStatus(b, type);
            if (URGENCY[sa.level] !== URGENCY[sb.level]) return URGENCY[sa.level] - URGENCY[sb.level];
            const da = daysUntil(a.houdbaarheidsDatum) ?? 99999, db_ = daysUntil(b.houdbaarheidsDatum) ?? 99999;
            if (da !== db_) return da - db_;
            return daysSince(b.ingevrorenOp) - daysSince(a.ingevrorenOp);
        }
        if (sortBy === 'newest') return (toDate(b.ingevrorenOp) || 0) - (toDate(a.ingevrorenOp) || 0);
        return byName(a, b);
    };

    const openSet = new Set(me.openLades || []);
    const isOpen = (id) => filtering || openSet.has(id);
    const toggleLade = (id) => {
        const next = new Set(openSet);
        next.has(id) ? next.delete(id) : next.add(id);
        actions.setMine({ openLades: [...next] });
    };
    const typeLadeIds = lades.filter(l => locIds.has(l.vriezerId)).map(l => l.id);
    const allOpen = typeLadeIds.length > 0 && typeLadeIds.every(id => openSet.has(id));
    const toggleAll = () => {
        const next = new Set(openSet);
        typeLadeIds.forEach(id => (allOpen ? next.delete(id) : next.add(id)));
        actions.setMine({ openLades: [...next] });
    };

    const toggleSel = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

    // Snelle invoer: product in "Ongesorteerd" van deze groep zetten
    const quickAdd = async (e) => {
        e.preventDefault();
        const naam = quick.trim();
        if (!naam) return;
        setQuick('');
        try {
            let loc = vriezers.find(v => v.type === type && (v.locatieGroep || 'Thuis') === group && v.naam.toLowerCase() === 'ongesorteerd');
            const locId = loc ? loc.id : await actions.addLocatie({ naam: 'Ongesorteerd', type, color: 'gray', locatieGroep: group });
            const g = guessProduct(naam);
            await actions.saveItem({
                _locNaam: 'Ongesorteerd', naam, aantal: 1, eenheid: 'stuks', vriezerId: locId, ladeId: '', categorie: g ? g.cat : 'Ander',
                emoji: g ? g.emoji : '', ingevrorenOp: new Date(),
                houdbaarheidsDatum: g && g.days && type !== 'vriezer' ? addDays(new Date(), g.days) : null
            });
        } catch (err) { actions.notify('Toevoegen mislukt', 'error'); }
    };

    const addGroup = async () => {
        const naam = await prompt({ title: 'Nieuwe plaats', message: 'Bv. een tweede verblijf of de garage. Je kan er daarna eigen vriezers en kasten aan toevoegen.', placeholder: 'Vakantiehuis' });
        if (!naam) return;
        const locNaam = await prompt({ title: `Eerste ${TYPE_BY_ID[type].label.toLowerCase()} in ${naam}`, placeholder: TYPE_BY_ID[type].label, value: TYPE_BY_ID[type].label });
        if (!locNaam) return;
        await actions.addLocatie({ naam: locNaam, type, locatieGroep: naam });
        setGroup(naam);
    };
    const addLocatie = async () => {
        const naam = await prompt({ title: `Nieuwe ${TYPE_BY_ID[type].label.toLowerCase()}`, placeholder: type === 'voorraad' ? 'Bv. Voorraadkast' : type === 'frig' ? 'Bv. Frigo keuken' : 'Bv. Diepvries garage' });
        if (naam) await actions.addLocatie({ naam, type, locatieGroep: group });
    };

    const bulkDelete = async () => {
        if (!(await confirm({ title: `${selected.size} producten verwijderen?`, message: 'Dit telt niet mee in je statistieken.', confirmLabel: 'Verwijderen', danger: true }))) return;
        await actions.deleteItems([...selected]);
        setSelected(new Set()); setSelecting(false);
    };
    const findRecipe = () => {
        const names = items.filter(i => selected.has(i.id)).map(i => i.naam);
        window.open('https://www.google.com/search?q=' + encodeURIComponent('recept met ' + names.join(' en ')), '_blank', 'noopener');
    };

    const typeCounts = Object.fromEntries(visibleTypes.map(t => [t.id, items.filter(i => typeOf(i) === t.id).length]));

    return (
        <div className="space-y-4">
            {!embedded && <PendingInvites />}
            {opVakantie
                ? <div className="rounded-2xl border border-sky-200 bg-sky-50 dark:bg-sky-950/40 dark:border-sky-900 px-4 py-2.5 text-sm text-sky-900 dark:text-sky-100 flex items-center gap-2"><Icon name="Sun" size={16} />Vakantiemodus tot {formatDate(me.vakantieTot)}: geen waarschuwingen.</div>
                : <UrgentBanner />}

            {(groups.length > 1) && (
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
                    {groups.map(g => <Chip key={g} active={g === group} onClick={() => setGroup(g)}><Icon name="Home" size={14} />{g}</Chip>)}
                    <Chip onClick={addGroup} className="border-dashed"><Icon name="Plus" size={14} />Plaats</Chip>
                </div>
            )}

            {/* Zoeken & acties */}
            <div className="flex gap-2 items-center print:hidden">
                <div className="relative flex-1 min-w-0">
                    <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={`Zoek in ${TYPE_BY_ID[type].label.toLowerCase()}…`}
                        className="w-full h-11 pl-10 pr-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 text-[15px]" />
                </div>
                {canSee('scan') && <IconButton icon="Scan" label="Barcode scannen" onClick={() => openScan({ type })} variant="outline" className="rounded-xl w-11 h-11" />}
                <IconButton icon="Filter" label="Sorteren & filteren" onClick={() => setShowFilter(true)} variant="outline" className={cx('rounded-xl w-11 h-11 relative', (catFilter || sortBy !== 'name') && 'border-teal-500 text-teal-700 dark:text-teal-300')} />
                {canSelect && <IconButton icon="CheckSquare" label="Selecteren" onClick={() => { setSelecting(s => !s); setSelected(new Set()); }} variant="outline" className={cx('rounded-xl w-11 h-11', selecting && 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700')} />}
            </div>

            {catFilter && (
                <div className="flex items-center gap-2 text-sm">
                    <span className="text-stone-500">Categorie:</span>
                    <Chip active onClick={() => setCatFilter(null)}>{catFilter}<Icon name="X" size={14} /></Chip>
                </div>
            )}

            {locs.length > 0 && !selecting && canSee('snel') && canSee('toevoegen') && (
                <form onSubmit={quickAdd} className="flex items-center gap-2 h-11 pl-3 pr-1.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 print:hidden">
                    <Icon name="Zap" size={16} className="text-amber-500 flex-shrink-0" />
                    <input value={quick} onChange={e => setQuick(e.target.value)} placeholder="Snel toevoegen: typ en druk Enter" className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder-amber-700/50 dark:placeholder-amber-300/40" enterKeyHint="done" />
                    {quick && <Button size="sm" type="submit" variant="soft">Voeg toe</Button>}
                </form>
            )}

            {!dataLoaded ? <LoadingList /> : locs.length === 0 ? (
                <Card><EmptyState icon={TYPE_BY_ID[type].icon} title={`Nog geen ${TYPE_BY_ID[type].label.toLowerCase()}${group !== 'Thuis' ? ' in ' + group : ''}`}
                    text="Maak eerst een locatie aan, of voeg meteen een product toe."
                    action={<div className="flex gap-2">{canSee('locaties') && <Button variant="secondary" onClick={addLocatie} icon="Plus">Locatie</Button>}{canSee('toevoegen') && <Button onClick={() => openForm({ type, nonce: Date.now() })} icon="Plus">Product</Button>}</div>} /></Card>
            ) : filtering && shown.length === 0 ? (
                <Card><EmptyState icon="Search" title={search ? `Geen "${search}" gevonden` : 'Niets in deze categorie'}
                    text={search ? 'Je hebt dit niet (meer) in huis.' : null}
                    action={search ? <Button icon="Cart" onClick={async () => { await actions.addShopping({ naam: search, aantal: 1 }); actions.notify(`"${search}" op je lijstje gezet`); setSearch(''); }}>Zet op boodschappenlijst</Button> : null} /></Card>
            ) : (<>
                <div className="flex items-center gap-3 text-sm px-1 -mb-1 print:hidden">
                    <span className="text-stone-500 flex-1 truncate">{filtering ? `${shown.length} gevonden` : `${typeItems.length} producten`}</span>
                    {view === 'lades' && typeLadeIds.length > 0 && !filtering && <button type="button" onClick={toggleAll} className="font-semibold text-teal-700 dark:text-teal-300 hidden sm:inline">{allOpen ? 'Alles dichtklappen' : 'Alles openklappen'}</button>}
                    <Segmented size="sm" value={view} onChange={setView} className="w-56 flex-shrink-0" options={[{ id: 'lades', label: 'Lades', icon: 'Layers' }, { id: 'datum', label: 'Datum', icon: 'Calendar' }, { id: 'kaart', label: 'Kaart', icon: 'Dashboard' }]} />
                </div>
                {view === 'kaart' ? (
                    <FreezerMap locs={locs} lades={lades} items={shown} type={type} filtering={filtering}
                        onOpen={(ladeId) => { setView('lades'); if (ladeId && !openSet.has(ladeId)) toggleLade(ladeId); setTimeout(() => { const el = document.getElementById('lade-' + (ladeId || '')); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 150); }} />
                ) : view === 'datum' ? (
                <Card className="overflow-hidden">
                    <ul className="divide-y divide-stone-100 dark:divide-stone-800/80">
                        {[...shown].sort((a, b) => { const sa = itemStatus(a, type), sb = itemStatus(b, type); return URGENCY[sa.level] - URGENCY[sb.level] || (daysUntil(a.houdbaarheidsDatum) ?? 99999) - (daysUntil(b.houdbaarheidsDatum) ?? 99999) || daysSince(b.ingevrorenOp) - daysSince(a.ingevrorenOp); })
                            .map(i => <ItemRow key={i.id} item={i} type={type} showWhere selectable={selecting} selected={selected.has(i.id)} onToggle={toggleSel} />)}
                    </ul>
                </Card>
            ) : (
                <>
                    {typeLadeIds.length > 0 && !filtering && <button type="button" onClick={toggleAll} className="sm:hidden -mt-1 px-1 text-sm font-semibold text-teal-700 dark:text-teal-300 print:hidden">{allOpen ? 'Alles dichtklappen' : 'Alles openklappen'}</button>}
                    <div className={cx('grid gap-4 items-start grid-cols-1', locs.length === 2 && 'md:grid-cols-2', locs.length >= 3 && 'md:grid-cols-2 xl:grid-cols-3')}>
                        {locs.map(loc => {
                            const locLades = lades.filter(l => l.vriezerId === loc.id).sort(byName);
                            const ladeIds = new Set(locLades.map(l => l.id));
                            const locItems = shown.filter(i => i.vriezerId === loc.id);
                            const loose = locItems.filter(i => !i.ladeId || !ladeIds.has(i.ladeId)).sort(sorter);
                            if (filtering && locItems.length === 0) return null;
                            return (
                                <section key={loc.id} className="space-y-2">
                                    <h2 className="flex items-center gap-2 px-1 font-bold text-stone-900 dark:text-white">
                                        <span className={cx('w-2.5 h-2.5 rounded-full', LOC_DOT[loc.color] || LOC_DOT.blue)} />{loc.naam}
                                        <span className="text-sm font-medium text-stone-400 tabular-nums">{typeItems.filter(i => i.vriezerId === loc.id).length}</span>
                                    </h2>
                                    <Card className="overflow-hidden divide-y divide-stone-100 dark:divide-stone-800">
                                        {locLades.map(lade => {
                                            const li = locItems.filter(i => i.ladeId === lade.id).sort(sorter);
                                            if (filtering && li.length === 0) return null;
                                            const open = isOpen(lade.id);
                                            const lastCheck = toDate(lade.laatstGecontroleerd), lastMod = toDate(lade.laatstGewijzigd);
                                            return (
                                                <div key={lade.id} id={'lade-' + lade.id} className="scroll-mt-20">
                                                    <div className="flex items-center">
                                                        <button type="button" onClick={() => toggleLade(lade.id)} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-2 px-3 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/50">
                                                            <Icon name={open ? 'ChevronDown' : 'ChevronRight'} size={18} className="text-stone-400 flex-shrink-0" />
                                                            <span className="font-semibold text-stone-800 dark:text-stone-100 truncate">{lade.naam}</span>
                                                            <span className="text-xs font-semibold text-stone-500 bg-stone-100 dark:bg-stone-800 rounded-full px-2 py-0.5 tabular-nums">{li.length}</span>
                                                            {(lastCheck || lastMod) && <span className={cx('hidden text-xs text-stone-400 ml-auto truncate', locs.length === 1 ? 'sm:inline' : locs.length === 2 ? 'lg:inline' : '2xl:inline')}>{lastCheck && (!lastMod || lastCheck >= lastMod) ? 'gecontroleerd ' + formatDate(lastCheck) : 'gewijzigd ' + formatDate(lastMod)}</span>}
                                                        </button>
                                                        {lade.foto && (
                                                            <button type="button" onClick={() => openPhoto({ src: lade.foto, title: lade.naam, onDelete: canSee('fotos') ? () => actions.setLadeFoto(lade, '') : null })} className="mr-1.5 flex-shrink-0" aria-label={`Foto van ${lade.naam}`}>
                                                                <img src={lade.foto} alt="" className="w-9 h-9 rounded-lg object-cover" />
                                                            </button>
                                                        )}
                                                        {canSee('fotos') && <PhotoInput max={720} onPhoto={f => actions.setLadeFoto(lade, f)} label={lade.foto ? `Andere foto voor ${lade.naam}` : `Foto toevoegen aan ${lade.naam}`}
                                                            className="mr-1.5 w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 flex-shrink-0 print:hidden">
                                                            <Icon name="Camera" size={16} />
                                                        </PhotoInput>}
                                                        {me.showBalans && canSee('balans') && (
                                                            <button type="button" onClick={() => openAudit(lade.id)} className="mr-2 h-8 px-2.5 rounded-lg text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 dark:text-teal-300 dark:bg-teal-950/50 flex items-center gap-1 print:hidden"><Icon name="CheckSquare" size={14} />Controle</button>
                                                        )}
                                                    </div>
                                                    {open && (li.length === 0
                                                        ? <p className="px-11 pb-3 text-sm text-stone-400 italic">Leeg</p>
                                                        : <ul className="divide-y divide-stone-100 dark:divide-stone-800/70 border-t border-stone-100 dark:border-stone-800/70">{li.map(i => <ItemRow key={i.id} item={i} type={type} selectable={selecting} selected={selected.has(i.id)} onToggle={toggleSel} />)}</ul>)}
                                                </div>
                                            );
                                        })}
                                        {loose.length > 0 && (
                                            <div>
                                                {locLades.length > 0 && <p className="px-4 pt-3 pb-1 text-xs font-semibold text-stone-400 uppercase tracking-wide">Zonder lade</p>}
                                                <ul className="divide-y divide-stone-100 dark:divide-stone-800/70">{loose.map(i => <ItemRow key={i.id} item={i} type={type} selectable={selecting} selected={selected.has(i.id)} onToggle={toggleSel} />)}</ul>
                                            </div>
                                        )}
                                        {locLades.length === 0 && loose.length === 0 && <p className="px-4 py-4 text-sm text-stone-400 italic">Nog leeg</p>}
                                    </Card>
                                </section>
                            );
                        })}
                    </div>
                    {!filtering && canSee('locaties') && <button type="button" onClick={addLocatie} className="w-full h-11 rounded-xl border-2 border-dashed border-stone-200 dark:border-stone-800 text-sm font-semibold text-stone-500 hover:text-teal-700 hover:border-teal-300 print:hidden">＋ {TYPE_BY_ID[type].label} toevoegen</button>}
                </>
                )}
            </>)}

            {selecting && (
                <div className="fixed left-0 right-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:bottom-0 z-40 p-3 bg-white/95 dark:bg-stone-900/95 backdrop-blur border-t border-stone-200 dark:border-stone-800 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] print:hidden anim-fade">
                    <div className="max-w-7xl mx-auto px-1 flex items-center gap-2">
                        <span className="text-sm font-semibold flex-1">{selected.size} geselecteerd</span>
                        {canSee('recepten') && <Button size="sm" variant="secondary" icon="Utensils" aria-label="Recept" disabled={!selected.size} onClick={findRecipe}><span className="hidden sm:inline">Recept</span></Button>}
                        {canSee('etiketten') && <Button size="sm" variant="secondary" icon="Printer" aria-label="Etiketten" disabled={!selected.size} onClick={() => openLabels([...selected])}><span className="hidden sm:inline">Etiketten</span></Button>}
                        {canSee('bewerken') && <Button size="sm" variant="secondary" icon="Move" aria-label="Verplaats" disabled={!selected.size} onClick={() => { openMove([...selected]); setSelecting(false); setSelected(new Set()); }}><span className="hidden sm:inline">Verplaats</span></Button>}
                        {canSee('verwijderen') && <Button size="sm" variant="danger-soft" icon="Trash" aria-label="Wis" disabled={!selected.size} onClick={bulkDelete}><span className="hidden sm:inline">Wis</span></Button>}
                        <IconButton icon="X" label="Stop selecteren" onClick={() => { setSelecting(false); setSelected(new Set()); }} />
                    </div>
                </div>
            )}

            <Sheet open={showFilter} onClose={() => setShowFilter(false)} title="Sorteren & filteren">
                <p className="text-xs font-semibold text-stone-500 mb-2">Sorteer op</p>
                <Segmented value={sortBy} onChange={setSortBy} options={[{ id: 'name', label: 'Naam' }, { id: 'expiry', label: 'Eerst op' }, { id: 'newest', label: 'Nieuwste' }]} />
                <p className="text-xs font-semibold text-stone-500 mt-5 mb-2">Categorie</p>
                <div className="flex flex-wrap gap-1.5">
                    <Chip active={!catFilter} onClick={() => setCatFilter(null)}>Alles</Chip>
                    {cats.map(c => {
                        const n = typeItems.filter(i => i.categorie === c.name).length;
                        return <Chip key={c.name} color={c.color} active={catFilter === c.name} onClick={() => setCatFilter(c.name)}>{c.name}{n > 0 && <span className="text-xs opacity-60">{n}</span>}</Chip>;
                    })}
                </div>
                <Button block className="mt-6" onClick={() => setShowFilter(false)}>Klaar</Button>
            </Sheet>
        </div>
    );
}

function LoadingList() {
    return (
        <div className="space-y-3" aria-label="Laden">
            {[0, 1, 2].map(i => <div key={i} className="h-16 rounded-2xl bg-stone-200/60 dark:bg-stone-800/60 animate-pulse" />)}
        </div>
    );
}

// ---------- Vriezerkaart: elke lade als vakje, met hoe vol ze is en of er iets dringend op moet ----------
const LEVEL_TONE = (lvl) => ['expired', 'veryold'].includes(lvl) ? { dot: 'bg-red-500', ring: 'ring-red-300 dark:ring-red-800', label: 'Moet op' }
    : ['soon', 'week'].includes(lvl) ? { dot: 'bg-amber-500', ring: 'ring-amber-300 dark:ring-amber-800', label: 'Binnenkort' }
        : { dot: 'bg-emerald-500', ring: 'ring-transparent', label: 'In orde' };

function FreezerMap({ locs, lades, items, type, filtering, onOpen }) {
    return (
        <div className={cx('grid gap-4 items-start grid-cols-1', locs.length === 2 && 'md:grid-cols-2', locs.length >= 3 && 'md:grid-cols-2 xl:grid-cols-3')}>
            {locs.map(loc => {
                const locLades = lades.filter(l => l.vriezerId === loc.id).sort(byName);
                const ids = new Set(locLades.map(l => l.id));
                const locItems = items.filter(i => i.vriezerId === loc.id);
                const cells = [...locLades.map(l => ({ id: l.id, naam: l.naam, foto: l.foto, list: locItems.filter(i => i.ladeId === l.id) })),
                    { id: '', naam: 'Zonder lade', list: locItems.filter(i => !i.ladeId || !ids.has(i.ladeId)) }].filter(c => c.id || c.list.length);
                if (filtering && !locItems.length) return null;
                const max = Math.max(1, ...cells.map(c => c.list.length));
                return (
                    <section key={loc.id} className="space-y-2">
                        <h2 className="flex items-center gap-2 px-1 font-bold text-stone-900 dark:text-white">
                            <span className={cx('w-2.5 h-2.5 rounded-full', LOC_DOT[loc.color] || LOC_DOT.blue)} />{loc.naam}
                            <span className="text-sm font-medium text-stone-400 tabular-nums">{locItems.length}</span>
                        </h2>
                        <div className="rounded-3xl border-[6px] border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-900 p-2 grid grid-cols-2 gap-2">
                            {cells.length === 0 && <p className="col-span-2 text-sm text-stone-400 italic p-3">Nog leeg</p>}
                            {cells.map(c => {
                                const worst = c.list.reduce((w, i) => { const l = itemStatus(i, type).level; return URGENCY[l] < URGENCY[w] ? l : w; }, 'ok');
                                const tone = LEVEL_TONE(worst);
                                const urgent = c.list.filter(i => ['expired', 'veryold', 'soon', 'week'].includes(itemStatus(i, type).level)).length;
                                return (
                                    <button key={c.id || 'los'} type="button" onClick={() => onOpen(c.id)}
                                        aria-label={`${c.naam}: ${c.list.length} producten${urgent ? ', ' + urgent + ' dringend' : ''}`}
                                        className={cx('relative text-left rounded-2xl bg-white dark:bg-stone-800 p-3 min-h-[6.5rem] flex flex-col overflow-hidden ring-2 hover:shadow-md transition', c.list.length ? tone.ring : 'ring-transparent', !c.id && 'border-2 border-dashed border-stone-200 dark:border-stone-700')}>
                                        {c.foto && <img src={c.foto} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />}
                                        <span className="relative flex items-center gap-1.5">
                                            <span className={cx('w-2 h-2 rounded-full flex-shrink-0', c.list.length ? tone.dot : 'bg-stone-300 dark:bg-stone-600')} />
                                            <span className="font-semibold text-sm truncate flex-1">{c.naam}</span>
                                            <span className="text-xs font-bold text-stone-500 tabular-nums">{c.list.length}</span>
                                        </span>
                                        <span className="relative text-lg leading-tight mt-1.5 truncate">{c.list.slice(0, 6).map(i => emojiFor(i)).join(' ') || <span className="text-xs text-stone-400 italic">Leeg</span>}</span>
                                        <span className="relative mt-auto pt-2">
                                            <span className="block h-1.5 rounded-full bg-stone-100 dark:bg-stone-700 overflow-hidden"><span className={cx('block h-full rounded-full', c.list.length ? tone.dot : '')} style={{ width: (c.list.length / max) * 100 + '%' }} /></span>
                                            {urgent > 0 && <span className={cx('block text-[11px] font-semibold mt-1', worst === 'expired' || worst === 'veryold' ? 'text-red-600' : 'text-amber-600')}>{urgent} dringend</span>}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}
