// In-memory mock database — resets on page reload
import type { CompetitionDto, CompetitionNewsItem } from "@/lib/api/competitions";
import type { SectionDto } from "@/lib/api/sections";
import type { PairDto } from "@/lib/api/pairs";
import { japSections, japPairs } from "./jap-2026-data";

export const mockUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "admin@danceapp.sk",
  name: "Admin User",
  role: "ORGANIZER" as const,
  emailVerified: true,
  twoFactorEnabled: false,
};

export const mockTokenResponse = {
  accessToken: "mock-access-token",
  refreshToken: "mock-refresh-token",
  expiresIn: 3600,
};

// ── Competitions ───────────────────────────────────────────────────────────────
export const competitions: CompetitionDto[] = [
  {
    id: "comp-jap-2026",
    name: "Jarní Pohár Astra Praha 2026 - neděle",
    description: "Jarní Pohár Astra Praha 2026 – neděle 15. 3. 2026",
    venue: "Praha, Česká republika",
    eventDate: "2026-03-15",
    status: "COMPLETED",
    registrationOpen: false,
    organizerId: mockUser.id,
    pairsVisibility: "PUBLIC",
    contactEmail: "info@astrapraha.cz",
  },
  {
    id: "comp-001",
    name: "Slovak Dance Cup 2026",
    description: "Annual ballroom competition",
    venue: "Bratislava, Slovakia",
    eventDate: "2026-04-15",
    status: "PUBLISHED",
    registrationOpen: true,
    organizerId: mockUser.id,
    registrationDeadline: "2026-04-10T23:59:00",
    maxPairs: 200,
    pairsVisibility: "HIDDEN",
    numberOfRounds: 2,
    contactEmail: "info@slovakdancecup.sk",
  },
  {
    id: "comp-002",
    name: "Bratislava Open 2026",
    description: "International open competition",
    venue: "Bratislava, Slovakia",
    eventDate: "2026-06-20",
    status: "DRAFT",
    registrationOpen: false,
    organizerId: mockUser.id,
    pairsVisibility: "HIDDEN",
  },
  {
    id: "comp-003",
    name: "Winter Championship 2025",
    description: "Season finale",
    venue: "Košice, Slovakia",
    eventDate: "2025-11-30",
    status: "COMPLETED",
    registrationOpen: false,
    organizerId: mockUser.id,
    pairsVisibility: "PUBLIC",
  },
];

