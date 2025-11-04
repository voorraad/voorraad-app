// ---
// STAP 1: FIREBASE INITIALISATIE & AUTH
// ---
console.log("auth.js geladen");

// Gebruik de ingebouwde configuratievariabelen van de Canvas-omgeving
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : {
  apiKey: "AIzaSyB9KRUbVBknnDDkkWF2Z5nRskmY-9CkD24",
  authDomain: "vriezer-app.firebaseapp.com",
  projectId: "vriezer-app",
  storageBucket: "vriezer-app.firebasestorage.app",
  messagingSenderId: "788492326775",
  appId: "1:788492326775:web:c2cd85deac708b44f27372"
      }; // Fallback

// Initialiseer Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const authStatus = document.getElementById('auth-status');
// NIEUW: Snelkoppeling naar de Google login knop
const googleLoginBtn = document.getElementById('google-login-btn');

// ---
// STAP 2: GOOGLE LOGIN KNOP EVENT
// ---

googleLoginBtn.addEventListener('click', () => {
    // Maak een nieuwe Google Auth provider instance
    const provider = new firebase.auth.GoogleAuthProvider();
    
    authStatus.textContent = 'Bezig met Google login...';

    // Start de login procedure (met een pop-up)
    auth.signInWithPopup(provider)
        .then((result) => {
            // Dit triggert de onAuthStateChanged listener, die de gebruiker zal doorsturen.
            console.log("Google login succesvol", result.user);
            authStatus.textContent = 'Inloggen gelukt, bezig met doorsturen...';
        })
        .catch((error) => {
            // Handel fouten hier af
            console.error("Fout bij Google login:", error);
            authStatus.textContent = `Fout bij inloggen: ${error.message}`;
        });
});

// ---
// STAP 3: AUTHENTICATIE STATUS BIJHOUDEN (AANGEPAST)
// ---

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Gebruiker is ingelogd
        console.log("Gebruiker ingelogd, doorsturen naar app.html...");
        authStatus.textContent = "Succesvol aangemeld. Bezig met doorsturen...";
        // Gebruik replace() zodat de 'terug'-knop niet teruggaat naar deze inlogpagina
        window.location.replace('app.html');

    } else {
        // Gebruiker is niet ingelogd
        console.log("Gebruiker niet ingelogd.");

        // Check eerst voor de speciale Canvas token
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            console.log("Bezig met inloggen via custom token...");
            authStatus.textContent = 'Bezig met aanmelden...';
            try {
                await auth.signInWithCustomToken(__initial_auth_token);
                // De onAuthStateChanged-listener zal opnieuw afgaan en de gebruiker doorsturen
            } catch (error) {
                // Token login mislukt. Toon Google login als fallback.
                console.error("Fout bij custom token login:", error);
                authStatus.textContent = "Automatisch aanmelden mislukt. Log in met Google.";
                googleLoginBtn.style.display = 'block'; // Toon knop
            }
        } else {
            // Geen custom token.
            // Verwijder de anonieme login en toon de Google knop.
            console.log("Geen custom token, toon Google login knop.");
            authStatus.textContent = 'Log in met je Google account om door te gaan.';
            googleLoginBtn.style.display = 'block'; // Toon knop
        }
    }
});