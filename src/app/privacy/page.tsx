export const metadata = {
  title: "Ochrana osobních údajů | ProPodium",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Ochrana osobních údajů</h1>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Správce dat</h2>
        <p className="text-sm text-gray-600">
          Osobní údaje zpracovává provozovatel aplikace ProPodium.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Jaká data zpracováváme</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
          <li>Jméno a příjmení tanečníka / tanečnice</li>
          <li>Kontaktní email (pro potvrzení registrace a komunikaci)</li>
          <li>Název taneční školy / klubu</li>
          <li>Výsledky ze soutěží (veřejně dostupné)</li>
        </ul>
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
            <strong>Oprava</strong> — kontaktujte organizátora příslušné soutěže
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-2 text-lg font-semibold">Cookies</h2>
        <p className="text-sm text-gray-600">
          Aplikace používá pouze technicky nezbytné cookies pro přihlášení (HttpOnly refresh token).
          Nepoužíváme analytické ani reklamní cookies.
        </p>
      </section>

      <p className="mt-8 text-xs text-gray-400">Poslední aktualizace: březen 2026</p>
    </main>
  );
}
