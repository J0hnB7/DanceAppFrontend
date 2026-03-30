export type Locale = "cs" | "en";

const T = {
  // Judge — common
  "judge.offline_warning": { cs: "Jste offline — hodnocení uloženo lokálně", en: "You are offline — scoring saved locally" },
  "judge.submitted": { cs: "Hodnocení odesláno", en: "Scoring submitted" },
  "judge.submit_failed": { cs: "Odeslání selhalo — hodnocení uloženo offline", en: "Submission failed — scoring saved offline" },
  "judge.access_denied": { cs: "Přístup odepřen", en: "Access denied" },
  "judge.waiting_title": { cs: "Čekání na kolo", en: "Waiting for round" },
  "judge.waiting_body": { cs: "Organizátor brzy otevře kolo.", en: "The organizer will open the round soon." },
  "judge.label": { cs: "Porotce", en: "Judge" },
  "judge.draft_restored": { cs: "Obnoveno z lokálního záznamu — zkontrolujte hodnocení před odesláním", en: "Restored from local draft — review before submitting" },
  "judge.no_pairs": { cs: "Žádné přítomné páry", en: "No pairs present" },
  "judge.no_pairs_body": { cs: "Prezence zatím nepotvrdila žádné páry v této kategorii.", en: "No pairs have been confirmed in this category yet." },
  "judge.done_title": { cs: "Odesláno!", en: "Submitted!" },
  "judge.done_body": { cs: "Vaše hodnocení bylo zaznamenáno. Čekání na ostatní porotce...", en: "Your scoring has been recorded. Waiting for other judges..." },
  "judge.offline_badge": { cs: "Offline", en: "Offline" },
  "judge.offline_bottom": { cs: "Jste offline. Hodnocení bude uloženo lokálně.", en: "You are offline. Scoring will be saved locally." },
  "judge.submit_online": { cs: "Odeslat hodnocení", en: "Submit scoring" },
  "judge.submit_offline": { cs: "Uložit offline", en: "Save offline" },
  "judge.selected_count": { cs: "vybráno", en: "selected" },
  "judge.pin_prompt": { cs: "Zadejte PIN", en: "Enter PIN" },
  "judge.pin_label": { cs: "PIN (4–6 číslic)", en: "PIN (4–6 digits)" },
  "judge.pin_wrong": { cs: "Nesprávný PIN. Zkuste znovu.", en: "Wrong PIN. Try again." },
  "judge.pin_locked": { cs: "Přístup dočasně zablokován. Zkuste za 5 minut.", en: "Access temporarily blocked. Try again in 5 minutes." },
  "judge.login_button": { cs: "Přihlásit se", en: "Sign in" },
  "judge.connecting": { cs: "Přihlašuji...", en: "Connecting..." },
  "judge.offline_marks": { cs: "marks offline", en: "marks offline" },
  "judge.waiting_for_admin": { cs: "Čekám na instrukce od administrátora", en: "Waiting for instructions from administrator" },
  "judge.lobby_waiting": { cs: "Čekám na zahájení kola...", en: "Waiting for round to start..." },
  "judge.lobby_round_ready": { cs: "Kolo je připraveno!", en: "Round is ready!" },
  "judge.lobby_go": { cs: "Jít hodnotit", en: "Go to scoring" },
  "judge.lobby_subtitle": { cs: "Budete automaticky přesměrováni.", en: "You will be redirected automatically." },
  "judge.selected_of": { cs: "Vybráno:", en: "Selected:" },
  "judge.of": { cs: "z", en: "of" },
  "judge.clear": { cs: "Vymazat", en: "Clear" },
  "judge.count_mismatch_title": { cs: "Jiný počet vybráno", en: "Count mismatch" },
  "judge.count_mismatch_body": { cs: "Vybráno {selected} párů, požadováno {required}. Odeslat tak?", en: "Selected {selected} pairs, required {required}. Submit anyway?" },
  "judge.submit_anyway": { cs: "Odeslat i tak", en: "Submit anyway" },
  "judge.back": { cs: "Zpět", en: "Back" },
  "scoring.title": { cs: "Sledování hodnocení", en: "Scoring progress" },
  "scoring.received": { cs: "Přijato:", en: "Received:" },
  "scoring.calculate": { cs: "Spočítat výsledky", en: "Calculate results" },
  "scoring.waiting": { cs: "Čeká...", en: "Waiting..." },
  "scoring.offline_badge": { cs: "Offline", en: "Offline" },
  "scoring.submitted_at": { cs: "Odesláno", en: "Submitted" },
  "scoring.conflict": { cs: "Konflikt marks", en: "Mark conflict" },
  "scoring.resolve_online": { cs: "Zachovat online", en: "Keep online" },
  "scoring.resolve_offline": { cs: "Zachovat offline", en: "Keep offline" },

  // Judge — round type labels
  "round.preliminary": { cs: "Kolo {{n}}", en: "Round {{n}}" },
  "round.final": { cs: "Finále", en: "Final" },
  "round.label": { cs: "Kolo", en: "Round" },

  // Preliminary scoring
  "prelim.instruction": { cs: "Vyberte páry postupující do dalšího kola.", en: "Select pairs advancing to the next round." },
  "prelim.recommended": { cs: "Doporučeno:", en: "Recommended:" },
  "prelim.recommended_pairs": { cs: "párů.", en: "pairs." },

  // Final scoring (token page)
  "final.instruction": { cs: "Přiřaďte pořadí (1 = nejlepší). Každé místo lze použít jen jednou.", en: "Assign placements (1 = best). Each place can be used only once." },

  // Final scoring (/final page)
  "final.assign_all": { cs: "Nejdříve přiřaďte všechna místa", en: "Please assign all placements before submitting" },
  "final.dance_submitted": { cs: "Tanec odeslán!", en: "Dance submitted!" },
  "final.submit_failed": { cs: "Odeslání selhalo", en: "Submission failed" },
  "final.header": { cs: "Finále", en: "Final" },
  "final.all_done_title": { cs: "Vše odesláno!", en: "All dances submitted!" },
  "final.all_done_body_a": { cs: "Vaše skóre pro všechny", en: "Your scores for all" },
  "final.all_done_body_b": { cs: "tance bylo zaznamenáno.", en: "dances have been recorded." },
  "final.status_submitted": { cs: "Odesláno", en: "Submitted" },
  "final.status_in_progress": { cs: "Probíhá", en: "In progress" },
  "final.assign_placements": { cs: "Přiřaďte místa 1–{n} každému páru", en: "Assign placements 1–{n} for each pair" },
  "final.dance_done_review": { cs: "Použijte tlačítka výše pro kontrolu ostatních tanců.", en: "Use the buttons above to review other dances." },
  "final.submitted_for": { cs: "Odesláno pro", en: "Submitted for" },
  "final.submit_dance": { cs: "Odeslat", en: "Submit" },

  // Preliminary round page
  "prelim.ping_alert": { cs: "Upozornění od porotní komise — prosím odevzdejte hodnocení", en: "Alert from jury committee — please submit your scoring" },
  "prelim.offline_local": { cs: "Offline — hodnocení se uloží lokálně", en: "Offline — scoring will be saved locally" },
  "prelim.selected_label": { cs: "Vybráno", en: "Selected" },
  "prelim.remaining": { cs: "{n} zbývá", en: "{n} remaining" },
  "prelim.group": { cs: "Skupina {n}", en: "Group {n}" },
  "prelim.all_submitted_title": { cs: "Všechny tance ohodnoceny", en: "All dances scored" },
  "prelim.submitted_title": { cs: "Hodnocení odesláno", en: "Scoring submitted" },
  "prelim.all_thanks": { cs: "Děkujeme — čeká se na uzavření kola", en: "Thank you — waiting for round to close" },
  "prelim.wait_next": { cs: "Čeká se na další tanec", en: "Waiting for next dance" },
  "prelim.already_submitted": { cs: "— již ohodnoceno", en: "— already scored" },
  "prelim.dance_already_desc": { cs: "Tento tanec jste již ohodnotili. Vyberte jiný tanec výše.", en: "You have already scored this dance. Select another dance above." },
  "prelim.undecided_title": { cs: "Nerozhodnuté páry", en: "Undecided pairs" },
  "prelim.undecided_one": { cs: "nerozhodnutý pár", en: "undecided pair" },
  "prelim.undecided_few": { cs: "nerozhodnuté páry", en: "undecided pairs" },
  "prelim.undecided_many": { cs: "nerozhodnutých párů", en: "undecided pairs" },
  "prelim.submit_btn": { cs: "Odeslat", en: "Submit" },
  "prelim.submit_anyway_btn": { cs: "Odeslat přesto", en: "Submit anyway" },
  "prelim.less_crosses": { cs: "Méně křížů než požadováno", en: "Fewer crosses than required" },
  "prelim.more_crosses": { cs: "Více křížů než požadováno", en: "More crosses than required" },
  "prelim.marked": { cs: "Označeno {selected}, požadováno {required}", en: "Marked {selected}, required {required}" },

  // Lobby page additional
  "judge.ping_alert_short": { cs: "Upozornění od porotní komise", en: "Alert from jury committee" },
  "judge.fallback_mode": { cs: "Záložní režim — kontrola každých 10 s", en: "Fallback mode — checking every 10 s" },
  "judge.lobby_offline": { cs: "Offline — marks se uloží lokálně", en: "Offline — marks will be saved locally" },
} as const;

type TranslationKey = keyof typeof T;

export function t(key: TranslationKey, locale: Locale, vars?: Record<string, string | number>): string {
  const entry = T[key];
  let str: string = entry[locale] ?? entry.cs;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{${k}}`, String(v));
    }
  }
  return str;
}

export function detectLocale(): Locale {
  if (typeof window === "undefined") return "cs";
  const stored = localStorage.getItem("danceapp_locale");
  if (stored === "en" || stored === "cs") return stored;
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "cs";
}
