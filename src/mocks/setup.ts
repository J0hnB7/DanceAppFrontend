import MockAdapter from "axios-mock-adapter";
import apiClient from "@/lib/api-client";
import {
  mockUser,
  mockTokenResponse,
  competitions,
  sections,
  pairs,
  rounds,
  judgeTokens,
  checkinTokens,
  sectionResults,
  fees,
  discounts,
  notifications,
  scheduleSlots,
  news,
  type PresenceStatus,
} from "./db";

const STORAGE_KEY = "mock_competitions";
const SECTIONS_STORAGE_KEY = "mock_sections";
const PAIRS_STORAGE_KEY = "mock_pairs";
const NEWS_STORAGE_KEY = "mock_news";

function persistCompetitions() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(competitions)); } catch { /* ignore — Safari private mode */ }
  }
}

function restoreCompetitions() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const saved: typeof competitions = JSON.parse(stored);
    for (const c of saved) {
      const idx = competitions.findIndex((x) => x.id === c.id);
      if (idx !== -1) {
        competitions[idx] = { ...competitions[idx], ...c };
      } else {
        competitions.push(c);
      }
    }
  } catch {
    // ignore parse errors
  }
}

function persistSections() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(sections)); } catch { /* ignore — Safari private mode */ }
  }
}

function restoreSections() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
    if (!stored) return;
    const saved: typeof sections = JSON.parse(stored);
    for (const s of saved) {
      const idx = sections.findIndex((x) => x.id === s.id);
      if (idx !== -1) {
        sections[idx] = { ...sections[idx], ...s };
      } else {
        sections.push(s);
      }
    }
  } catch {
    // ignore parse errors
  }
}

function persistPairs() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(PAIRS_STORAGE_KEY, JSON.stringify(pairs)); } catch { /* ignore — Safari private mode */ }
  }
}

function restorePairs() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(PAIRS_STORAGE_KEY);
    if (!stored) return;
    const saved: typeof pairs = JSON.parse(stored);
    for (const p of saved) {
      if (!pairs.find((x) => x.id === p.id)) {
        pairs.push(p);
      }
    }
  } catch {
    // ignore parse errors
  }
}

function persistNews() {
  if (typeof window !== "undefined") {
    try { localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(news)); } catch { /* ignore — Safari private mode */ }
  }
}

function restoreNews() {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(NEWS_STORAGE_KEY);
    if (!stored) return;
    const saved: typeof news = JSON.parse(stored);
    for (const n of saved) {
      const idx = news.findIndex((x) => x.id === n.id);
      if (idx !== -1) {
        news[idx] = { ...news[idx], ...n };
      } else {
        news.push(n);
      }
    }
  } catch {
    // ignore parse errors
  }
}

