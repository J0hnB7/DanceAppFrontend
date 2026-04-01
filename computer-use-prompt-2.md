# DanceApp — Computer Use Testing Prompt (Part 2)

## Co uz bylo otestovano (PRESKOC)

- Login as admin (`admin@danceapp.local` / `Admin123!`) -- OK
- Competition Creation Wizard (Steps 1-3, template selection, submit) -- OK + bugy nalezeny a opraveny

---

## Setup

- **Backend** running on `http://localhost:8080`
- **Frontend** dev server on `http://localhost:3000`
- **Chrome** window **1440x900** (unless stated otherwise)
- Uz jsi prihlaseny jako admin -- pokud ne, prihlaz se na `/login` (`admin@danceapp.local` / `Admin123!`)

---

## Test Flows — postupne odshora dolu

### Flow A: Dashboard — hlavni stranky

1. Naviguj na `/dashboard`
2. **Souteze** — over ze se zobrazuje seznam soutezi s kartami. Klikni na jednu soutez a vrat se zpet.
3. **Analytika** — klikni v sidebaru. Over ze se stranka renderuje (grafy, statistiky, nebo prazdny stav).
4. **Archiv** — klikni v sidebaru. Over ze se zobrazuje archiv soutezi nebo prazdny stav.
5. Screenshot kazde stranky.
6. **Verify**: Zadna stranka nevraci bily/prazdny obsah, zadne JS errory v konzoli.

### Flow B: Dashboard — Sprava

1. **Sablony** — klikni v sidebaru na "Sablony". Over ze se zobrazuje seznam sablon (min. 3-4 prednastavene). Klikni na jednu sablonu — over detail/editaci.
2. **Organizatori** — klikni v sidebaru. Over seznam organizatoru (muze byt prazdny). Zkus tlacitko "Pozvat" pokud existuje.
3. **Nastaveni** (dashboard-level) — klikni na Nastaveni v dolni casti sidebaru. Over ze se renderuji taby (Profil, Bezpecnost, atd.). Zkontroluj 2FA toggle. Zkontroluj GDPR export tlacitko.
4. Screenshot kazde stranky.
5. **Verify**: Vsechny taby funguji, tlacitka jsou klikatelna, zadne mrtve linky.

### Flow C: Competition Detail — Prehled & Kategorie

1. Z dashboardu otevri existujici soutez (tu s 10 kategoriemi a 350 pary).
2. **Prehled** — over ze se zobrazuje souhrn souteze (nazev, datum, misto, pocet kategorii, paru). Over editovatelnost poli pokud je formular.
3. **Kategorie** — klikni na "Kategorie" (badge 10). Over ze se zobrazuje seznam vsech 10 sekci. Klikni na jednu sekci — over detail (nazev, tanecni styl, vekova kategorie, level, pocet rozhodcich, majorita).
4. Screenshot seznamu kategorii a detailu jedne kategorie.
5. **Verify**: Vsech 10 kategorii se zobrazuje, detail ukazuje spravne udaje.

### Flow D: Competition Detail — Pary

1. Klikni na "Pary" (badge 350).
2. Over ze se zobrazuje tabulka paru s filtry a razenim.
3. Zkus vyhledavani/filtr — zadej cast jmena.
4. Over ze se zobrazuje startovni cislo, jmena, klub.
5. Zkus CSV export pokud existuje tlacitko.
6. Screenshot tabulky paru.
7. **Verify**: Tabulka renderuje data, filtry funguji, zadny horizontal overflow.

### Flow E: Competition Detail — Porota

1. Klikni na "Porota".
2. Over seznam rozhodcich — jmena, prirazene sekce.
3. Zkus tlacitko pro vytvoreni tokenu / QR kodu pokud existuje.
4. Over ze se zobrazi PIN a/nebo URL pro rozhodciho.
5. **Zaznamenej** URL tokenu rozhodciho — bude potreba pro Flow I.
6. Screenshot stranky poroty.
7. **Verify**: Rozhodci se zobrazuji, token/QR generovani funguje.

### Flow F: Competition Detail — Check-in

1. Klikni na "Check-in".
2. Over co stranka zobrazuje — seznam paru k prezenci, nebo prazdny stav.
3. Pokud jsou pary, zkus oznacit jedneho jako "prezentovany".
4. Screenshot stranky.
5. **Verify**: Stranka renderuje, interakce funguje.

### Flow G: Competition Detail — Harmonogram

1. Klikni na "Harmonogram".
2. Over ze se zobrazuje casovy rozvrh s bloky sekci.
3. **Drag & Drop** — zkus pretahnout jeden blok na jinou pozici. Over vizualni feedback pri tazeni.
4. Zkus pridat pauzovy blok (tlacitko "Pridat pauzu" nebo podobne).
5. Zkus "Pregenerovat" pokud existuje tlacitko.
6. Screenshot harmonogramu.
7. **Verify**: D&D funguje (blok se presune), casove udaje se prepocitaji.

### Flow H: Competition Detail — Live rizeni & Live kolo

