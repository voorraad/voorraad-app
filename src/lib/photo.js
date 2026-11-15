// Foto verkleinen tot een JPEG data-URL (klein genoeg om in Firestore te bewaren).
export function resizeImage(file, max = 360, quality = 0.72) {
    return new Promise((resolve, reject) => {
        if (!file || !/^image\//.test(file.type || 'image/')) return reject(new Error('Geen afbeelding'));
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.max(1, Math.round(img.naturalWidth * s)), h = Math.max(1, Math.round(img.naturalHeight * s));
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
            ctx.drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kon de foto niet lezen')); };
        img.src = url;
    });
}
