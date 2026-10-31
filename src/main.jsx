import React from 'react';
import { createRoot } from 'react-dom/client';
import { StoreProvider } from './state/store.jsx';
import { UiProvider } from './state/ui.jsx';
import App from './App.jsx';
import PublicView from './PublicView.jsx';

const root = createRoot(document.getElementById('root'));
const token = new URLSearchParams(window.location.search).get('deel');

root.render(token
    ? <PublicView token={token} />
    : <StoreProvider><UiProvider><App /></UiProvider></StoreProvider>);

// Service worker: app werkt offline en laadt sneller.
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(e => console.warn('SW-registratie mislukt', e)));
}
