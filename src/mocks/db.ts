// In-memory mock database — resets on page reload
import type { CompetitionDto, CompetitionNewsItem } from "@/lib/api/competitions";
import type { SectionDto } from "@/lib/api/sections";
import type { PairDto } from "@/lib/api/pairs";

export const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@danceapp.sk",
  firstName: "Admin",
  lastName: "User",
  role: "ORGANIZER" as const,
  emailVerified: true,
  twoFactorEnabled: false,
};

export const mockAuthResponse = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  expiresIn: 3600,
  user: mockUser,
};

// ── Competitions ───────────────────────────────────────────────────────────────
export const competitions: CompetitionDto[] = [
  {
    id: "comp-001",
    name: "Slovak Dance Cup 2026",
    description: "Annual ballroom competition",
    location: "Bratislava, Slovakia",
    startDate: "2026-04-15T09:00:00",
    endDate: "2026-04-15T20:00:00",
    status: "REGISTRATION_OPEN",
    organizerId: mockUser.id,
    registrationDeadline: "2026-04-10T23:59:00",
    maxPairs: 200,
    registeredPairsCount: 47,
    createdAt: "2026-01-10T10:00:00",
    pairsVisibility: "HIDDEN",
    numberOfRounds: 2,
    contactEmail: "info@slovakdancecup.sk",
    propozice: "Soutěž se řídí pravidly WDSF. Každý pár může startovat v jedné věkové kategorii. Hudba musí být nahrána ve formátu MP3. Soutěžní oblečení musí splňovat pravidla WDSF pro danou kategorii. Výsledky jsou vyhlašovány průběžně po každé kategorii.",
    paymentInfo: "IBAN: SK89 0900 0000 0051 8743 2198\nBIC: GIBASKBX\nVariabilný symbol: startovní číslo páru\nDo poznámky uveďte jméno a příjmení.",
  },
  {
    id: "comp-002",
    name: "Bratislava Open 2026",
    description: "International open competition",
    location: "Bratislava, Slovakia",
    startDate: "2026-06-20T10:00:00",
    endDate: "2026-06-21T18:00:00",
    status: "DRAFT",
    organizerId: mockUser.id,
    registeredPairsCount: 0,
    createdAt: "2026-02-01T09:00:00",
    pairsVisibility: "HIDDEN",
  },
  {
    id: "comp-003",
    name: "Winter Championship 2025",
    description: "Season finale",
    location: "Košice, Slovakia",
    startDate: "2025-11-30T09:00:00",
    endDate: "2025-11-30T19:00:00",
    status: "COMPLETED",
    organizerId: mockUser.id,
    registeredPairsCount: 63,
    createdAt: "2025-09-01T08:00:00",
    pairsVisibility: "PUBLIC",
  },
];

