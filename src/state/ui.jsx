import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Globale UI-staat: welke sheets/dialogen open zijn, en de (hash-)route.
const UiCtx = createContext(null);
export const useUi = () => useContext(UiCtx);

const parseHash = () => {
    const h = (window.location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/').filter(Boolean);
    return { page: parts[0] || 'overzicht', sub: parts[1] || null, extra: parts[2] || null };
};

export function UiProvider({ children }) {
    const [route, setRoute] = useState(parseHash);
    useEffect(() => {
        const onHash = () => { setRoute(parseHash()); window.scrollTo(0, 0); };
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);
    const go = useCallback((path) => {
        const target = '#/' + path.replace(/^#?\/?/, '');
        if (window.location.hash !== target) window.location.hash = target;
    }, []);

    const [itemId, setItemId] = useState(null);
    const [form, setForm] = useState(null);
    const [removeFor, setRemoveFor] = useState(null);
    const [moveIds, setMoveIds] = useState(null);
    const [plan, setPlan] = useState(null);
    const [auditLadeId, setAuditLadeId] = useState(null);
    const [confirmState, setConfirmState] = useState(null);
    const [promptState, setPromptState] = useState(null);
    const [showTour, setShowTour] = useState(false);
    const [showNews, setShowNews] = useState(false);

    const confirm = useCallback((opts) => new Promise(resolve => setConfirmState({ ...opts, resolve })), []);
    const prompt = useCallback((opts) => new Promise(resolve => setPromptState({ ...opts, resolve })), []);

    const value = {
        route, go,
        itemId, openItem: setItemId, closeItem: () => setItemId(null),
        form, openForm: setForm, closeForm: () => setForm(null),
        removeFor, openRemove: setRemoveFor, closeRemove: () => setRemoveFor(null),
        moveIds, openMove: setMoveIds, closeMove: () => setMoveIds(null),
        plan, openPlan: setPlan, closePlan: () => setPlan(null),
        auditLadeId, openAudit: setAuditLadeId, closeAudit: () => setAuditLadeId(null),
        confirmState, setConfirmState, confirm,
        promptState, setPromptState, prompt,
        showTour, setShowTour, showNews, setShowNews
    };
    return <UiCtx.Provider value={value}>{children}</UiCtx.Provider>;
}