// ── Sections ───────────────────────────────────────────────────────────────────
export const sections: SectionDto[] = [
  ...japSections,
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
  ...japPairs,
  { id: "pair-001", competitionId: "comp-001", sectionId: "sec-001", startNumber: 1, dancer1FirstName: "Martin", dancer1LastName: "Novák", dancer1Club: "DC Bratislava", dancer2FirstName: "Eva", dancer2LastName: "Nováková", dancer2Club: "DC Bratislava", email: "martin.novak@email.sk", registeredAt: "2026-01-15T10:30:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "CHECKED_IN", athlete1Id: 1001, athlete2Id: 2001, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-002", competitionId: "comp-001", sectionId: "sec-001", startNumber: 2, dancer1FirstName: "Peter", dancer1LastName: "Horváth", dancer1Club: "TK Košice", dancer2FirstName: "Anna", dancer2LastName: "Horváthová", dancer2Club: "TK Košice", email: "peter.horvath@email.sk", registeredAt: "2026-01-15T10:30:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "CHECKED_IN", athlete1Id: 1002, athlete2Id: 2002, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "SVK" },
  { id: "pair-003", competitionId: "comp-001", sectionId: "sec-001", startNumber: 3, dancer1FirstName: "Lukáš", dancer1LastName: "Kováč", dancer1Club: "SD Žilina", dancer2FirstName: "Monika", dancer2LastName: "Kováčová", dancer2Club: "SD Žilina", registeredAt: "2026-01-15T10:30:00", paymentStatus: "PENDING", registrationStatus: "UNCONFIRMED", presenceStatus: "ON_FLOOR", athlete1Id: 1003, athlete2Id: 2003, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-004", competitionId: "comp-001", sectionId: "sec-001", startNumber: 4, dancer1FirstName: "Tomáš", dancer1LastName: "Blaho", dancer1Club: "DC Bratislava", dancer2FirstName: "Zuzana", dancer2LastName: "Blahová", dancer2Club: "DC Bratislava", registeredAt: "2026-01-15T10:30:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "ABSENT", athlete1Id: 1004, athlete2Id: 2004, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "SVK" },
  { id: "pair-005", competitionId: "comp-001", sectionId: "sec-001", startNumber: 5, dancer1FirstName: "Jakub", dancer1LastName: "Sloboda", dancer1Club: "TK Nitra", dancer2FirstName: "Lucia", dancer2LastName: "Slobodová", dancer2Club: "TK Nitra", registeredAt: "2026-01-15T10:30:00", paymentStatus: "PENDING", registrationStatus: "UNCONFIRMED", presenceStatus: "ABSENT", athlete1Id: 1005, athlete2Id: 2005, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-006", competitionId: "comp-001", sectionId: "sec-002", startNumber: 6, dancer1FirstName: "Michal", dancer1LastName: "Varga", dancer1Club: "LD Trnava", dancer2FirstName: "Jana", dancer2LastName: "Vargová", dancer2Club: "LD Trnava", email: "michal.varga@email.sk", registeredAt: "2026-01-15T10:30:00", paymentStatus: "PAID", registrationStatus: "CONFIRMED", presenceStatus: "DONE", athlete1Id: 1006, athlete2Id: 2006, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "SVK" },
  { id: "pair-007", competitionId: "comp-001", sectionId: "sec-002", startNumber: 7, dancer1FirstName: "Filip", dancer1LastName: "Oravec", dancer1Club: "SD Žilina", dancer2FirstName: "Petra", dancer2LastName: "Oravecová", dancer2Club: "SD Žilina", registeredAt: "2026-01-15T10:30:00", paymentStatus: "WAIVED", registrationStatus: "CANCELLED", presenceStatus: "ABSENT", athlete1Id: 1007, athlete2Id: 2007, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
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
export const judgeTokens: {
  id: string; competitionId: string; judgeNumber: number;
  token: string; rawToken: string; active: boolean;
  pin: string; role: string;
}[] = [
  { id: "jt-001", competitionId: "comp-001", judgeNumber: 1, token: "JUDGE1TOKEN", rawToken: "JUDGE1TOKEN", active: true,  pin: "123456", role: "JUDGE" },
  { id: "jt-002", competitionId: "comp-001", judgeNumber: 2, token: "JUDGE2TOKEN", rawToken: "JUDGE2TOKEN", active: true,  pin: "234567", role: "JUDGE" },
  { id: "jt-003", competitionId: "comp-001", judgeNumber: 3, token: "JUDGE3TOKEN", rawToken: "JUDGE3TOKEN", active: true,  pin: "345678", role: "JUDGE" },
  { id: "jt-004", competitionId: "comp-001", judgeNumber: 4, token: "JUDGE4TOKEN", rawToken: "JUDGE4TOKEN", active: true,  pin: "456789", role: "JUDGE" },
  { id: "jt-005", competitionId: "comp-001", judgeNumber: 5, token: "JUDGE5TOKEN", rawToken: "JUDGE5TOKEN", active: false, pin: "567890", role: "JUDGE" },
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
// Duration formula: ceil(danceCount × 120 sec / 60) × heatCount + 5 min buffer
// sec-001: 5 dances, 5 pairs → 1 heat × 10 min + 5 = 15 min (preliminary), 20 min (final w/ buffer)
// sec-002: 5 dances, 3 pairs → 1 heat × 10 min + 5 = 15 min
// sec-003: 3 dances, 2 pairs → 1 heat × 6 min + 5 = 11 → 15 min
export const scheduleSlots: {
  id: string; competitionId: string; sectionId: string | null; roundId: string | null;
  label: string; startTime: string; durationMinutes: number; orderIndex: number;
  type: "ROUND" | "BREAK" | "JUDGE_BREAK" | "AWARD_CEREMONY" | "CUSTOM";
  liveStatus: "NOT_STARTED" | "RUNNING" | "COMPLETED";
  manuallyMoved: boolean; suggested: boolean; durationLocked: boolean; roundNumber: number | null;
}[] = [
  { id: "slot-001", competitionId: "comp-001", sectionId: "sec-003", roundId: null, label: "Junior Standard C — Finále", startTime: "2026-04-15T09:00:00", durationMinutes: 15, orderIndex: 0, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 1 },
  { id: "slot-002", competitionId: "comp-001", sectionId: "sec-001", roundId: null, label: "Adult Standard A — Předkolo", startTime: "2026-04-15T09:15:00", durationMinutes: 20, orderIndex: 1, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 1 },
  { id: "slot-003", competitionId: "comp-001", sectionId: "sec-002", roundId: null, label: "Youth Latin B — Předkolo", startTime: "2026-04-15T09:35:00", durationMinutes: 15, orderIndex: 2, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 1 },
  { id: "slot-004", competitionId: "comp-001", sectionId: null, roundId: null, label: "Přestávka", startTime: "2026-04-15T09:50:00", durationMinutes: 15, orderIndex: 3, type: "BREAK", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: true, durationLocked: false, roundNumber: null },
  { id: "slot-005", competitionId: "comp-001", sectionId: "sec-001", roundId: null, label: "Adult Standard A — Finále", startTime: "2026-04-15T10:05:00", durationMinutes: 20, orderIndex: 4, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 2 },
  { id: "slot-006", competitionId: "comp-001", sectionId: "sec-002", roundId: null, label: "Youth Latin B — Finále", startTime: "2026-04-15T10:25:00", durationMinutes: 15, orderIndex: 5, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 2 },
  { id: "slot-007", competitionId: "comp-001", sectionId: null, roundId: null, label: "Vyhlášení výsledků", startTime: "2026-04-15T10:40:00", durationMinutes: 15, orderIndex: 6, type: "AWARD_CEREMONY", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: true, durationLocked: false, roundNumber: null },
];
