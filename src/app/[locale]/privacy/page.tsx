export const metadata = {
  title: "Zpracování osobních údajů | ProPodium",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-2 text-2xl font-bold">Zpracování osobních údajů</h1>
      <p className="mb-8 text-sm text-gray-500">Poslední aktualizace: duben 2026</p>

      <p className="mb-8 text-sm text-gray-600">
        Tato stránka popisuje, jak ProPodium shromažďuje, používá a chrání osobní údaje
        (tj. informace, které umožňují identifikaci nebo kontaktování konkrétní osoby)
        v souladu s platnou legislativou na ochranu osobních údajů.
      </p>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Jaké informace shromažďujeme</h2>
        <p className="mb-2 text-sm text-gray-600">
          Při registraci nebo přihlášení na soutěž můžeme požadovat:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Jméno a příjmení</li>
          <li>E-mailovou adresu</li>
          <li>Telefonní číslo</li>
          <li>Datum narození</li>
          <li>Název taneční školy / klubu</li>
          <li>Výsledky ze soutěží (veřejně dostupné)</li>
        </ul>
        <p className="mt-2 text-sm text-gray-600">
          Informace sbíráme při registraci, přihlášení na soutěž, vyplnění formuláře nebo
          jiném zadání údajů v aplikaci.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">K čemu informace používáme</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Přizpůsobení obsahu a zkušenosti v aplikaci</li>
          <li>Zlepšování funkcí a kvality služeb</li>
          <li>Správa přihlášek na soutěže</li>
          <li>Zasílání e-mailů k přihláškám a soutěžím (potvrzení, výsledky)</li>
          <li>Ověření věkové kategorie pro potřeby organizátorů</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Ochrana dat</h2>
        <p className="text-sm text-gray-600">
          Nikdy nepožadujeme číslo platební karty. Citlivé přenosy dat jsou chráněny
          šifrováním SSL/TLS. Přístup k osobním údajům je omezen pouze na nezbytný okruh
          pracovníků. Hesla jsou ukládána v hashované podobě.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Smazání účtu</h2>
        <p className="text-sm text-gray-600">
          Svůj účet a všechna přidružená data (přihlášky, platební záznamy) můžete smazat
          v sekci <strong>Nastavení → GDPR → Smazat účet</strong>. Po potvrzení jsou data
          nenávratně anonymizována.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Cookies</h2>
        <p className="mb-2 text-sm text-gray-600">
          Cookies používáme ke sledování přihlášení na soutěže, ukládání preferencí a
          analýze provozu za účelem zlepšování služeb. Nepoužíváme reklamní cookies.
        </p>
        <p className="text-sm text-gray-600">
          Ve svém prohlížeči můžete cookies zakázat nebo nastavit upozornění před jejich
          přijetím. Některé funkce aplikace však mohou být bez cookies omezeny.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Třetí strany</h2>
        <p className="text-sm text-gray-600">
          Osobní údaje neprodáváme ani nepředáváme třetím stranám za účelem marketingu.
          Kontaktní informace nejsou sdíleny pro komerční účely. Subdodavatelé technické
          podpory mohou mít přístup k údajům pouze v rozsahu nezbytném pro plnění svých
          úkolů a jsou vázáni povinností mlčenlivosti.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Vaše práva (GDPR)</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>
            <strong>Export dat</strong> — dostupný v Nastavení → GDPR (formát JSON)
          </li>
          <li>
            <strong>Výmaz dat</strong> — žádost o anonymizaci v Nastavení → GDPR
          </li>
          <li>
            <strong>Oprava</strong> — kontaktujte organizátora příslušné soutěže nebo nás
            na info@propodium.cz
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Signál „Do Not Track"</h2>
        <p className="text-sm text-gray-600">
          Respektujeme signál Do Not Track nastavený v prohlížeči. Pokud je aktivní,
          nepřidáváme analytické cookies.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Ochrana dětí</h2>
        <p className="text-sm text-gray-600">
          Aplikace není cílena na děti mladší 13 let. Třetím stranám neumožňujeme
          shromažďovat údaje o dětech prostřednictvím naší platformy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Bezpečnostní incident</h2>
        <p className="text-sm text-gray-600">
          V případě bezpečnostního incidentu týkajícího se vašich dat vás budeme informovat
          do 1 pracovního dne od jeho zjištění.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Kontakt</h2>
        <p className="text-sm text-gray-600">
          Dotazy ke zpracování osobních údajů zasílejte na{" "}
          <a href="mailto:info@propodium.cz" className="underline">
            info@propodium.cz
          </a>
          .
        </p>
      </section>
    </main>
  );
}
