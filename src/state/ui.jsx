import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Globale UI-staat: welke sheets/dialogen open zijn, en de (hash-)route.
const UiCtx = createContext(null);
export const useUi = () => useContext(UiCtx);

const parseHash = () => {
    const h = (window.location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { page: parts[0] || 'voorraad', sub: parts[1] || null, extra: parts[2] || null, extra2: parts[3] || null };
};

export function UiProvider({ children }) {
    const [route, setRoute] = useState(parseHash);
    useEffect(() => {
        const onHash = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    // Tik op een pushmelding terwijl de app al open is: de service worker vraagt om te navigeren.
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        const onMsg = (e) => {
            if (!e.data || e.data.type !== 'navigeer') return;
            try { const h = new URL(e.data.url).hash; window.location.hash = h || '#/'; } catch (err) { }
        };
        navigator.serviceWorker.addEventListener('message', onMsg);
        return () => navigator.serviceWorker.removeEventListener('message', onMsg);
    }, []);
    const go = useCallback((path) => {
        const target = '#/' + path.replace(/^#?\/?/, '');
        if (window.location.hash !== target) window.location.hash = target;
    }, []);

    const [itemId, setItemId] = useState(null);
    const [form, setForm] = useState(null);
    const [removeFor, setRemoveFor] = useState(null);
    const [consumeFor, setConsumeFor] = useState(null);
    const [moveIds, setMoveIds] = useState(null);
    const [plan, setPlan] = useState(null);
    const [auditLadeId, setAuditLadeId] = useState(null);
    const [confirmState, setConfirmState] = useState(null);
    const [promptState, setPromptState] = useState(null);
    const [showTour, setShowTour] = useState(false);
    const [showNews, setShowNews] = useState(false);
    const [scan, setScan] = useState(null);         // { onCode? } – barcode-scanner
    const [labelIds, setLabelIds] = useState(null); // etiketten afdrukken
    const [photo, setPhoto] = useState(null);       // foto groot bekijken
    const [urgentOpen, setUrgentOpen] = useState(null); // 'Eerst opmaken'-lijst: true of de groep (now|soon|week)

    const confirm = useCallback((opts) => new Promise(resolve => setConfirmState({ ...opts, resolve })), []);
    const prompt = useCallback((opts) => new Promise(resolve => setPromptState({ ...opts, resolve })), []);

    const value = {
        route, go,
        itemId, openItem: setItemId, closeItem: () => setItemId(null),
        form, openForm: setForm, closeForm: () => setForm(null),
        removeFor, openRemove: setRemoveFor, closeRemove: () => setRemoveFor(null),
        consumeFor, openConsume: setConsumeFor, closeConsume: () => setConsumeFor(null),
        moveIds, openMove: setMoveIds, closeMove: () => setMoveIds(null),
        plan, openPlan: setPlan, closePlan: () => setPlan(null),
        auditLadeId, openAudit: setAuditLadeId, closeAudit: () => setAuditLadeId(null),
        confirmState, setConfirmState, confirm,
        promptState, setPromptState, prompt,
        showTour, setShowTour, showNews, setShowNews,
        scan, openScan: (o) => setScan(o || {}), closeScan: () => setScan(null),
        labelIds, openLabels: setLabelIds, closeLabels: () => setLabelIds(null),
        photo, openPhoto: setPhoto, closePhoto: () => setPhoto(null),
        urgentOpen, openUrgent: (g) => setUrgentOpen(g || true), closeUrgent: () => setUrgentOpen(null)
    };
    return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>;
}