1. Klikni na "Live rizeni" (ma badge LIVE).
2. Over co se zobrazi — vyber sekce/kola, panel rozhodcich, heat selector.
3. Pokud neni aktivni kolo, zkus aktivovat jedno (tlacitko "Start" nebo vybrat sekci → kolo → spustit).
4. Klikni na "Live kolo" — over rozdil oproti "Live rizeni".
5. Screenshot obou stranek.
6. **Verify**: Panely renderuji, zadne prazdne oblasti, tlacitka reagují.

### Flow I: Competition Detail — Vyhodnoceni & Diplomy

1. Klikni na "Vyhodnoceni".
2. Over ze se zobrazuji vysledky (nebo prazdny stav pokud zadne kolo nebylo uzavreno).
3. Klikni na "Diplomy".
4. Over ze se zobrazuje stranka diplomu — sablony, generovani, nahled.
5. Over tab "Sloucene" pokud existuje.
6. Screenshot obou stranek.
7. **Verify**: Stranky renderuji, tlacitka funguji.

### Flow J: Competition Detail — Obsah, E-maily, Platby, Rozpocet

1. Postupne klikni na kazdy z techto 4 polozek v sekci SPRAVA:
   - **Obsah** — over co zobrazuje (propozice, texty, atd.)
   - **E-maily & sablony** — over seznam sablon emailu
   - **Platby** — over stav plateb, prehled
   - **Rozpocet** — over rozpoctovy prehled
2. Screenshot kazde stranky.
3. **Verify**: Vsechny 4 stranky renderuji (i kdyz mohou byt prazdne), zadne errory.

### Flow K: Competition Detail — Nastaveni

1. Klikni na "Nastaveni" (posledni polozka v competition sidebaru).
2. Over dostupne nastaveni souteze — nazev, datum, misto, registrace, atd.
3. Zkus zmenit jeden udaj (napr. popis) a ulozit.
4. Screenshot.
5. **Verify**: Formular renderuje, ukladani funguje bez erroru.

### Flow L: Judge Scoring Interface (mobilni pohled)

1. **Zmensi** Chrome okno na **390x844** (iPhone 14 Pro).
2. Naviguj na URL tokenu rozhodciho z Flow E. Pokud nemas, jdi na admin → Porota → vytvor token → zkopiruj URL.
3. Zadej PIN kdyz se zobrazi.
4. Na scoring strance:
   - Over ze layout pasuje do viewportu (zadny horizontal scroll)
   - Over velikost touch targetu (tlacitka min 44x44px vizualne)
   - Over citelnost fontu (body text >= 16px)
   - Zkus kliknout na score tlacitka
5. Screenshot scoring interface.
6. **Verify**: Mobilni layout je cisty, bez overflow, tlacitka jsou klikatelna.
7. **Nastav** Chrome zpet na **1440x900**.

### Flow M: Verejne stranky

1. Otevri novy tab nebo odhlaz se.
2. Naviguj na `/` — over landing page (hero, CTA, animace).
3. Naviguj na `/competitions` — over seznam verejnych soutezi.
4. Zkus filtry (disciplina, vekova kategorie, level).
5. Klikni na jednu soutez — over detail (propozice, registrace pokud otevrena).
6. Screenshot landing page + competitions list + detail.
7. **Verify**: Verejne stranky renderuji bez prihlaseni, filtry funguji, layout je v poradku.

### Flow N: Scoreboard (live vysledky)

1. Naviguj na `/scoreboard/[competitionId]` (pouzij ID souteze z predchozich testu).
2. Over ze se zobrazuji vysledky nebo prazdny stav.
3. Screenshot.
4. **Verify**: Stranka renderuje bez prihlaseni.

### Flow O: Dashboard — Moje prihlasky & Ucastnici

1. Prihlaz se zpet jako admin.
2. Klikni na "Moje prihlasky" v sidebaru. Over co se zobrazi.
3. Klikni na "Ucastnici". Over seznam ucastniku.
4. Screenshot obou.
5. **Verify**: Stranky renderuji.

### Flow P: Dark/Light mode & Locale

1. Na dashboardu klikni na ikonku mesice (dark/light toggle) v headeru.
2. Over ze se prepne motiv — barvy, kontrast, citelnost.
3. Klikni na "cz" toggle — prepni na anglictinu.
4. Over ze se prepnou vsechny labely do anglictiny (zadne chybejici preklady = zadne "auth.signIn" texty).
5. Prepni zpet na CZ.
6. Screenshot v obou rezimech.
7. **Verify**: Prepnuti funguji, zadne rozbite styly, zadne chybejici preklady.

---

## Co reportovat

Po kazdem flow reportuj:
- **Pass / Fail** pro kazdy verifikacni krok
- **Screenshot** klikovych bodu
- **Bugy**: co se stalo vs. co se ocekavalo
- **UI issues**: rozbity layout, necitelny text, chybejici preklady, nefunkcni interakce
- **Konzole**: JS errory viditelne v DevTools (pokud mas pristup)
- **Accessibility**: chybejici labely, spatny kontrast, male touch targety
