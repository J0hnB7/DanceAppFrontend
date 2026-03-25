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
    danceDurationSeconds: 90,
    transitionDurationSeconds: 30,
    maxPairsOnFloor: 8,
    slotBufferMinutes: 0,
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
  // sec-001: Adult Standard A — 18 párů (slots say 18)
  { id: "pair-008", competitionId: "comp-001", sectionId: "sec-001", startNumber: 8,  dancer1FirstName: "Ondřej",  dancer1LastName: "Procházka", dancer1Club: "TK Olomouc",  dancer2FirstName: "Kateřina", dancer2LastName: "Procházková", dancer2Club: "TK Olomouc",  registeredAt: "2026-01-20T08:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1008, athlete2Id: 2008, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-009", competitionId: "comp-001", sectionId: "sec-001", startNumber: 9,  dancer1FirstName: "Radek",   dancer1LastName: "Fiala",      dancer1Club: "DC Praha",      dancer2FirstName: "Tereza",    dancer2LastName: "Fialová",      dancer2Club: "DC Praha",      registeredAt: "2026-01-20T08:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1009, athlete2Id: 2009, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-010", competitionId: "comp-001", sectionId: "sec-001", startNumber: 10, dancer1FirstName: "Marek",   dancer1LastName: "Dvořák",     dancer1Club: "SD Brno",       dancer2FirstName: "Veronika",  dancer2LastName: "Dvořáková",    dancer2Club: "SD Brno",       registeredAt: "2026-01-20T08:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1010, athlete2Id: 2010, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-011", competitionId: "comp-001", sectionId: "sec-001", startNumber: 11, dancer1FirstName: "Pavel",   dancer1LastName: "Kratochvíl",  dancer1Club: "TK Plzeň",      dancer2FirstName: "Michaela",  dancer2LastName: "Kratochvílová", dancer2Club: "TK Plzeň",      registeredAt: "2026-01-21T09:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1011, athlete2Id: 2011, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-012", competitionId: "comp-001", sectionId: "sec-001", startNumber: 12, dancer1FirstName: "Jiří",    dancer1LastName: "Šimánek",    dancer1Club: "DC Ostrava",    dancer2FirstName: "Lenka",     dancer2LastName: "Šimánková",    dancer2Club: "DC Ostrava",    registeredAt: "2026-01-21T09:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1012, athlete2Id: 2012, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-013", competitionId: "comp-001", sectionId: "sec-001", startNumber: 13, dancer1FirstName: "Vojtěch", dancer1LastName: "Pospíšil",   dancer1Club: "TK Liberec",    dancer2FirstName: "Lucie",     dancer2LastName: "Pospíšilová",  dancer2Club: "TK Liberec",    registeredAt: "2026-01-22T10:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1013, athlete2Id: 2013, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-014", competitionId: "comp-001", sectionId: "sec-001", startNumber: 14, dancer1FirstName: "Stanislav",dancer1LastName: "Mareš",     dancer1Club: "SD Hradec",     dancer2FirstName: "Hana",      dancer2LastName: "Marešová",     dancer2Club: "SD Hradec",     registeredAt: "2026-01-22T10:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1014, athlete2Id: 2014, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-015", competitionId: "comp-001", sectionId: "sec-001", startNumber: 15, dancer1FirstName: "Zdeněk",  dancer1LastName: "Blažek",     dancer1Club: "DC Praha",      dancer2FirstName: "Petra",     dancer2LastName: "Blažková",     dancer2Club: "DC Praha",      registeredAt: "2026-01-23T11:00:00", paymentStatus: "PENDING", registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1015, athlete2Id: 2015, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-016", competitionId: "comp-001", sectionId: "sec-001", startNumber: 16, dancer1FirstName: "Miroslav", dancer1LastName: "Vlček",     dancer1Club: "TK Pardubice",  dancer2FirstName: "Jana",      dancer2LastName: "Vlčková",      dancer2Club: "TK Pardubice",  registeredAt: "2026-01-23T11:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1016, athlete2Id: 2016, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-017", competitionId: "comp-001", sectionId: "sec-001", startNumber: 17, dancer1FirstName: "Roman",   dancer1LastName: "Kraus",      dancer1Club: "SD Brno",       dancer2FirstName: "Martina",   dancer2LastName: "Krausová",     dancer2Club: "SD Brno",       registeredAt: "2026-01-24T12:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1017, athlete2Id: 2017, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-018", competitionId: "comp-001", sectionId: "sec-001", startNumber: 18, dancer1FirstName: "Ivo",     dancer1LastName: "Sedlák",     dancer1Club: "DC Ostrava",    dancer2FirstName: "Simona",    dancer2LastName: "Sedláková",    dancer2Club: "DC Ostrava",    registeredAt: "2026-01-24T12:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1018, athlete2Id: 2018, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  // sec-002: Youth Latin B — 14 párů
  { id: "pair-020", competitionId: "comp-001", sectionId: "sec-002", startNumber: 20, dancer1FirstName: "Michal",  dancer1LastName: "Varga",      dancer1Club: "LD Trnava",     dancer2FirstName: "Jana",      dancer2LastName: "Vargová",      dancer2Club: "LD Trnava",     registeredAt: "2026-01-15T10:30:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1020, athlete2Id: 2020, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "SVK" },
  { id: "pair-021", competitionId: "comp-001", sectionId: "sec-002", startNumber: 21, dancer1FirstName: "Filip",   dancer1LastName: "Oravec",     dancer1Club: "SD Žilina",     dancer2FirstName: "Petra",     dancer2LastName: "Oravecová",    dancer2Club: "SD Žilina",     registeredAt: "2026-01-15T10:30:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1021, athlete2Id: 2021, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-022", competitionId: "comp-001", sectionId: "sec-002", startNumber: 22, dancer1FirstName: "Tomáš",   dancer1LastName: "Ryba",       dancer1Club: "DC Praha",      dancer2FirstName: "Eliška",    dancer2LastName: "Rybová",       dancer2Club: "DC Praha",      registeredAt: "2026-01-16T09:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1022, athlete2Id: 2022, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-023", competitionId: "comp-001", sectionId: "sec-002", startNumber: 23, dancer1FirstName: "Adam",    dancer1LastName: "Horník",     dancer1Club: "TK Brno",       dancer2FirstName: "Nikola",    dancer2LastName: "Horníková",    dancer2Club: "TK Brno",       registeredAt: "2026-01-16T09:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1023, athlete2Id: 2023, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-024", competitionId: "comp-001", sectionId: "sec-002", startNumber: 24, dancer1FirstName: "Petr",    dancer1LastName: "Mašek",      dancer1Club: "SD Ostrava",    dancer2FirstName: "Barbora",   dancer2LastName: "Mašková",      dancer2Club: "SD Ostrava",    registeredAt: "2026-01-17T10:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1024, athlete2Id: 2024, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-025", competitionId: "comp-001", sectionId: "sec-002", startNumber: 25, dancer1FirstName: "David",   dancer1LastName: "Šebesta",    dancer1Club: "DC Zlín",       dancer2FirstName: "Karolína",  dancer2LastName: "Šebestová",    dancer2Club: "DC Zlín",       registeredAt: "2026-01-17T10:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1025, athlete2Id: 2025, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-026", competitionId: "comp-001", sectionId: "sec-002", startNumber: 26, dancer1FirstName: "Jakub",   dancer1LastName: "Pokorný",    dancer1Club: "TK Liberec",    dancer2FirstName: "Alžběta",   dancer2LastName: "Pokorná",      dancer2Club: "TK Liberec",    registeredAt: "2026-01-18T11:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1026, athlete2Id: 2026, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-027", competitionId: "comp-001", sectionId: "sec-002", startNumber: 27, dancer1FirstName: "Martin",  dancer1LastName: "Říha",       dancer1Club: "SD Plzeň",      dancer2FirstName: "Kristýna",  dancer2LastName: "Říhová",       dancer2Club: "SD Plzeň",      registeredAt: "2026-01-18T11:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1027, athlete2Id: 2027, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-028", competitionId: "comp-001", sectionId: "sec-002", startNumber: 28, dancer1FirstName: "Luboš",   dancer1LastName: "Krejčí",     dancer1Club: "DC Praha",      dancer2FirstName: "Denisa",    dancer2LastName: "Krejčová",     dancer2Club: "DC Praha",      registeredAt: "2026-01-19T08:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1028, athlete2Id: 2028, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-029", competitionId: "comp-001", sectionId: "sec-002", startNumber: 29, dancer1FirstName: "Patrik",  dancer1LastName: "Veselý",     dancer1Club: "TK Olomouc",    dancer2FirstName: "Markéta",   dancer2LastName: "Veselá",       dancer2Club: "TK Olomouc",    registeredAt: "2026-01-19T08:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1029, athlete2Id: 2029, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  // sec-003: Junior Standard C — 6 párů
  { id: "pair-030", competitionId: "comp-001", sectionId: "sec-003", startNumber: 30, dancer1FirstName: "Šimon",   dancer1LastName: "Horáček",    dancer1Club: "TD Junior Praha", dancer2FirstName: "Adéla",    dancer2LastName: "Horáčková",    dancer2Club: "TD Junior Praha", registeredAt: "2026-02-01T09:00:00", paymentStatus: "PAID",   registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1030, athlete2Id: 2030, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-031", competitionId: "comp-001", sectionId: "sec-003", startNumber: 31, dancer1FirstName: "Matěj",   dancer1LastName: "Beneš",      dancer1Club: "TD Brno",       dancer2FirstName: "Anežka",    dancer2LastName: "Benešová",     dancer2Club: "TD Brno",       registeredAt: "2026-02-02T09:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1031, athlete2Id: 2031, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-032", competitionId: "comp-001", sectionId: "sec-003", startNumber: 32, dancer1FirstName: "Dominik", dancer1LastName: "Král",       dancer1Club: "TK Ostrava",    dancer2FirstName: "Sofie",     dancer2LastName: "Králová",      dancer2Club: "TK Ostrava",    registeredAt: "2026-02-03T10:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1032, athlete2Id: 2032, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-033", competitionId: "comp-001", sectionId: "sec-003", startNumber: 33, dancer1FirstName: "Štěpán",  dancer1LastName: "Vrána",      dancer1Club: "SD Liberec",    dancer2FirstName: "Natálie",   dancer2LastName: "Vránová",      dancer2Club: "SD Liberec",    registeredAt: "2026-02-04T10:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1033, athlete2Id: 2033, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
  { id: "pair-034", competitionId: "comp-001", sectionId: "sec-003", startNumber: 34, dancer1FirstName: "Tomáš",   dancer1LastName: "Čech",       dancer1Club: "DC Praha",      dancer2FirstName: "Anna",      dancer2LastName: "Čechová",      dancer2Club: "DC Praha",      registeredAt: "2026-02-05T11:00:00", paymentStatus: "PAID",    registrationStatus: "CONFIRMED",   presenceStatus: "CHECKED_IN", athlete1Id: 1034, athlete2Id: 2034, withdrawalDate: null, presenceDeadline: "2026-03-21T09:00:00", finaleCount: null, points: null, ranklistPosition: null, country: "CZE" },
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
  { id: "slot-001", competitionId: "comp-001", sectionId: "sec-003", roundId: null, label: "Junior Standard C — Finále (6 párů)", startTime: "2026-04-15T09:00:00", durationMinutes: 15, orderIndex: 0, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 1 },
  { id: "slot-002", competitionId: "comp-001", sectionId: "sec-001", roundId: null, label: "Adult Standard A — Předkolo (18 párů)", startTime: "2026-04-15T09:15:00", durationMinutes: 20, orderIndex: 1, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 1 },
  { id: "slot-003", competitionId: "comp-001", sectionId: "sec-002", roundId: null, label: "Youth Latin B — Předkolo (14 párů)", startTime: "2026-04-15T09:35:00", durationMinutes: 15, orderIndex: 2, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 1 },
  { id: "slot-004", competitionId: "comp-001", sectionId: null, roundId: null, label: "Přestávka", startTime: "2026-04-15T09:50:00", durationMinutes: 15, orderIndex: 3, type: "BREAK", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: true, durationLocked: false, roundNumber: null },
  { id: "slot-005", competitionId: "comp-001", sectionId: "sec-001", roundId: null, label: "Adult Standard A — Semifinále (12 párů)", startTime: "2026-04-15T10:05:00", durationMinutes: 20, orderIndex: 4, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 2 },
  { id: "slot-006", competitionId: "comp-001", sectionId: "sec-001", roundId: null, label: "Adult Standard A — Finále (6 párů)", startTime: "2026-04-15T10:25:00", durationMinutes: 10, orderIndex: 5, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 3 },
  { id: "slot-009", competitionId: "comp-001", sectionId: null, roundId: null, label: "Pauza porotců", startTime: "2026-04-15T10:35:00", durationMinutes: 20, orderIndex: 6, type: "JUDGE_BREAK", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: true, durationLocked: false, roundNumber: null },
  { id: "slot-008", competitionId: "comp-001", sectionId: "sec-002", roundId: null, label: "Youth Latin B — Finále (6 párů)", startTime: "2026-04-15T10:55:00", durationMinutes: 10, orderIndex: 7, type: "ROUND", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: 2 },
  { id: "slot-007", competitionId: "comp-001", sectionId: null, roundId: null, label: "Vyhlášení výsledků", startTime: "2026-04-15T11:05:00", durationMinutes: 15, orderIndex: 8, type: "AWARD_CEREMONY", liveStatus: "NOT_STARTED", manuallyMoved: false, suggested: true, durationLocked: false, roundNumber: null },
];
