import Link from "next/link";

export const metadata = {
  title: "Zásady ochrany osobních údajů – DanceApp",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Back link */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          ← Zpět
        </Link>

        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          Zásady ochrany osobních údajů
        </h1>
        <p className="mb-10 text-sm text-[var(--text-tertiary)]">
          Platné od 1. ledna 2025
        </p>

        <div className="flex flex-col gap-10">

          {/* 1. Správce údajů */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              1. Správce údajů
            </h2>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p>
                Správcem osobních údajů je provozovatel platformy DanceApp, který organizuje nebo
                zprostředkovává taneční soutěže prostřednictvím tohoto systému. Konkrétní správce
                je uveden na stránce příslušné soutěže v sekci Kontakt.
              </p>
            </div>
          </section>

          {/* 2. Jaké údaje zpracováváme */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              2. Jaké údaje zpracováváme
            </h2>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p className="mb-3">V rámci provozu platformy zpracováváme následující kategorie osobních údajů:</p>
              <ul className="ml-4 flex flex-col gap-2 list-disc">
                <li><strong className="text-[var(--text-primary)]">Identifikační údaje</strong> — jméno a příjmení tanečníka nebo organizátora</li>
                <li><strong className="text-[var(--text-primary)]">Kontaktní údaje</strong> — e-mailová adresa použitá při registraci nebo přihlášení</li>
                <li><strong className="text-[var(--text-primary)]">Soutěžní údaje</strong> — název tanečního klubu, startovní číslo, kategorie, výsledky</li>
                <li><strong className="text-[var(--text-primary)]">Platební informace</strong> — výše startovného a stav platby (čísla karet neuchováváme)</li>
                <li><strong className="text-[var(--text-primary)]">Technické údaje</strong> — IP adresa, typ prohlížeče, časy přístupů (logy)</li>
              </ul>
            </div>
          </section>

          {/* 3. Účel zpracování */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              3. Účel zpracování
            </h2>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p className="mb-3">Vaše osobní údaje zpracováváme výhradně pro tyto účely:</p>
              <ul className="ml-4 flex flex-col gap-2 list-disc">
                <li>Registrace páru na taneční soutěž a správa přihlášek</li>
                <li>Přidělení startovního čísla a zařazení do soutěžní kategorie</li>
                <li>Zveřejnění výsledků soutěže (jméno, startovní číslo, pořadí)</li>
                <li>Komunikace o průběhu a změnách soutěže</li>
                <li>Vedení účtu organizátora a administrace soutěží</li>
                <li>Plnění zákonných povinností (daňové a účetní záznamy)</li>
              </ul>
            </div>
          </section>

          {/* 4. Doba uchování */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              4. Doba uchování
            </h2>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <ul className="ml-4 flex flex-col gap-2 list-disc">
                <li>Údaje z registrací na soutěže uchováváme po dobu <strong className="text-[var(--text-primary)]">3 let</strong> od konání soutěže</li>
                <li>Účty organizátorů jsou aktivní po dobu trvání smluvního vztahu + 1 rok</li>
                <li>Výsledky soutěží (jméno, pořadí) mohou být archivovány bez časového omezení jako veřejný záznam</li>
                <li>Technické logy mazáme po <strong className="text-[var(--text-primary)]">90 dnech</strong></li>
              </ul>
            </div>
          </section>

          {/* 5. Vaše práva */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              5. Vaše práva
            </h2>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p className="mb-3">Podle nařízení GDPR (EU 2016/679) máte tato práva:</p>
              <ul className="ml-4 flex flex-col gap-2 list-disc">
                <li><strong className="text-[var(--text-primary)]">Právo na přístup</strong> — kdykoli si můžete vyžádat kopii svých údajů</li>
                <li><strong className="text-[var(--text-primary)]">Právo na opravu</strong> — pokud jsou vaše údaje nepřesné, opravíme je</li>
                <li><strong className="text-[var(--text-primary)]">Právo na výmaz</strong> — za podmínek daných GDPR můžete požádat o smazání účtu</li>
                <li><strong className="text-[var(--text-primary)]">Právo na přenositelnost</strong> — vydáme vám data ve strojově čitelném formátu (JSON)</li>
                <li><strong className="text-[var(--text-primary)]">Právo vznést námitku</strong> — proti zpracování na základě oprávněného zájmu</li>
                <li><strong className="text-[var(--text-primary)]">Právo podat stížnost</strong> — u Úřadu pro ochranu osobních údajů (uoou.cz)</li>
              </ul>
              <p className="mt-4 rounded-xl bg-[var(--surface-secondary)] px-4 py-3 text-xs text-[var(--text-tertiary)]">
                Přihlášení uživatelé mohou exportovat svá data nebo podat žádost o výmaz přímo v nastavení účtu.
              </p>
            </div>
          </section>

          {/* 6. Kontakt */}
          <section>
            <h2 className="mb-3 text-lg font-semibold text-[var(--text-primary)]">
              6. Kontakt
            </h2>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm leading-relaxed text-[var(--text-secondary)]">
              <p>
                Máte-li dotazy týkající se zpracování osobních údajů, kontaktujte nás na e-mailové adrese
                uvedené na stránce příslušné soutěže, nebo napište organizátorovi soutěže přímo.
              </p>
              <p className="mt-3">
                Pro uplatnění práv podle GDPR (export dat, výmaz účtu) použijte sekci
                <strong className="text-[var(--text-primary)]"> Nastavení → Soukromí</strong> po přihlášení,
                nebo kontaktujte správce prostřednictvím kontaktního e-mailu soutěže.
              </p>
            </div>
          </section>

        </div>

        {/* Footer back link */}
        <div className="mt-12 border-t border-[var(--border)] pt-6">
          <Link
            href="/"
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Zpět na hlavní stránku
          </Link>
        </div>
      </div>
    </div>
  );
}