export function setupMockApi() {
  restoreCompetitions();
  restoreSections();
  restorePairs();
  restoreNews();
  const mock = new MockAdapter(apiClient, { delayResponse: 150, onNoMatch: "throwException" });

  // localStorage-backed judge submission tracking: "roundId:dance" → Set of submitted judgeTokenIds
  // Key is per round+dance because a judge confirms ONCE for the entire dance (e.g. Waltz),
  // covering ALL groups/heats. 0 X marks in a group is a valid choice, not a missing submission.
  // Using localStorage so cross-tab mock state is shared (e.g. judge tab ↔ admin tab, same origin)
  const SUBMISSIONS_KEY = "mock_roundDanceSubmissions";
  function getSubmissions(): Record<string, string[]> {
    try { return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) ?? "{}"); } catch { return {}; }
  }
  function submissionKey(roundId: string, dance?: string): string {
    return dance ? `${roundId}:${dance}` : roundId;
  }
  function addSubmission(roundId: string, judgeTokenId: string, dance?: string) {
    const data = getSubmissions();
    const key = submissionKey(roundId, dance);
    if (!data[key]) data[key] = [];
    if (!data[key].includes(judgeTokenId)) data[key].push(judgeTokenId);
    try { localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(data)); } catch { /* ignore */ }
  }
  function isSubmitted(roundId: string, judgeTokenId: string, dance?: string): boolean {
    return (getSubmissions()[submissionKey(roundId, dance)] ?? []).includes(judgeTokenId);
  }

  // ── Auth ────────────────────────────────────────────────────────────────────
  mock.onPost("/auth/register").reply(201, mockTokenResponse);
  mock.onPost("/auth/login").reply(200, mockTokenResponse);
  mock.onPost("/auth/refresh").reply(200, mockTokenResponse);
  mock.onPost("/auth/logout").reply(204);
  mock.onGet("/auth/me").reply(200, mockUser);
  mock.onPost("/auth/verify-email").reply(200, {});
  mock.onPost("/auth/resend-verification").reply(200, {});
  mock.onPost("/auth/forgot-password").reply(200, {});
  mock.onPost("/auth/reset-password").reply(200, {});
  mock.onPost("/auth/2fa/setup").reply(200, { secret: "MOCK2FASECRET", qrCode: "data:image/png;base64,mock" });
  mock.onPost("/auth/2fa/confirm").reply(200, {});
  mock.onPost("/auth/2fa/disable").reply(200, {});

  // ── Competitions ────────────────────────────────────────────────────────────
  mock.onGet("/competitions").reply(() => {
    const summaries = competitions.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug ?? c.id,
      status: c.status,
      eventDate: c.eventDate,
      sectionCount: sections.filter((s) => s.competitionId === c.id).length,
      pairCount: pairs.filter((p) => p.competitionId === c.id).length,
      registrationOpen: c.registrationOpen,
    }));
    return [200, summaries];
  });

  mock.onGet(/\/competitions\/[^/]+$/).reply((config) => {
    const id = config.url!.split("/").pop();
    const comp = competitions.find((c) => c.id === id);
    if (!comp) return [404, {}];
    return [200, { ...comp, registeredPairsCount: pairs.filter((p) => p.competitionId === id).length }];
  });

  mock.onPost("/competitions").reply((config) => {
    const data = JSON.parse(config.data);
    const comp = { id: `comp-${Date.now()}`, slug: `comp-${Date.now()}`, ...data, status: "DRAFT", registrationOpen: false, organizerId: mockUser.id };
    competitions.push(comp as typeof competitions[0]);
    persistCompetitions();
    return [201, comp];
  });

  mock.onPut(/\/competitions\/[^/]+$/).reply((config) => {
    const id = config.url!.split("/").pop();
    const idx = competitions.findIndex((c) => c.id === id);
    if (idx === -1) return [404, {}];
    competitions[idx] = { ...competitions[idx], ...JSON.parse(config.data) };
    persistCompetitions();
    return [200, competitions[idx]];
  });

  mock.onPost(/\/competitions\/[^/]+\/publish/).reply((config) => {
    const id = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const comp = competitions.find((c) => c.id === id);
    if (!comp) return [404, {}];
    comp.status = "PUBLISHED";
    persistCompetitions();
    return [200, comp];
  });

  // POST /competitions/:id/start — launches competition (PUBLISHED → IN_PROGRESS)
  mock.onPost(/\/competitions\/[^/]+\/start$/).reply((config) => {
    const id = config.url!.match(/\/competitions\/([^/]+)\/start/)?.[1];
    const comp = competitions.find((c) => c.id === id);
    if (!comp) return [404, { message: "Competition not found" }];
    if (comp.status !== "PUBLISHED") return [409, { message: "Competition must be PUBLISHED to start" }];
    comp.status = "IN_PROGRESS";
    persistCompetitions();
    return [204];
  });

  // POST /competitions/:id/cancel-start — reverts competition to PUBLISHED
  mock.onPost(/\/competitions\/[^/]+\/cancel-start$/).reply((config) => {
    const id = config.url!.match(/\/competitions\/([^/]+)\/cancel-start/)?.[1];
    const comp = competitions.find((c) => c.id === id);
    if (!comp) return [404, { message: "Competition not found" }];
    if (comp.status !== "IN_PROGRESS") return [409, { message: "Competition must be IN_PROGRESS to cancel start" }];
    comp.status = "PUBLISHED";
    persistCompetitions();
    return [204];
  });

  // PATCH /competitions/:id/schedule-config — updates dance config fields on the competition
  mock.onPatch(/\/competitions\/[^/]+\/schedule-config$/).reply((config) => {
    const id = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const idx = competitions.findIndex((c) => c.id === id);
    if (idx < 0) return [404];
    const update = JSON.parse(config.data ?? "{}");
    competitions[idx] = { ...competitions[idx], ...update };
    persistCompetitions();
    return [200, competitions[idx]];
  });


  mock.onDelete(/\/competitions\/[^/]+$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)$/)?.[1];
    if (compId) {
      const idx = competitions.findIndex((c) => c.id === compId);
      if (idx !== -1) competitions.splice(idx, 1);
      persistCompetitions();
    }
    return [204];
  });

  // Also handle the /pairs/public-registration path used by the backend
  mock.onPost(/\/competitions\/[^/]+\/pairs\/public-registration$/).reply((config) => {
    const id = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const comp = competitions.find((c) => c.id === id);
    if (!comp) return [404, { message: "Competition not found" }];
    const data = JSON.parse(config.data);
    const section = sections.find((s) => s.id === data.sectionId);
    const pair: typeof pairs[number] = {
      id: `pair-${Date.now()}`,
      competitionId: id,
      sectionId: data.sectionId,
      startNumber: pairs.filter((p) => p.competitionId === id).length + 1,
      dancer1FirstName: data.dancer1FirstName,
      dancer1LastName: data.dancer1LastName,
      dancer1Club: data.dancer1Club,
      dancer2FirstName: data.dancer2FirstName,
      dancer2LastName: data.dancer2LastName,
      dancer2Club: data.dancer2Club,
      registeredAt: new Date().toISOString(),
      paymentStatus: "PENDING",
      registrationStatus: "UNCONFIRMED",
      presenceStatus: "ABSENT",
    };
    pairs.push(pair);
    persistPairs();
    return [201, {
      pairId: pair.id,
      startNumber: pair.startNumber,
      sectionName: section?.name ?? "Unknown",
      amountDue: 40,
      currency: "EUR",
    }];
  });

  mock.onPost(/\/competitions\/[^/]+\/public-registration$/).reply((config) => {
    const id = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const comp = competitions.find((c) => c.id === id);
    if (!comp) return [404, { message: "Competition not found" }];
    const data = JSON.parse(config.data);
    const section = sections.find((s) => s.id === data.sectionId);
    const pair: typeof pairs[number] = {
      id: `pair-${Date.now()}`,
      competitionId: id,
      sectionId: data.sectionId,
      startNumber: pairs.filter((p) => p.competitionId === id).length + 1,
      dancer1FirstName: data.dancer1FirstName,
      dancer1LastName: data.dancer1LastName,
      dancer1Club: data.dancer1Club,
      dancer2FirstName: data.dancer2FirstName,
      dancer2LastName: data.dancer2LastName,
      dancer2Club: data.dancer2Club,
      registeredAt: new Date().toISOString(),
      paymentStatus: "PENDING",
      registrationStatus: "UNCONFIRMED",
      presenceStatus: "ABSENT",
    };
    pairs.push(pair);
    persistPairs();
    persistCompetitions();
    return [201, {
      pairId: pair.id,
      startNumber: pair.startNumber,
      sectionName: section?.name ?? "Unknown",
      amountDue: 40,
      currency: "EUR",
    }];
  });

  // ── Sections ────────────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/sections$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    return [200, sections.filter((s) => s.competitionId === compId)];
  });

  mock.onGet(/\/competitions\/[^/]+\/sections\/[^/]+$/).reply((config) => {
    const parts = config.url!.split("/");
    const sec = sections.find((s) => s.id === parts[4]);
    return sec ? [200, sec] : [404, {}];
  });

  mock.onPost(/\/competitions\/[^/]+\/sections$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const data = JSON.parse(config.data);
    const sec = { id: `sec-${Date.now()}`, competitionId: compId, dances: [], registeredPairsCount: 0, ...data, status: "ACTIVE" } as typeof sections[number];
    sections.push(sec);
    persistSections();
    return [201, sec];
  });

  mock.onPut(/\/competitions\/[^/]+\/sections\/[^/]+$/).reply((config) => {
    const parts = config.url!.split("/");
    const idx = sections.findIndex((s) => s.id === parts[4]);
    if (idx === -1) return [404, {}];
    sections[idx] = { ...sections[idx], ...JSON.parse(config.data) };
    persistSections();
    return [200, sections[idx]];
  });

  mock.onDelete(/\/competitions\/[^/]+\/sections\/[^/]+$/).reply((config) => {
    const parts = config.url!.split("/");
    const idx = sections.findIndex((s) => s.id === parts[4]);
    if (idx !== -1) sections.splice(idx, 1);
    persistSections();
    return [204];
  });

  mock.onPatch(/\/competitions\/[^/]+\/sections\/[^/]+\/dances$/).reply((config) => {
    const sectionId = config.url!.match(/\/sections\/([^/]+)\/dances/)?.[1];
    const idx = sections.findIndex((s) => s.id === sectionId);
    if (idx === -1) return [404, {}];
    const { dances } = JSON.parse(config.data) as { dances: string[] };
    sections[idx] = {
      ...sections[idx],
      dances: dances.map((name, i) => ({ id: `dance-${Date.now()}-${i}`, danceName: name, danceOrder: i })),
    };
    persistSections();
    return [200, sections[idx]];
  });

  // ── Pairs ───────────────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/pairs$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const sectionId = config.params?.sectionId;
    const filtered = pairs.filter((p) => p.competitionId === compId && (!sectionId || p.sectionId === sectionId));
    return [200, filtered];
  });

  mock.onPost(/\/competitions\/[^/]+\/pairs\/batch-import$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const items: Record<string, unknown>[] = JSON.parse(config.data);
    const created: unknown[] = [];
    let start = pairs.filter((p) => p.competitionId === compId).length + 1;
    for (const data of items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pair: any = { id: `pair-${Date.now()}-${start}`, competitionId: compId, startNumber: start++, registeredAt: new Date().toISOString(), paymentStatus: "PENDING", registrationStatus: "UNCONFIRMED", presenceStatus: "ABSENT", ...data };
      pairs.push(pair);
      created.push(pair);
    }
    persistPairs();
    return [201, { imported: created.length, errors: [] }];
  });

  mock.onPost(/\/competitions\/[^/]+\/pairs$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const data = JSON.parse(config.data);
    const pair = { id: `pair-${Date.now()}`, competitionId: compId, startNumber: pairs.filter((p) => p.competitionId === compId).length + 1, registeredAt: new Date().toISOString(), paymentStatus: data.markAsPaid ? "PAID" : "PENDING", registrationStatus: data.markAsPaid ? "CONFIRMED" : "UNCONFIRMED", presenceStatus: "ABSENT" as const, ...data } satisfies typeof pairs[number];
    pairs.push(pair);
    persistPairs();
    return [201, pair];
  });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+$/).reply((config) => {
    const parts = config.url!.split("/");
    const idx = pairs.findIndex((p) => p.id === parts[4]);
    if (idx === -1) return [404, {}];
    pairs[idx] = { ...pairs[idx], ...JSON.parse(config.data) };
    persistPairs();
    return [200, pairs[idx]];
  });

  mock.onDelete(/\/competitions\/[^/]+\/pairs\/[^/]+$/).reply((config) => {
    const parts = config.url!.split("/");
    const idx = pairs.findIndex((p) => p.id === parts[4]);
    if (idx !== -1) pairs.splice(idx, 1);
    persistPairs();
    return [204];
  });

  mock.onPost(/\/competitions\/[^/]+\/pairs\/import$/).reply(200, { imported: 3, errors: [] });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+\/registration-status$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/registration-status/);
    const pairId = match?.[1];
    const { status } = JSON.parse(config.data);
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.registrationStatus = status;
    if (status === "CONFIRMED") pair.paymentStatus = "PAID";
    if (status === "UNCONFIRMED") pair.paymentStatus = "PENDING";
    persistPairs();
    return [200, pair];
  });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+\/payment$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/payment/);
    const pairId = match?.[1];
    const { paid } = JSON.parse(config.data);
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.paymentStatus = paid ? "PAID" : "PENDING";
    persistPairs();
    return [204, null];
  });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+\/payment-status$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/payment-status/);
    const pairId = match?.[1];
    const { status } = JSON.parse(config.data);
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.paymentStatus = status;
    persistPairs();
    return [204, null];
  });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+\/note$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/note/);
    const pairId = match?.[1];
    const { note } = JSON.parse(config.data);
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.adminNote = note;
    persistPairs();
    return [200, pair];
  });

  mock.onPost(/\/competitions\/[^/]+\/pairs\/[^/]+\/contact-email$/).reply(200, { sent: true });

  mock.onGet(/\/competitions\/[^/]+\/check-conflicts$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const comp = competitions.find((c) => c.id === compId);
    if (!comp) return [404, {}];
    // Simulate no conflict in mock
    return [200, { hasConflict: false, conflictingCompetition: null }];
  });

  // ── Rounds ──────────────────────────────────────────────────────────────────
  // GET /competitions/:id/sections/:sectionId/rounds — used by live page to resolve activeRoundId
  // Must be registered BEFORE the shorter pattern to prevent the shorter regex from matching this URL
  mock.onGet(/\/competitions\/[^/]+\/sections\/[^/]+\/rounds$/).reply((config) => {
    const parts = config.url!.split("/");
    const sectionId = parts[4];
    return [200, rounds.filter((r) => r.sectionId === sectionId)];
  });

  // GET /sections/:sectionId/rounds — shorter path (anchored to avoid matching the longer URL above)
  mock.onGet(/^\/sections\/[^/]+\/rounds$/).reply((config) => {
    const sectionId = config.url!.split("/")[2];
    return [200, rounds.filter((r) => r.sectionId === sectionId)];
  });

  // GET /rounds/:roundId/heats — used by live page to build heatIdMap (synthetic→real UUID)
  mock.onGet(/\/rounds\/[^/]+\/heats$/).reply((config) => {
    const roundId = config.url!.split("/")[2];
    // Return 2 heats — IDs encode roundId so judge-statuses can map back to roundSubmissions
    return [200, [
      { id: `${roundId}-h1`, heatNumber: 1, status: "PENDING" },
      { id: `${roundId}-h2`, heatNumber: 2, status: "PENDING" },
    ]];
  });

  mock.onGet(/\/rounds\/[^/]+$/).reply((config) => {
    const id = config.url!.split("/").pop();
    const r = rounds.find((r) => r.id === id);
    return r ? [200, r] : [404, {}];
  });

  mock.onPost(/\/sections\/[^/]+\/rounds$/).reply((config) => {
    const sectionId = config.url!.split("/")[2];
    const data = JSON.parse(config.data);
    const round = { id: `round-${Date.now()}`, sectionId, status: "OPEN", roundNumber: rounds.length + 1, startedAt: null, closedAt: null, ...data };
    rounds.push(round);
    return [201, round];
  });

  mock.onPost(/\/rounds\/[^/]+\/open/).reply((config) => {
    const id = config.url!.split("/")[2];
    const r = rounds.find((r) => r.id === id);
    if (r) { r.status = "OPEN"; r.startedAt = new Date().toISOString(); }
    return [200, r ?? {}];
  });

  mock.onPost(/\/rounds\/[^/]+\/start/).reply((config) => {
    const id = config.url!.split("/")[2];
    const r = rounds.find((r) => r.id === id);
    if (r) { r.status = "IN_PROGRESS"; r.startedAt = new Date().toISOString(); }
    return [200, r ?? {}];
  });

  mock.onPost(/\/rounds\/[^/]+\/close/).reply((config) => {
    const id = config.url!.split("/")[2];
    const r = rounds.find((r) => r.id === id);
    if (r) { r.status = "CLOSED"; r.closedAt = new Date().toISOString(); }
    return [200, r ?? {}];
  });

  // ── Judge tokens ─────────────────────────────────────────────────────────────

  // Shared helper: get active judge tokens for a competition (real or fallback)
  function getActiveJudgesForCompetition(compId: string) {
    const tokens = judgeTokens.filter((j) => j.competitionId === compId && j.active);
    if (tokens.length > 0) return tokens;
    // Fallback: 5 sample judges for any unknown competition — stable IDs per competition
    return [
      { id: `${compId}-jt-1`, competitionId: compId, judgeNumber: 1, token: "T1", rawToken: "T1", active: true, pin: "1111", role: "JUDGE", name: "P. Novák", connected: true },
      { id: `${compId}-jt-2`, competitionId: compId, judgeNumber: 2, token: "T2", rawToken: "T2", active: true, pin: "2222", role: "JUDGE", name: "J. Procházková", connected: true },
      { id: `${compId}-jt-3`, competitionId: compId, judgeNumber: 3, token: "T3", rawToken: "T3", active: true, pin: "3333", role: "JUDGE", name: "T. Dvořák", connected: true },
      { id: `${compId}-jt-4`, competitionId: compId, judgeNumber: 4, token: "T4", rawToken: "T4", active: true, pin: "4444", role: "JUDGE", name: "M. Horáková", connected: false },
      { id: `${compId}-jt-5`, competitionId: compId, judgeNumber: 5, token: "T5", rawToken: "T5", active: true, pin: "5555", role: "JUDGE", name: "J. Krejčí", connected: true },
    ];
  }

  mock.onGet(/\/competitions\/[^/]+\/judge-tokens$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    const tokens = judgeTokens.filter((j) => j.competitionId === compId);
    if (tokens.length > 0) return [200, tokens];
    return [200, getActiveJudgesForCompetition(compId)];
  });

  mock.onPost(/\/competitions\/[^/]+\/judge-tokens$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    const reqBody = JSON.parse(config.data ?? "{}");
    const existing = judgeTokens.filter((j) => j.competitionId === compId);
    const num = reqBody.judgeNumber ?? (existing.length + 1);
    const rawToken = `judge-${compId}-${num}-${Date.now()}`;
    const entry = { id: `jt-${Date.now()}-${num}`, competitionId: compId, judgeNumber: num, token: rawToken, rawToken, active: true, pin: String(Math.floor(100000 + Math.random() * 900000)), role: reqBody.role ?? "JUDGE" };
    judgeTokens.push(entry);
    return [201, entry];
  });

  // Permanent delete — removes token from array entirely
  mock.onDelete(/\/competitions\/[^/]+\/judge-tokens\/[^/]+\/permanent$/).reply((config) => {
    const parts = config.url!.split("/");
    const tokenId = parts[parts.length - 2];
    const idx = judgeTokens.findIndex((j) => j.id === tokenId);
    if (idx !== -1) judgeTokens.splice(idx, 1);
    return [204];
  });

  // Revoke token (soft delete — sets active=false)
  mock.onDelete(/\/competitions\/[^/]+\/judge-tokens\/[^/]+$/).reply((config) => {
    const tokenId = config.url!.split("/").pop();
    const tok = judgeTokens.find((j) => j.id === tokenId);
    if (tok) (tok as Record<string, unknown>).active = false;
    return [204];
  });

  mock.onPut(/\/competitions\/[^/]+\/judge-tokens\/[^/]+$/).reply((config) => {
    const tokenId = config.url!.split("/").pop();
    const { name, country } = JSON.parse(config.data ?? "{}");
    const tok = judgeTokens.find((j) => j.id === tokenId);
    if (!tok) return [404];
    if (name !== undefined) (tok as Record<string, unknown>).name = name;
    if (country !== undefined) (tok as Record<string, unknown>).country = country;
    return [200, tok];
  });

  // ── Scoring ─────────────────────────────────────────────────────────────────
  mock.onPost(/\/rounds\/[^/]+\/callbacks/).reply((config) => {
    // Judge confirms once per dance — track by roundId:dance
    const roundId = config.url!.split("/")[2];
    const params = config.params as Record<string, string> | undefined;
    const judgeTokenId = params?.judgeTokenId;
    const dance = params?.dance ?? (typeof config.data === "string" ? JSON.parse(config.data)?.dance : config.data?.dance);
    if (roundId && judgeTokenId) {
      addSubmission(roundId, judgeTokenId, dance);
    }
    return [204];
  });
  mock.onPut(/\/rounds\/[^/]+\/callbacks/).reply(204);
  mock.onGet(/\/rounds\/[^/]+\/callbacks/).reply((config) => {
    const judgeTokenId = (config.params as Record<string, string> | undefined)?.judgeTokenId ?? "";
    // Return different subsets of pair IDs per judge for demo purposes
    const allPairs = ["p1", "p2", "p3", "p4"];
    // Deterministically vary which pairs each judge selected based on their ID suffix
    const suffix = judgeTokenId.slice(-1);
    const selected = suffix === "1" ? ["p1", "p2", "p4"]
                   : suffix === "2" ? ["p1", "p3"]
                   : suffix === "3" ? ["p1", "p2", "p3", "p4"]
                   : suffix === "4" ? ["p2", "p4"]
                   : allPairs;
    return [200, selected];
  });

  mock.onPost(/\/rounds\/[^/]+\/placements\//).reply(204);
  mock.onGet(/\/rounds\/[^/]+\/placements\//).reply(200, { pairPlacements: {} });

  mock.onGet(/\/rounds\/[^/]+\/submission-status/).reply(200, {
    totalJudges: 5,
    submitted: 3,
    judges: [
      { judgeTokenId: "jt-001", judgeNumber: 1, submitted: true, submittedAt: "2026-04-15T10:30:00" },
      { judgeTokenId: "jt-002", judgeNumber: 2, submitted: false, submittedAt: null },
      { judgeTokenId: "jt-003", judgeNumber: 3, submitted: true, submittedAt: "2026-04-15T10:32:00" },
      { judgeTokenId: "jt-004", judgeNumber: 4, submitted: true, submittedAt: "2026-04-15T10:28:00" },
      { judgeTokenId: "jt-005", judgeNumber: 5, submitted: false, submittedAt: null },
    ],
  });

  mock.onPost(/\/rounds\/[^/]+\/calculate/).reply((config) => {
    const roundId = config.url!.split("/")[2];
    const r = rounds.find((r) => r.id === roundId);
    if (r) { r.status = "CALCULATED"; }
    return [200, {
      pairsToAdvance: 4,
      pairs: [
        { pairId: "p1", startNumber: 12, dancer1Name: "Novák & Nováková", voteCount: 14, advances: true },
        { pairId: "p2", startNumber: 24, dancer1Name: "Svoboda & Svobodová", voteCount: 11, advances: true },
        { pairId: "p3", startNumber: 36, dancer1Name: "Dvořák & Dvořáková", voteCount: 10, advances: true },
        { pairId: "p4", startNumber: 48, dancer1Name: "Krejčí & Krejčová", voteCount: 9, advances: true },
        { pairId: "p5", startNumber: 60, dancer1Name: "Horák & Horáková", voteCount: 5, advances: false },
        { pairId: "p6", startNumber: 72, dancer1Name: "Novotný & Novotná", voteCount: 3, advances: false },
      ],
      tieAtBoundary: false,
      tiedPairsAtBoundary: [],
      nextRoundId: "round-next-001",
      advancedPairIds: ["p1", "p2", "p3", "p4"],
    }];
  });
  mock.onGet(/\/rounds\/[^/]+\/results/).reply(200, {
    pairsToAdvance: 4,
    pairs: [
      { pairId: "p1", startNumber: 12, dancer1Name: "Novák & Nováková", voteCount: 14, advances: true },
      { pairId: "p2", startNumber: 24, dancer1Name: "Svoboda & Svobodová", voteCount: 11, advances: true },
      { pairId: "p3", startNumber: 36, dancer1Name: "Dvořák & Dvořáková", voteCount: 10, advances: true },
      { pairId: "p4", startNumber: 48, dancer1Name: "Krejčí & Krejčová", voteCount: 9, advances: true },
      { pairId: "p5", startNumber: 60, dancer1Name: "Horák & Horáková", voteCount: 5, advances: false },
      { pairId: "p6", startNumber: 72, dancer1Name: "Novotný & Novotná", voteCount: 3, advances: false },
    ],
    tieAtBoundary: false,
    tiedPairsAtBoundary: [],
    nextRoundId: "round-next-001",
    advancedPairIds: ["p1", "p2", "p3", "p4"],
  });

  // Preliminary round results with per-judge marks (Skating visualization)
  mock.onGet(/\/rounds\/[^/]+\/preliminary/).reply(200, {
    pairs: [
      { pairId: "p1", startNumber: 12, dancer1Name: "Novák & Nováková", voteCount: 5, advances: true,
        judgeMarks: [
          { letter: "A", voted: true }, { letter: "B", voted: true }, { letter: "C", voted: false },
          { letter: "D", voted: true }, { letter: "E", voted: true }, { letter: "F", voted: true }, { letter: "G", voted: false },
        ] },
      { pairId: "p2", startNumber: 24, dancer1Name: "Svoboda & Svobodová", voteCount: 4, advances: true,
        judgeMarks: [
          { letter: "A", voted: true }, { letter: "B", voted: false }, { letter: "C", voted: true },
          { letter: "D", voted: true }, { letter: "E", voted: false }, { letter: "F", voted: true }, { letter: "G", voted: true },
        ] },
      { pairId: "p3", startNumber: 36, dancer1Name: "Dvořák & Dvořáková", voteCount: 2, advances: false,
        judgeMarks: [
          { letter: "A", voted: false }, { letter: "B", voted: true }, { letter: "C", voted: false },
          { letter: "D", voted: false }, { letter: "E", voted: false }, { letter: "F", voted: true }, { letter: "G", voted: false },
        ] },
      { pairId: "p4", startNumber: 48, dancer1Name: "Krejčí & Krejčová", voteCount: 6, advances: true,
        judgeMarks: [
          { letter: "A", voted: true }, { letter: "B", voted: true }, { letter: "C", voted: true },
          { letter: "D", voted: true }, { letter: "E", voted: false }, { letter: "F", voted: true }, { letter: "G", voted: true },
        ] },
    ],
  });

  mock.onGet(/\/sections\/[^/]+\/final-summary$/).reply((config) => {
    const sectionId = config.url!.split("/")[2];
    const result = sectionResults[sectionId as keyof typeof sectionResults];
    return result ? [200, result] : [404, {}];
  });

  mock.onPost(/\/sections\/[^/]+\/final-summary\/calculate/).reply((config) => {
    const sectionId = config.url!.split("/")[2];
    const result = sectionResults[sectionId as keyof typeof sectionResults] ?? { sectionId, rankings: [] };
    return [200, result];
  });

  mock.onPost(/\/sections\/[^/]+\/results\/approve/).reply(204);

  // ── Fees & Discounts ─────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/fees$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, fees.filter((f) => f.competitionId === compId)];
  });

  mock.onPost(/\/competitions\/[^/]+\/fees$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    const data = JSON.parse(config.data);
    const fee = { id: `fee-${Date.now()}`, competitionId: compId, currency: "EUR", ...data } as typeof fees[number];
    fees.push(fee);
    return [201, fee];
  });

  mock.onDelete(/\/competitions\/[^/]+\/fees\/[^/]+$/).reply(204);

  // ── Budget & Expenses ─────────────────────────────────────────────────────
  const mockExpenses: { id: string; competitionId: string; name: string; category: string; amount: number; currency: string; note?: string }[] = [
    { id: "exp-1", competitionId: "comp-1", name: "Pronájem sálu", category: "VENUE", amount: 5000, currency: "CZK", note: "Sokolovna Praha 6" },
    { id: "exp-2", competitionId: "comp-1", name: "DJ Marek", category: "DJ", amount: 2500, currency: "CZK" },
    { id: "exp-3", competitionId: "comp-1", name: "Sčitatelé (3×)", category: "SCORER", amount: 1200, currency: "CZK" },
    { id: "exp-4", competitionId: "comp-1", name: "Tisk startovních čísel", category: "PRINTING", amount: 500, currency: "CZK" },
  ];

  mock.onGet(/\/competitions\/[^/]+\/budget$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)\/budget/)?.[1];
    const expenses = mockExpenses.filter((e) => e.competitionId === compId);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const paidRevenue = 12500;
    const pendingRevenue = 4800;
    return [200, {
      paidRevenue,
      pendingRevenue,
      totalExpenses,
      netProfit: paidRevenue - totalExpenses,
      projectedProfit: paidRevenue + pendingRevenue - totalExpenses,
      currency: "CZK",
      expenses,
    }];
  });

  mock.onPost(/\/competitions\/[^/]+\/expenses$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)\/expenses/)?.[1];
    const data = JSON.parse(config.data);
    const expense = { id: `exp-${Date.now()}`, competitionId: compId, ...data };
    mockExpenses.push(expense);
    return [201, expense];
  });

  mock.onPut(/\/competitions\/[^/]+\/expenses\/[^/]+$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/([^/]+)\/expenses\/([^/]+)/);
    const expenseId = match?.[2];
    const data = JSON.parse(config.data);
    const idx = mockExpenses.findIndex((e) => e.id === expenseId);
    if (idx !== -1) Object.assign(mockExpenses[idx], data);
    return [200, mockExpenses[idx] ?? data];
  });

  mock.onDelete(/\/competitions\/[^/]+\/expenses\/[^/]+$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/([^/]+)\/expenses\/([^/]+)/);
    const expenseId = match?.[2];
    const idx = mockExpenses.findIndex((e) => e.id === expenseId);
    if (idx !== -1) mockExpenses.splice(idx, 1);
    return [204];
  });

  mock.onGet(/\/competitions\/[^/]+\/discounts$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, discounts.filter((d) => d.competitionId === compId)];
  });

  mock.onPost(/\/competitions\/[^/]+\/discounts$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    const data = JSON.parse(config.data);
    const disc = { id: `disc-${Date.now()}`, competitionId: compId, usedCount: 0, active: true, ...data } as typeof discounts[number];
    discounts.push(disc);
    return [201, disc];
  });

  // ── Notifications ────────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/notifications$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, notifications.filter((n) => n.competitionId === compId)];
  });

  mock.onPost(/\/competitions\/[^/]+\/notifications$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const data = JSON.parse(config.data);
    const recipientCount = data.recipientType === "ALL_PAIRS"
      ? pairs.filter((p) => p.competitionId === compId && p.email).length
      : data.recipientType === "INDIVIDUAL" ? 1 : pairs.filter((p) => p.competitionId === compId && p.sectionId === data.sectionId && p.email).length;
    const notif = {
      id: `notif-${Date.now()}`,
      competitionId: compId,
      subject: data.subject,
      body: data.body,
      recipientType: data.recipientType,
      sectionId: data.sectionId,
      recipientEmail: data.recipientEmail,
      status: "SENT" as const,
      sentAt: new Date().toISOString(),
      recipientCount,
    };
    notifications.push(notif as unknown as typeof notifications[number]);
    return [200, notif];
  });

  // ── News (Aktuality) ─────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/news$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)\/news/)?.[1];
    return [200, news.filter((n) => n.competitionId === compId).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )];
  });

  mock.onPost(/\/competitions\/[^/]+\/news$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)\/news/)?.[1];
    const data = JSON.parse(config.data);
    const item = { id: `news-${Date.now()}`, competitionId: compId, publishedAt: new Date().toISOString(), ...data } as typeof news[number];
    news.push(item);
    persistNews();
    return [201, item];
  });

  mock.onDelete(/\/competitions\/[^/]+\/news\/[^/]+$/).reply((config) => {
    const newsId = config.url!.match(/\/news\/([^/]+)$/)?.[1];
    const idx = news.findIndex((n) => n.id === newsId);
    if (idx !== -1) news.splice(idx, 1);
    persistNews();
    return [204];
  });

  // ── Schedule ─────────────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/schedule\/status$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    const hasSlots = scheduleSlots.some((s) => s.competitionId === compId);
    if (!hasSlots) return [404];
    return [200, { id: `sched-${compId}`, status: "DRAFT", publishedAt: null, version: 1 }];
  });

  mock.onPost(/\/competitions\/[^/]+\/floor-control$/).passThrough();

  mock.onPost(/\/competitions\/[^/]+\/schedule\/generate$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, scheduleSlots.filter((s) => s.competitionId === compId)];
  });

  mock.onPost(/\/competitions\/[^/]+\/schedule\/publish$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, { id: `sched-${compId}`, status: "PUBLISHED", publishedAt: new Date().toISOString(), version: 1 }];
  });

  mock.onGet(/\/competitions\/[^/]+\/schedule$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, scheduleSlots.filter((s) => s.competitionId === compId)];
  });

  // DELETE slot: /competitions/:id/schedule/slots/:slotId
  mock.onDelete(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 1];
    const idx = scheduleSlots.findIndex((s) => s.id === slotId);
    if (idx >= 0) scheduleSlots.splice(idx, 1);
    return [204];
  });

  mock.onDelete(/\/competitions\/[^/]+\/schedule\/[^/]+$/).reply(204);

  // ── Heat Assignments ──────────────────────────────────────────────────────────
  // GET  /competitions/:id/schedule/slots/:slotId/heat-assignments
  // POST /competitions/:id/schedule/slots/:slotId/draw-heats  (re-draw)
  function buildHeatAssignments(slotId: string) {
    const slot = scheduleSlots.find((s) => s.id === slotId);
    if (!slot || slot.type !== "ROUND") return null;

    const sectionPairs = pairs.filter(
      (p) => p.sectionId === slot.sectionId && p.presenceStatus !== "ABSENT"
    );

    // Parse pair count from label "(X párů)" — fall back to actual pairs
    const labelMatch = slot.label.match(/\((\d+)\s*párů?\)/i);
    const targetCount = labelMatch ? parseInt(labelMatch[1]) : sectionPairs.length;

    // Build entry list: real pairs first, then placeholders for the rest
    const entries = sectionPairs.slice(0, targetCount).map((p) => ({
      pairId: p.id,
      startNumber: p.startNumber,
      dancer1: `${p.dancer1LastName} ${p.dancer1FirstName}`,
      dancer2: `${p.dancer2LastName} ${p.dancer2FirstName}`,
      club: p.dancer1Club ?? "",
    }));
    // Fill up to targetCount with placeholders (start numbers continue)
    const lastNum = entries.length > 0 ? entries[entries.length - 1].startNumber : 0;
    for (let i = entries.length; i < targetCount; i++) {
      entries.push({
        pairId: `placeholder-${slotId}-${i}`,
        startNumber: lastNum + (i - entries.length + 1),
        dancer1: `Příjmení ${lastNum + i}`,
        dancer2: `Příjmení ${lastNum + i + 100}`,
        club: "—",
      });
    }

    // Shuffle (seeded by slotId so result is stable across reloads)
    const seed = slotId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const shuffled = [...entries].sort((a, b) => {
      const ha = (a.startNumber * 2654435761 + seed) % 1000;
      const hb = (b.startNumber * 2654435761 + seed) % 1000;
      return ha - hb;
    });

    // maxPairsOnFloor from competition (default 8)
    const comp = competitions.find((c) =>
      scheduleSlots.find((s) => s.id === slotId && s.competitionId === c.id)
    );
    const max = (comp as { maxPairsOnFloor?: number })?.maxPairsOnFloor ?? 8;
    const heatCount = Math.max(1, Math.ceil(shuffled.length / max));

    const heats: { heatNumber: number; pairs: typeof entries }[] = Array.from(
      { length: heatCount },
      (_, i) => ({ heatNumber: i + 1, pairs: [] })
    );
    shuffled.forEach((p, i) => heats[i % heatCount].pairs.push(p));

    return heats;
  }

  mock.onGet(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+\/heat-assignments$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 2]; // …/slots/:slotId/heat-assignments
    const result = buildHeatAssignments(slotId);
    return result ? [200, result] : [404];
  });

  mock.onPost(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+\/draw-heats$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 2];
    const result = buildHeatAssignments(slotId);
    return result ? [200, result] : [404];
  });

  // ── Slot lifecycle actions (activate / complete / revert / assign-advancing-pairs) ───
  mock.onPost(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+\/activate$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 2];
    const slot = scheduleSlots.find((s) => s.id === slotId);
    if (!slot) return [404, { message: "Slot not found" }];
    slot.liveStatus = "RUNNING";
    return [200, slot];
  });

  mock.onPost(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+\/complete$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 2];
    const slot = scheduleSlots.find((s) => s.id === slotId);
    if (!slot) return [404, { message: "Slot not found" }];
    slot.liveStatus = "COMPLETED";
    return [200, slot];
  });

  mock.onPost(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+\/revert$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 2];
    const slot = scheduleSlots.find((s) => s.id === slotId);
    if (!slot) return [404, { message: "Slot not found" }];
    slot.liveStatus = "NOT_STARTED";
    return [200, slot];
  });

  mock.onPost(/\/competitions\/[^/]+\/schedule\/slots\/[^/]+\/assign-advancing-pairs$/).reply((config) => {
    const parts = config.url!.split("/");
    const slotId = parts[parts.length - 2];
    const slot = scheduleSlots.find((s) => s.id === slotId);
    if (!slot) return [404, { message: "Slot not found" }];
    return [204];
  });

  // ── Payments ─────────────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/payments\/summary/).reply(200, {
    totalExpected: pairs.length * 40,
    totalCollected: pairs.filter((p) => p.paymentStatus === "PAID").length * 40,
    totalPending: pairs.filter((p) => p.paymentStatus === "PENDING").length * 40,
    currency: "EUR",
    paidCount: pairs.filter((p) => p.paymentStatus === "PAID").length,
    pendingCount: pairs.filter((p) => p.paymentStatus === "PENDING").length,
  });

  mock.onGet(/\/competitions\/[^/]+\/payments$/).reply(() => [200, pairs.map((p) => ({
    id: `pay-${p.id}`,
    pairId: p.id,
    dancer1Name: `${p.dancer1FirstName} ${p.dancer1LastName}`,
    dancer2Name: p.dancer2FirstName ? `${p.dancer2FirstName} ${p.dancer2LastName}` : undefined,
    startNumber: p.startNumber,
    sectionName: sections.find((s) => s.id === p.sectionId)?.name ?? "",
    amount: 40,
    currency: "EUR",
    status: p.paymentStatus,
    dueDate: "2026-04-10T23:59:00",
  }))]);

  mock.onPut(/\/competitions\/[^/]+\/payments\/[^/]+\/mark-paid/).reply(200, { status: "PAID" });
  mock.onPut(/\/competitions\/[^/]+\/payments\/[^/]+\/waive/).reply(200, { status: "WAIVED" });
  mock.onPut(/\/competitions\/[^/]+\/payments\/bulk-mark-paid/).reply(200, {});

  // ── Me ───────────────────────────────────────────────────────────────────────
  mock.onGet("/me/registrations").reply(200, [
    { id: "reg-001", competitionId: "comp-001", competitionName: "Slovak Dance Cup 2026", competitionLocation: "Bratislava", competitionStartDate: "2026-04-15", competitionStatus: "PUBLISHED", sectionId: "sec-001", sectionName: "Adult Standard A", startNumber: 1, dancer1FirstName: "Martin", dancer1LastName: "Novák", dancer2FirstName: "Eva", dancer2LastName: "Nováková", paymentStatus: "PAID", amountDue: 40, currency: "EUR", registeredAt: "2026-02-01T10:00:00" },
  ]);

  mock.onGet("/me/payments").reply(200, [
    { id: "mpay-001", registrationId: "reg-001", competitionName: "Slovak Dance Cup 2026", amount: 40, currency: "EUR", status: "PAID", paidAt: "2026-02-05T10:00:00" },
  ]);

  mock.onDelete(/\/me\/registrations\//).reply(204);

  // ── Judge session ────────────────────────────────────────────────────────────
  mock.onPost("/judge-access/connect").reply((config) => {
    const { token, pin } = JSON.parse(config.data);
    const jt = judgeTokens.find((j) => (j.token === token || j.rawToken === token) && j.active);
    if (!jt) return [401, { message: "Invalid token" }];
    if (pin !== jt.pin.slice(0, 4) && pin !== jt.pin) return [401, { message: "Wrong PIN" }];
    return [200, {
      accessToken: `judge-access-${jt.id}`,
      deviceToken: `judge-device-${jt.id}`,
      adjudicatorId: jt.id,
      competitionId: jt.competitionId,
      competitionName: competitions.find((c) => c.id === jt.competitionId)?.name ?? "Competition",
    }];
  });

  mock.onPut(/\/judge-access\/.*\/heartbeat/).reply(204);

  mock.onPost("/judge-tokens/validate").reply((config) => {
    const { token } = JSON.parse(config.data);
    const jt = judgeTokens.find((j) => j.token === token || j.rawToken === token);
    if (!jt || !jt.active) return [401, { message: "Invalid or expired judge token" }];
    const comp = competitions.find((c) => c.id === jt.competitionId);
    return [200, {
      judgeTokenId: jt.id,
      judgeNumber: jt.judgeNumber,
      competitionId: jt.competitionId,
      competitionName: comp?.name ?? "Unknown Competition",
      role: jt.role,
    }];
  });

  mock.onGet("/judge/active-round").reply((config) => {
    const competitionId = config.params?.competitionId;
    const compSections = sections.filter((s) => s.competitionId === competitionId);
    const activeRound = rounds.find((r) =>
      compSections.some((s) => s.id === r.sectionId) &&
      (r.status === "IN_PROGRESS" || r.status === "OPEN")
    );
    if (!activeRound) return [404, { message: "No active round" }];
    const section = compSections.find((s) => s.id === activeRound.sectionId);
    const presentPairIds = pairs
      .filter((p) => p.competitionId === competitionId && (p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR"))
      .map((p) => p.id);
    const roundPairs = pairs.filter((p) =>
      p.sectionId === activeRound.sectionId && presentPairIds.includes(p.id)
    );
    return [200, { round: { ...activeRound, dances: section?.dances ?? [] }, pairs: roundPairs, heats: [], sectionName: section?.name ?? null }];
  });

  // ── Presence ─────────────────────────────────────────────────────────────────
  mock.onGet(/\/competitions\/[^/]+\/presence$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    return [200, pairs.filter((p) => p.competitionId === compId).map((p) => ({
      ...p,
      presenceStatus: p.presenceStatus ?? "ABSENT",
    }))];
  });

  // Per-section presence close/reopen
  mock.onPost(/\/competitions\/[^/]+\/sections\/[^/]+\/presence\/close$/).reply((config) => {
    const sectionId = config.url!.match(/\/sections\/([^/]+)\/presence/)?.[1];
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return [404, {}];
    (section as unknown as Record<string, unknown>).presenceClosed = true;
    persistSections();
    return [204];
  });

  mock.onPost(/\/competitions\/[^/]+\/sections\/[^/]+\/presence\/reopen$/).reply((config) => {
    const sectionId = config.url!.match(/\/sections\/([^/]+)\/presence/)?.[1];
    const section = sections.find((s) => s.id === sectionId);
    if (!section) return [404, {}];
    (section as unknown as Record<string, unknown>).presenceClosed = false;
    persistSections();
    return [204];
  });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+\/presence$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/presence/);
    const pairId = match?.[1];
    const { status } = JSON.parse(config.data) as { status: PresenceStatus };
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.presenceStatus = status;
    persistPairs();
    return [200, pair];
  });

  mock.onPost(/\/competitions\/[^/]+\/floor$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const { pairId } = JSON.parse(config.data) as { pairId: string };
    // Clear previous ON_FLOOR pairs in this competition
    pairs.filter((p) => p.competitionId === compId && p.presenceStatus === "ON_FLOOR")
      .forEach((p) => { p.presenceStatus = "CHECKED_IN"; });
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.presenceStatus = "ON_FLOOR";
    persistPairs();
    return [200, pair];
  });

  mock.onPut(/\/competitions\/[^/]+\/pairs\/[^/]+\/payment$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/payment/);
    const pairId = match?.[1];
    const { paid } = JSON.parse(config.data) as { paid: boolean };
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.paymentStatus = paid ? "PAID" : "PENDING";
    persistPairs();
    return [200, pair];
  });

  mock.onPost(/\/competitions\/[^/]+\/pairs\/[^/]+\/done$/).reply((config) => {
    const match = config.url!.match(/\/competitions\/[^/]+\/pairs\/([^/]+)\/done/);
    const pairId = match?.[1];
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.presenceStatus = "DONE";
    persistPairs();
    return [200, pair];
  });

  mock.onPost(/\/competitions\/[^/]+\/presence\/reopen$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const comp = competitions.find((c) => c.id === compId);
    if (!comp) return [404, {}];
    comp.presenceClosed = false;
    persistCompetitions();
    return [200, comp];
  });

  mock.onPost(/\/competitions\/[^/]+\/presence\/close$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const comp = competitions.find((c) => c.id === compId);
    if (!comp) return [404, {}];
    comp.presenceClosed = true;
    persistCompetitions();
    const compPairs = pairs.filter((p) => p.competitionId === compId);
    const active = compPairs.filter(
      (p) =>
        (p.presenceStatus === "CHECKED_IN" || p.presenceStatus === "ON_FLOOR" || p.presenceStatus === "DONE") &&
        (p.paymentStatus === "PAID" || p.paymentStatus === "WAIVED")
    );
    const absent = compPairs.filter(
      (p) => !p.presenceStatus || p.presenceStatus === "ABSENT"
    );
    return [200, { active, absent }];
  });

  // ── Check-in tokens ──────────────────────────────────────────────────────────
  mock.onPost(/\/competitions\/[^/]+\/checkin-token$/).reply((config) => {
    const compId = config.url!.match(/\/competitions\/([^/]+)/)?.[1];
    const existing = checkinTokens.find((t) => t.competitionId === compId);
    if (existing) return [200, { token: existing.token }];
    const token = `CHECKIN${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    checkinTokens.push({ token, competitionId: compId! });
    return [201, { token }];
  });

  mock.onGet(/\/checkin-tokens\/[^/]+$/).reply((config) => {
    const token = config.url!.split("/").pop();
    const ct = checkinTokens.find((t) => t.token === token);
    if (!ct) return [404, { message: "Invalid check-in token" }];
    const comp = competitions.find((c) => c.id === ct.competitionId);
    return [200, { token: ct.token, competitionId: ct.competitionId, competitionName: comp?.name ?? "Unknown" }];
  });

  mock.onGet(/\/checkin-tokens\/[^/]+\/pairs$/).reply((config) => {
    const token = config.url!.match(/\/checkin-tokens\/([^/]+)\/pairs/)?.[1];
    const ct = checkinTokens.find((t) => t.token === token);
    if (!ct) return [404, {}];
    const compPairs = pairs.filter((p) => p.competitionId === ct.competitionId);
    const compSections = sections.filter((s) => s.competitionId === ct.competitionId);
    return [200, compPairs.map((p) => ({
      ...p,
      sectionName: compSections.find((s) => s.id === p.sectionId)?.name ?? "",
    }))];
  });

  mock.onPut(/\/checkin-tokens\/[^/]+\/pairs\/[^/]+\/arrival$/).reply((config) => {
    const match = config.url!.match(/\/checkin-tokens\/[^/]+\/pairs\/([^/]+)\/arrival/);
    const pairId = match?.[1];
    const { present } = JSON.parse(config.data) as { present: boolean };
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.presenceStatus = present ? "CHECKED_IN" : "ABSENT";
    persistPairs();
    return [200, pair];
  });

  mock.onPut(/\/checkin-tokens\/[^/]+\/pairs\/[^/]+\/payment$/).reply((config) => {
    const match = config.url!.match(/\/checkin-tokens\/[^/]+\/pairs\/([^/]+)\/payment/);
    const pairId = match?.[1];
    const { paid } = JSON.parse(config.data) as { paid: boolean };
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair) return [404, {}];
    pair.paymentStatus = paid ? "PAID" : "PENDING";
    persistPairs();
    return [200, pair];
  });

  // ── Settings ─────────────────────────────────────────────────────────────────
  mock.onPut("/me/profile").reply(200, mockUser);
  mock.onPut("/me/password").reply(204);
  mock.onPut("/auth/me").reply(200, mockUser);
  mock.onPut("/auth/password").reply(204);
  mock.onGet("/me/profile").reply(200, mockUser);

  // ── Live řízení ───────────────────────────────────────────────────────────────
  mock.onPost(/\/heats\/.*\/send/).reply(200, { sentAt: new Date().toISOString() });

  mock.onGet(/\/heats\/.*\/judge-statuses/).reply((config) => {
    // Judge confirms ONCE per dance (roundId:dance), not per group.
    // Extract roundId from heatId (format: "${roundId}-h${n}") and check per roundId:dance.
    const heatId = config.url!.split("/")[2];
    const roundId = heatId.replace(/-h\d+$/, "");
    const params = config.params as Record<string, string> | undefined;
    const dance = params?.dance;
    const compId = params?.competitionId;
    // Use same judge list as the judge-tokens endpoint (consistent IDs)
    const activeTokens = compId
      ? getActiveJudgesForCompetition(compId)
      : judgeTokens.filter((jt) => jt.active);
    return [200, activeTokens.map((jt, i) => ({
      judgeId: jt.id,
      letter: String.fromCharCode(65 + i),
      name: (jt as Record<string, unknown>).name ?? `Porotce ${jt.judgeNumber}`,
      status: isSubmitted(roundId, jt.id, dance) ? "submitted" : "pending",
      online: true,
      submittedAt: isSubmitted(roundId, jt.id, dance) ? new Date().toISOString() : undefined,
    }))];
  });

  mock.onGet(/\/heats\/.*\/results/).reply(200, [
    { pairId: "pair-1", pairNumber: 12, votes: 4, totalJudges: 5, advances: true },
    { pairId: "pair-2", pairNumber: 34, votes: 2, totalJudges: 5, advances: false },
    { pairId: "pair-3", pairNumber: 56, votes: 5, totalJudges: 5, advances: true },
    { pairId: "pair-4", pairNumber: 78, votes: 3, totalJudges: 5, advances: true },
    { pairId: "pair-5", pairNumber: 91, votes: 1, totalJudges: 5, advances: false },
  ]);

  // Live rounds (for LiveControlDashboard)
  mock.onGet(/\/competitions\/.*\/live-rounds/).reply(200, [
    {
      id: "round-1",
      name: "Kolo 1",
      status: "active",
      dances: [
        { id: "dance-1", name: "Waltz" },
        { id: "dance-2", name: "Tango" },
        { id: "dance-3", name: "Foxtrot" },
      ],
      heats: [
        { id: "heat-1", number: 1, pairNumbers: [12, 24, 36, 48, 60], status: "active" },
        { id: "heat-2", number: 2, pairNumbers: [13, 25, 37, 49, 61], status: "pending" },
        { id: "heat-3", number: 3, pairNumbers: [14, 26, 38, 50, 62], status: "pending" },
      ],
    },
    {
      id: "round-2",
      name: "Semifinále",
      status: "upcoming",
      dances: [
        { id: "dance-1", name: "Waltz" },
        { id: "dance-2", name: "Tango" },
      ],
      heats: [],
    },
  ]);

  mock.onPost(/\/judges\/.*\/ping/).reply(200, { delivered: true });

  const mockIncidents: unknown[] = [];
  mock.onPost(/\/competitions\/.*\/incidents/).reply((config) => {
    const body = JSON.parse(config.data) as { type: string; pairNumber?: number; note: string; roundId?: string; heatId?: string };
    const incident = { id: `inc-${Date.now()}`, ...body, timestamp: new Date().toISOString() };
    mockIncidents.unshift(incident);
    return [201, incident];
  });

  mock.onGet(/\/competitions\/.*\/incidents/).reply(200, mockIncidents);

  mock.onPost(/\/heats\/.*\/skip/).reply(204);

  mock.onPut(/\/heats\/.*\/pairs\/.*\/withdraw/).reply(200, { status: "withdrawn" });

  mock.onPost(/\/judges\/.*\/heats\/.*\/unlock/).reply(204);

  mock.onPost(/\/rounds\/.*\/reorder/).reply(204);

  mock.onPut(/\/rounds\/.*\/heats\/auto-assign/).reply(200, { assigned: true });

  // Registration activity — last N days
  mock.onGet("/organizer/analytics/registration-activity").reply((config) => {
    const days = parseInt((config.params?.days as string) ?? "14", 10);
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      result.push({
        date: d.toISOString().slice(0, 10),
        count: Math.floor(Math.random() * 6),
      });
    }
    return [200, result];
  });

  return mock;
}
