# ⛳ Club 36 – Gamified Golf Progression & Training Calendar (PWA)

Moderni, mobiili-edellä suunniteltu **Operation 36** -kehitysmalliin pohjautuva seurajunioreiden ja aloittelijoiden golfpalvelu (React + TypeScript + Vite + Material UI CSS Variables + `react-i18next` + Firebase/GCP).

---

## keskeiset ominaisuudet / Key Features

1. **Operation 36 -kenttäpolku (Tasot 1–8):**
   - Pelaajat aloittavat 25 metristä reiästä tavoitteenaan pelata 9 reikää **≤ 36 lyönnillä** (keskiarvo 4 lyöntiä / reikä).
   - Kun 36 lyöntiä alittuu, seuraava kenttätaso aukeaa: **25m → 50m → 100m → 150m → 200m → Oranssi tii → Punainen tii → Keltainen tii**.
2. **Täysi lokalisointiarkkitehtuuri (`i18next` + `react-i18next` + MUI Locale):**
   - Oletuskielenä suomi (`fi`), mukana täydellinen englanninkielinen käännös (`en`) tiedostoissa [`src/i18n/locales/fi.json`](./src/i18n/locales/fi.json) ja [`src/i18n/locales/en.json`](./src/i18n/locales/en.json).
   - Uuden kielen (esim. `sv`) lisääminen vaatii vain JSON-tiedoston ja yhden rivin [`SUPPORTED_LANGUAGES`](./src/i18n/config.ts)-listaan.
3. **Viimeisin Material UI (`@mui/material@latest`) & CSS Variables -teema:**
   - Rakennettu natiivilla `cssVariables` + `colorSchemes: { dark, light }` -arkkitehtuurilla ([`src/theme/theme.ts`](./src/theme/theme.ts)) ja uudella Grid v2 (`size={{ xs: 12, md: 6 }}`) -komponentilla.
   - Sisältää tumman teeman lisäksi korkeakontrastisen päivätilan kentän auringonvaloon.
4. **3-portainen roolihierarkia + TV-tulostaulu & Demo-työkalupalkki:**
   - **Junior Player (`/dashboard`, `/play`, `/calendar`):** Oma tasokortti (ennätys nykyiseltä etäisyydeltä ja matka seuraavaan tiihin), 1-painalluksen RSVP treeneihin ja interaktiivinen 9 reiän tuloskortti live-vauhtimittarilla.
   - **Coach (`/coach`):** Kentän laidalle optimoitu 1-painalluksen läsnäolokuittaus (+50 XP) ja 9 reiän tuloskorttien vahvistus.
   - **Admin (`/admin`):** Harjoitusryhmien, värikoodien, roolien ja kausikalenterin hallinta (**"Monista viikoittain / Repeat Weekly"** -pikaluonnilla).
   - **Public TV Display (`/leaderboard` & `/leaderboard-tv`):** 16:9 klubitalon/talvihallin TV-näkymä kuukauden XP/treenikärjestä ja *36 Club Wall of Fame* -suorituksista.
5. **Hybrid Data Layer & Firebase/GCP CI/CD:**
   - Jos `.env`-tiedostossa on `VITE_FIREBASE_API_KEY`, sovellus kytkeytyy suoraan **Firebase Authiin ja Cloud Firestoreen**.
   - Ilman ympäristömuuttujia sovellus toimii saumattomasti paikallisessa `LocalStorage` + esitäytetyn demoadatan ([`src/data/seedData.ts`](./src/data/seedData.ts)) tilassa.

---

## Käynnistys / Getting Started

```bash
npm install
npm run dev
```

Tuotantopaketin tarkistus ja käännös:

```bash
npm run typecheck
npm run build
```
