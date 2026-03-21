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
  mock.onGet(/\/sections\/[^/]+\/rounds$/).reply((config) => {
    const sectionId = config.url!.split("/")[2];
    return [200, rounds.filter((r) => r.sectionId === sectionId)];
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
  mock.onGet(/\/competitions\/[^/]+\/judge-tokens$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, judgeTokens.filter((j) => j.competitionId === compId)];
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

  mock.onDelete(/\/competitions\/[^/]+\/judge-tokens\/[^/]+$/).reply(204);

  // ── Scoring ─────────────────────────────────────────────────────────────────
  mock.onPost(/\/rounds\/[^/]+\/callbacks/).reply(204);
  mock.onPut(/\/rounds\/[^/]+\/callbacks/).reply(204);
  mock.onGet(/\/rounds\/[^/]+\/callbacks/).reply(200, { selectedPairIds: [] });

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

  mock.onPost(/\/rounds\/[^/]+\/calculate/).reply(200, { roundId: "round-001", roundType: "PRELIMINARY", dances: [] });
  mock.onGet(/\/rounds\/[^/]+\/results/).reply(200, { roundId: "round-001", roundType: "PRELIMINARY", dances: [] });

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

  mock.onPost(/\/competitions\/[^/]+\/notifications\/send/).reply(200, { sent: true, recipientCount: 47 });

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
  mock.onGet(/\/competitions\/[^/]+\/schedule$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    return [200, scheduleSlots.filter((s) => s.competitionId === compId)];
  });

  mock.onPost(/\/competitions\/[^/]+\/schedule$/).reply((config) => {
    const compId = config.url!.split("/")[2];
    const data = JSON.parse(config.data);
    const sec = sections.find((s) => s.id === data.sectionId);
    const slot = { id: `slot-${Date.now()}`, competitionId: compId, sectionName: sec?.name ?? "Unknown", orderIndex: scheduleSlots.length, ...data } as typeof scheduleSlots[number];
    scheduleSlots.push(slot);
    return [201, slot];
  });

  mock.onDelete(/\/competitions\/[^/]+\/schedule\/[^/]+$/).reply(204);

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
    return [200, { round: { ...activeRound, dances: section?.dances ?? [] }, pairs: roundPairs }];
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

  return mock;
}