// ── Sections ───────────────────────────────────────────────────────────────────
export const sections: SectionDto[] = [
  {
    id: "sec-001",
    competitionId: "comp-001",
    name: "Adult Standard A",
    ageCategory: "ADULT",
    level: "A",
    danceStyle: "STANDARD",
    dances: [
      { id: "dance-001", name: "Waltz", style: "STANDARD", orderIndex: 0 },
      { id: "dance-002", name: "Tango", style: "STANDARD", orderIndex: 1 },
      { id: "dance-003", name: "Viennese Waltz", style: "STANDARD", orderIndex: 2 },
      { id: "dance-004", name: "Foxtrot", style: "STANDARD", orderIndex: 3 },
      { id: "dance-005", name: "Quickstep", style: "STANDARD", orderIndex: 4 },
    ],
    registeredPairsCount: 18,
    maxPairs: 48,
    entryFee: 40,
    entryFeeCurrency: "EUR",
    status: "ACTIVE",
  },
  {
    id: "sec-004",
    competitionId: "comp-002",
    name: "Adult Standard A",
    ageCategory: "ADULT",
    level: "A",
    danceStyle: "STANDARD",
    dances: [
      { id: "dance-001", name: "Waltz", style: "STANDARD", orderIndex: 0 },
      { id: "dance-002", name: "Tango", style: "STANDARD", orderIndex: 1 },
      { id: "dance-005", name: "Quickstep", style: "STANDARD", orderIndex: 2 },
    ],
    registeredPairsCount: 0,
    entryFee: 45,
    entryFeeCurrency: "EUR",
    status: "ACTIVE",
  },
  {
    id: "sec-005",
    competitionId: "comp-002",
    name: "Youth Latin B",
    ageCategory: "YOUTH",
    level: "B",
    danceStyle: "LATIN",
    dances: [
      { id: "dance-006", name: "Samba", style: "LATIN", orderIndex: 0 },
      { id: "dance-007", name: "Cha Cha Cha", style: "LATIN", orderIndex: 1 },
      { id: "dance-008", name: "Rumba", style: "LATIN", orderIndex: 2 },
    ],
    registeredPairsCount: 0,
    entryFee: 35,
    entryFeeCurrency: "EUR",
    status: "ACTIVE",
  },
  {
    id: "sec-002",
    competitionId: "comp-001",
    name: "Youth Latin B",
    ageCategory: "YOUTH",
    level: "B",
    danceStyle: "LATIN",
    dances: [
      { id: "dance-006", name: "Samba", style: "LATIN", orderIndex: 0 },
      { id: "dance-007", name: "Cha Cha Cha", style: "LATIN", orderIndex: 1 },
      { id: "dance-008", name: "Rumba", style: "LATIN", orderIndex: 2 },
      { id: "dance-009", name: "Paso Doble", style: "LATIN", orderIndex: 3 },
      { id: "dance-010", name: "Jive", style: "LATIN", orderIndex: 4 },
    ],
    registeredPairsCount: 14,
    entryFee: 35,
    entryFeeCurrency: "EUR",
    status: "DRAFT",
  },
  {
    id: "sec-003",
    competitionId: "comp-001",
    name: "Junior I Standard C",
    ageCategory: "JUNIOR_I",
    level: "C",
    danceStyle: "STANDARD",
    dances: [
      { id: "dance-001", name: "Waltz", style: "STANDARD", orderIndex: 0 },
      { id: "dance-002", name: "Tango", style: "STANDARD", orderIndex: 1 },
      { id: "dance-005", name: "Quickstep", style: "STANDARD", orderIndex: 2 },
    ],
    registeredPairsCount: 15,
    entryFee: 25,
    entryFeeCurrency: "EUR",
    status: "COMPLETED",
  },
];

export type PresenceStatus = "ABSENT" | "CHECKED_IN" | "ON_FLOOR" | "DONE";

export interface PairWithPresence extends PairDto {
  presenceStatus: PresenceStatus;
}

// ── Pairs ──────────────────────────────────────────────────────────────────────
export const pairs: PairWithPresence[] = [
  { id: "pair-001", competitionId: "comp-001", sectionId: "sec-001", startNumber: 1, dancer1FirstName: "Martin", dancer1LastName: "Novák", dancer1Club: "DC Bratislava", dancer2FirstName: "Eva", dancer2LastName: "Nováková", dancer2Club: "DC Bratislava", email: "martin.novak@email.sk", registeredAt: "2026-02-01T10:00:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "CHECKED_IN" },
  { id: "pair-002", competitionId: "comp-001", sectionId: "sec-001", startNumber: 2, dancer1FirstName: "Peter", dancer1LastName: "Horváth", dancer1Club: "TK Košice", dancer2FirstName: "Anna", dancer2LastName: "Horváthová", dancer2Club: "TK Košice", email: "peter.horvath@email.sk", registeredAt: "2026-02-03T11:00:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "CHECKED_IN" },
  { id: "pair-003", competitionId: "comp-001", sectionId: "sec-001", startNumber: 3, dancer1FirstName: "Lukáš", dancer1LastName: "Kováč", dancer1Club: "SD Žilina", dancer2FirstName: "Monika", dancer2LastName: "Kováčová", dancer2Club: "SD Žilina", registeredAt: "2026-02-05T09:30:00", paymentStatus: "PENDING", registrationStatus: "UNCONFIRMED", presenceStatus: "ON_FLOOR" },
  { id: "pair-004", competitionId: "comp-001", sectionId: "sec-001", startNumber: 4, dancer1FirstName: "Tomáš", dancer1LastName: "Blaho", dancer1Club: "DC Bratislava", dancer2FirstName: "Zuzana", dancer2LastName: "Blahová", dancer2Club: "DC Bratislava", registeredAt: "2026-02-06T14:00:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "ABSENT" },
  { id: "pair-005", competitionId: "comp-001", sectionId: "sec-001", startNumber: 5, dancer1FirstName: "Jakub", dancer1LastName: "Sloboda", dancer1Club: "TK Nitra", dancer2FirstName: "Lucia", dancer2LastName: "Slobodová", dancer2Club: "TK Nitra", registeredAt: "2026-02-07T16:00:00", paymentStatus: "PENDING", registrationStatus: "UNCONFIRMED", presenceStatus: "ABSENT" },
  { id: "pair-006", competitionId: "comp-001", sectionId: "sec-002", startNumber: 6, dancer1FirstName: "Michal", dancer1LastName: "Varga", dancer1Club: "LD Trnava", dancer2FirstName: "Jana", dancer2LastName: "Vargová", dancer2Club: "LD Trnava", email: "michal.varga@email.sk", registeredAt: "2026-02-08T10:00:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "DONE" },
  { id: "pair-007", competitionId: "comp-001", sectionId: "sec-002", startNumber: 7, dancer1FirstName: "Filip", dancer1LastName: "Oravec", dancer1Club: "SD Žilina", dancer2FirstName: "Petra", dancer2LastName: "Oravecová", dancer2Club: "SD Žilina", registeredAt: "2026-02-09T11:30:00", paymentStatus: "WAIVED", registrationStatus: "CANCELLED", presenceStatus: "ABSENT" },
];

// ── Rounds ─────────────────────────────────────────────────────────────────────
export const rounds = [
  {
    id: "round-001",
    sectionId: "sec-001",
    roundType: "PRELIMINARY",
    status: "CALCULATED",
    roundNumber: 1,
    judgeCount: 5,
    pairsToAdvance: 8,
    startedAt: "2026-04-15T10:00:00",
    closedAt: "2026-04-15T10:45:00",
  },
  {
    id: "round-002",
    sectionId: "sec-001",
    roundType: "FINAL",
    status: "OPEN",
    roundNumber: 2,
    judgeCount: 5,
    pairsToAdvance: null,
    startedAt: null,
    closedAt: null,
  },
  {
    id: "round-003",
    sectionId: "sec-003",
    roundType: "FINAL",
    status: "CALCULATED",
    roundNumber: 1,
    judgeCount: 5,
    pairsToAdvance: null,
    startedAt: "2026-04-15T10:00:00",
    closedAt: "2026-04-15T10:30:00",
  },
];

// ── Judge tokens ───────────────────────────────────────────────────────────────
export const judgeTokens = [
  { id: "jt-001", competitionId: "comp-001", judgeNumber: 1, token: "JUDGE1TOKEN", pin: "1234", role: "JUDGE", connected: true },
  { id: "jt-002", competitionId: "comp-001", judgeNumber: 2, token: "JUDGE2TOKEN", pin: "2345", role: "JUDGE", connected: false },
  { id: "jt-003", competitionId: "comp-001", judgeNumber: 3, token: "JUDGE3TOKEN", pin: "3456", role: "JUDGE", connected: true },
  { id: "jt-004", competitionId: "comp-001", judgeNumber: 4, token: "JUDGE4TOKEN", pin: "4567", role: "JUDGE", connected: true },
  { id: "jt-005", competitionId: "comp-001", judgeNumber: 5, token: "JUDGE5TOKEN", pin: "5678", role: "JUDGE", connected: false },
];

// ── Check-in tokens ────────────────────────────────────────────────────────────
export const checkinTokens: { token: string; competitionId: string }[] = [
  { token: "CHECKIN001", competitionId: "comp-001" },
];

// ── Section final results ──────────────────────────────────────────────────────
export const sectionResults = {
  "sec-003": {
    sectionId: "sec-003",
    rankings: [
      { pairId: "pair-001", startNumber: 1, totalSum: 7, finalPlacement: 1, tieResolution: "NONE", perDance: { Waltz: 1, Tango: 2, Quickstep: 1 } },
      { pairId: "pair-002", startNumber: 2, totalSum: 10, finalPlacement: 2, tieResolution: "NONE", perDance: { Waltz: 2, Tango: 3, Quickstep: 2 } },
      { pairId: "pair-003", startNumber: 3, totalSum: 15, finalPlacement: 3, tieResolution: "NONE", perDance: { Waltz: 4, Tango: 4, Quickstep: 3 } },
      { pairId: "pair-004", startNumber: 4, totalSum: 18, finalPlacement: 4, tieResolution: "NONE", perDance: { Waltz: 3, Tango: 5, Quickstep: 5 } },
      { pairId: "pair-005", startNumber: 5, totalSum: 21, finalPlacement: 5, tieResolution: "NONE", perDance: { Waltz: 5, Tango: 1, Quickstep: 6 } },
    ],
  },
};

// ── News (Aktuality) ───────────────────────────────────────────────────────────
export const news: CompetitionNewsItem[] = [
  {
    id: "news-001",
    competitionId: "comp-001",
    title: "Registrace je otevřena!",
    content: "Spouštíme online registrace pro Slovak Dance Cup 2026. Přihlásit se můžete přes odkaz na naší stránce. Uzávěrka přihlášek je 10. dubna 2026.",
    publishedAt: "2026-01-15T10:00:00",
  },
  {
    id: "news-002",
    competitionId: "comp-001",
    title: "Rozvrh kategorií",
    content: "Zveřejňujeme předběžný harmonogram soutěžního dne. Junioři startují od 10:00, dospělí odpoledne od 14:00. Přesný rozpis bude upřesněn po uzávěrce přihlášek.",
    publishedAt: "2026-02-20T09:00:00",
  },
];

// ── Fees ───────────────────────────────────────────────────────────────────────
export const fees = [
  { id: "fee-001", competitionId: "comp-001", name: "Entry fee", amount: 40, currency: "EUR", dueDate: "2026-04-10T23:59:00" },
  { id: "fee-002", competitionId: "comp-001", sectionId: "sec-001", name: "Standard surcharge", amount: 10, currency: "EUR" },
];

export const discounts = [
  { id: "disc-001", competitionId: "comp-001", code: "EARLY20", type: "PERCENTAGE", value: 20, maxUses: 50, usedCount: 12, active: true },
  { id: "disc-002", competitionId: "comp-001", code: "CLUB10", type: "FIXED", value: 10, maxUses: null, usedCount: 5, active: true },
];

// ── Notifications ──────────────────────────────────────────────────────────────
export const notifications = [
  { id: "notif-001", competitionId: "comp-001", type: "EMAIL", subject: "Registration confirmed", sentAt: "2026-02-10T10:00:00", recipientCount: 47, status: "SENT" },
  { id: "notif-002", competitionId: "comp-001", type: "EMAIL", subject: "Schedule published", sentAt: "2026-04-01T09:00:00", recipientCount: 47, status: "SENT" },
];

// ── Schedule ───────────────────────────────────────────────────────────────────
export const scheduleSlots = [
  { id: "slot-001", competitionId: "comp-001", sectionId: "sec-003", sectionName: "Junior I Standard C", roundType: "FINAL", startsAt: "2026-04-15T10:00:00", durationMinutes: 30, floor: "1", orderIndex: 0 },
  { id: "slot-002", competitionId: "comp-001", sectionId: "sec-001", sectionName: "Adult Standard A", roundType: "PRELIMINARY", startsAt: "2026-04-15T10:40:00", durationMinutes: 40, floor: "1", orderIndex: 1 },
  { id: "slot-003", competitionId: "comp-001", sectionId: "sec-002", sectionName: "Youth Latin B", roundType: "PRELIMINARY", startsAt: "2026-04-15T11:30:00", durationMinutes: 35, floor: "2", orderIndex: 2 },
  { id: "slot-004", competitionId: "comp-001", sectionId: "sec-001", sectionName: "Adult Standard A", roundType: "FINAL", startsAt: "2026-04-15T14:00:00", durationMinutes: 45, floor: "1", orderIndex: 3 },
];
