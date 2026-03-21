import { http, HttpResponse, delay } from "msw";
import {
  mockUser, mockTokenResponse, competitions, sections, pairs, rounds,
  judgeTokens, sectionResults, fees, discounts, notifications,
  scheduleSlots, news,
} from "./db";

const D = 150; // simulated network delay ms

// helper to parse body
async function body<T>(req: Request): Promise<T> {
  return req.json() as Promise<T>;
}

export const handlers = [

  // ── Auth ─────────────────────────────────────────────────────────────────────
  http.post("/api/v1/auth/register", async () => {
    await delay(D);
    return HttpResponse.json(mockTokenResponse, { status: 201 });
  }),

  http.post("/api/v1/auth/login", async () => {
    await delay(D);
    return HttpResponse.json(mockTokenResponse);
  }),

  http.post("/api/v1/auth/refresh", async () => {
    await delay(D);
    return HttpResponse.json(mockTokenResponse);
  }),

  http.post("/api/v1/auth/logout", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/auth/me", async () => {
    await delay(D);
    return HttpResponse.json(mockUser);
  }),

  // ── Competitions ─────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions", async () => {
    await delay(D);
    // Return as CompetitionSummary array (backend returns array, not page)
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
    return HttpResponse.json(summaries);
  }),

  http.get("/api/v1/competitions/:id", async ({ params }) => {
    await delay(D);
    const comp = competitions.find((c) => c.id === params.id);
    if (!comp) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(comp);
  }),

  http.post("/api/v1/competitions", async ({ request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const comp = { id: `comp-${Date.now()}`, slug: `comp-${Date.now()}`, ...data, status: "DRAFT", registrationOpen: false, organizerId: mockUser.id };
    competitions.push(comp as typeof competitions[0]);
    return HttpResponse.json(comp, { status: 201 });
  }),

  http.put("/api/v1/competitions/:id", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const idx = competitions.findIndex((c) => c.id === params.id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    competitions[idx] = { ...competitions[idx], ...data };
    return HttpResponse.json(competitions[idx]);
  }),

  http.post("/api/v1/competitions/:id/publish", async ({ params }) => {
    await delay(D);
    const comp = competitions.find((c) => c.id === params.id);
    if (!comp) return new HttpResponse(null, { status: 404 });
    comp.status = "PUBLISHED";
    return HttpResponse.json(comp);
  }),


  // ── Public registration ───────────────────────────────────────────────────────
  http.post("/api/v1/competitions/:id/public-registration", async ({ params, request }) => {
    await delay(D);
    const data = await body<{
      sectionId: string;
      dancer1FirstName: string;
      dancer1LastName: string;
      dancer1Club?: string;
      dancer2FirstName?: string;
      dancer2LastName?: string;
      dancer2Club?: string;
      email: string;
      discountCode?: string;
    }>(request);

    const comp = competitions.find((c) => c.id === params.id);
    if (!comp) return new HttpResponse(null, { status: 404 });
    if (!comp.registrationOpen) {
      return HttpResponse.json({ message: "Registrace není otevřena" }, { status: 400 });
    }

    const section = sections.find((s) => s.id === data.sectionId);
    if (!section) return HttpResponse.json({ message: "Kategorie nenalezena" }, { status: 404 });

    if (section.maxPairs && (section.registeredPairsCount ?? 0) >= section.maxPairs) {
      return HttpResponse.json({ message: "Kapacita kategorie je plná" }, { status: 409 });
    }

    const startNumber = pairs.filter((p) => p.competitionId === params.id).length + 1;
    const pair = {
      id: `pair-${Date.now()}`,
      competitionId: params.id as string,
      sectionId: data.sectionId,
      startNumber,
      dancer1FirstName: data.dancer1FirstName,
      dancer1LastName: data.dancer1LastName,
      dancer1Club: data.dancer1Club,
      dancer2FirstName: data.dancer2FirstName,
      dancer2LastName: data.dancer2LastName,
      dancer2Club: data.dancer2Club,
      registeredAt: new Date().toISOString(),
      paymentStatus: "PENDING" as const,
    };
    pairs.push(pair as typeof pairs[0]);

    // Update section counter
    section.registeredPairsCount = (section.registeredPairsCount ?? 0) + 1;

    // Mock confirmation email log
    notifications.push({
      id: `notif-${Date.now()}`,
      competitionId: params.id as string,
      type: "EMAIL",
      subject: `Potvrzení registrace — ${comp.name}`,
      sentAt: new Date().toISOString(),
      recipientCount: 1,
      status: "SENT",
    });

    return HttpResponse.json({
      pairId: pair.id,
      startNumber: pair.startNumber,
      sectionName: section.name,
      amountDue: section.entryFee ?? 0,
      currency: section.entryFeeCurrency ?? "EUR",
    }, { status: 201 });
  }),

  http.delete("/api/v1/competitions/:id", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Sections ─────────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/sections", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(sections.filter((s) => s.competitionId === params.id));
  }),

  http.get("/api/v1/competitions/:id/sections/:sectionId", async ({ params }) => {
    await delay(D);
    const sec = sections.find((s) => s.id === params.sectionId);
    if (!sec) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(sec);
  }),

  http.post("/api/v1/competitions/:id/sections", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sec = { id: `sec-${Date.now()}`, competitionId: params.id as string, dances: [], registeredPairsCount: 0, ...data, status: "ACTIVE" } as any;
    sections.push(sec);
    return HttpResponse.json(sec, { status: 201 });
  }),

  http.put("/api/v1/competitions/:id/sections/:sectionId", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const idx = sections.findIndex((s) => s.id === params.sectionId);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    sections[idx] = { ...sections[idx], ...data };
    return HttpResponse.json(sections[idx]);
  }),

  http.delete("/api/v1/competitions/:id/sections/:sectionId", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Pairs ─────────────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/pairs", async ({ params, request }) => {
    await delay(D);
    const url = new URL(request.url);
    const sectionId = url.searchParams.get("sectionId");
    const filtered = pairs.filter((p) => p.competitionId === params.id && (!sectionId || p.sectionId === sectionId));
    return HttpResponse.json(filtered);
  }),

  http.post("/api/v1/competitions/:id/pairs", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const pair = { id: `pair-${Date.now()}`, competitionId: params.id as string, startNumber: pairs.length + 1, registeredAt: new Date().toISOString(), paymentStatus: "PENDING", ...data };
    pairs.push(pair as typeof pairs[0]);
    return HttpResponse.json(pair, { status: 201 });
  }),

  http.put("/api/v1/competitions/:id/pairs/:pairId", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const idx = pairs.findIndex((p) => p.id === params.pairId);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    pairs[idx] = { ...pairs[idx], ...data };
    return HttpResponse.json(pairs[idx]);
  }),

  http.delete("/api/v1/competitions/:id/pairs/:pairId", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Rounds ────────────────────────────────────────────────────────────────────
  http.get("/api/v1/sections/:sectionId/rounds", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(rounds.filter((r) => r.sectionId === params.sectionId));
  }),

  http.get("/api/v1/rounds/:roundId", async ({ params }) => {
    await delay(D);
    const r = rounds.find((r) => r.id === params.roundId);
    if (!r) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json({ ...r, judgeCount: 5 });
  }),

  http.post("/api/v1/sections/:sectionId/rounds", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const round = {
      id: `round-${Date.now()}`,
      sectionId: params.sectionId as string,
      status: "PENDING",
      roundNumber: rounds.filter((r) => r.sectionId === params.sectionId).length + 1,
      judgeCount: 5,
      startedAt: null,
      closedAt: null,
      ...data,
    };
    rounds.push(round as typeof rounds[0]);
    return HttpResponse.json(round, { status: 201 });
  }),

  http.post("/api/v1/rounds/:roundId/open", async ({ params }) => {
    await delay(D);
    const r = rounds.find((r) => r.id === params.roundId);
    if (r) { r.status = "OPEN"; }
    return HttpResponse.json({ ...r, judgeCount: 5 });
  }),

  http.post("/api/v1/rounds/:roundId/start", async ({ params }) => {
    await delay(D);
    const r = rounds.find((r) => r.id === params.roundId);
    if (r) { r.status = "IN_PROGRESS"; r.startedAt = new Date().toISOString(); }
    return HttpResponse.json({ ...r, judgeCount: 5 });
  }),

  http.post("/api/v1/rounds/:roundId/close", async ({ params }) => {
    await delay(D);
    const r = rounds.find((r) => r.id === params.roundId);
    if (r) { r.status = "CLOSED"; r.closedAt = new Date().toISOString(); }
    return HttpResponse.json({ ...r, judgeCount: 5 });
  }),

  // ── Judge tokens ──────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/judge-tokens", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(judgeTokens.filter((j) => j.competitionId === params.id));
  }),

  http.post("/api/v1/competitions/:id/judge-tokens", async ({ params, request }) => {
    await delay(D);
    const body = await request.json() as { judgeNumber?: number; role?: string };
    const existing = judgeTokens.filter((j) => j.competitionId === params.id);
    const num = body.judgeNumber ?? (existing.length + 1);
    const rawToken = `judge-${params.id}-${num}-${Date.now()}`;
    const entry = {
      id: `jt-${Date.now()}-${num}`,
      competitionId: params.id as string,
      judgeNumber: num,
      token: rawToken,
      rawToken,
      active: true,
      pin: String(Math.floor(100000 + Math.random() * 900000)),
      role: body.role ?? "JUDGE",
    };
    judgeTokens.push(entry);
    return HttpResponse.json(entry, { status: 201 });
  }),

  http.post("/api/v1/judge-tokens/validate", async ({ request }) => {
    await delay(D);
    const { token } = await request.json() as { token: string };
    const jt = judgeTokens.find((j) => j.token === token || j.rawToken === token);
    if (!jt || !jt.active) return HttpResponse.json({ message: "Invalid or expired judge token" }, { status: 401 });
    return HttpResponse.json({
      judgeTokenId: jt.id,
      judgeNumber: jt.judgeNumber,
      competitionId: jt.competitionId,
      competitionName: "Test Competition",
      role: jt.role,
    });
  }),

  http.delete("/api/v1/competitions/:id/judge-tokens/:tokenId/permanent", async ({ params }) => {
    await delay(D);
    const idx = judgeTokens.findIndex((j) => j.id === params.tokenId);
    if (idx !== -1) judgeTokens.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete("/api/v1/competitions/:id/judge-tokens/:tokenId", async ({ params }) => {
    await delay(D);
    const tok = judgeTokens.find((j) => j.id === params.tokenId);
    if (tok) (tok as Record<string, unknown>).active = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/judge/active-round", async ({ request }) => {
    await delay(D);
    const url = new URL(request.url);
    const competitionId = url.searchParams.get("competitionId");
    const compSections = sections.filter((s) => s.competitionId === competitionId);
    const activeRound = rounds.find((r) =>
      compSections.some((s) => s.id === r.sectionId) &&
      (r.status === "IN_PROGRESS" || r.status === "OPEN")
    );
    if (!activeRound) return HttpResponse.json({ message: "No active round" }, { status: 404 });
    const section = compSections.find((s) => s.id === activeRound.sectionId);
    const roundPairs = pairs.filter((p) => p.sectionId === activeRound.sectionId);
    return HttpResponse.json({
      round: activeRound,
      dances: section?.dances ?? [],
      pairs: roundPairs,
    });
  }),

  // ── Scoring ───────────────────────────────────────────────────────────────────
  http.post("/api/v1/rounds/:roundId/callbacks", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/rounds/:roundId/placements/:danceId", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/rounds/:roundId/submission-status", async () => {
    await delay(D);
    return HttpResponse.json({
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
  }),

  http.post("/api/v1/rounds/:roundId/calculate", async ({ params }) => {
    await delay(500);
    const r = rounds.find((round) => round.id === params.roundId);
    if (r) r.status = "CALCULATED";
    return HttpResponse.json({
      roundId: params.roundId,
      roundType: r?.roundType ?? "PRELIMINARY",
      dances: [],
    });
  }),

  http.get("/api/v1/rounds/:roundId/results", async ({ params }) => {
    await delay(D);
    const r = rounds.find((round) => round.id === params.roundId);
    if (r?.roundType === "FINAL") {
      return HttpResponse.json({
        roundId: params.roundId,
        roundType: "FINAL",
        dances: [
          {
            danceId: "dance-001",
            danceName: "Waltz",
            rankings: [
              { pairId: "pair-001", startNumber: 1, dancer1Name: "Martin Novák", placement: 1, ruleApplied: "Rule 5", detail: "Majority 4/5" },
              { pairId: "pair-002", startNumber: 2, dancer1Name: "Peter Horváth", placement: 2, ruleApplied: "Rule 5", detail: "Majority 3/5" },
              { pairId: "pair-003", startNumber: 3, dancer1Name: "Lukáš Kováč", placement: 3, ruleApplied: "Rule 7", detail: "Sum tiebreak" },
            ],
          },
        ],
      });
    }
    return HttpResponse.json({
      roundId: params.roundId,
      roundType: "PRELIMINARY",
      pairsToAdvance: 8,
      pairs: pairs.slice(0, 7).map((p, i) => ({
        pairId: p.id,
        startNumber: p.startNumber,
        dancer1Name: `${p.dancer1FirstName} ${p.dancer1LastName}`,
        voteCount: 5 - (i % 3),
        advances: i < 4,
      })),
    });
  }),

  http.get("/api/v1/sections/:sectionId/final-summary", async ({ params }) => {
    await delay(D);
    const result = sectionResults[params.sectionId as keyof typeof sectionResults];
    if (!result) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(result);
  }),

  http.post("/api/v1/sections/:sectionId/final-summary/calculate", async ({ params }) => {
    await delay(600);
    const result = sectionResults[params.sectionId as keyof typeof sectionResults] ?? { sectionId: params.sectionId, rankings: [] };
    return HttpResponse.json(result);
  }),

  http.post("/api/v1/sections/:sectionId/results/approve", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Fees & Discounts ──────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/fees", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(fees.filter((f) => f.competitionId === params.id));
  }),

  http.post("/api/v1/competitions/:id/fees", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const fee = { id: `fee-${Date.now()}`, competitionId: params.id as string, currency: "EUR", ...data };
    fees.push(fee as typeof fees[0]);
    return HttpResponse.json(fee, { status: 201 });
  }),

  http.delete("/api/v1/competitions/:id/fees/:feeId", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/competitions/:id/discounts", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(discounts.filter((d) => d.competitionId === params.id));
  }),

  http.post("/api/v1/competitions/:id/discounts", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const disc = { id: `disc-${Date.now()}`, competitionId: params.id as string, usedCount: 0, active: true, ...data };
    discounts.push(disc as typeof discounts[0]);
    return HttpResponse.json(disc, { status: 201 });
  }),

  // ── News ──────────────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/news", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(news.filter((n) => n.competitionId === params.id));
  }),

  http.post("/api/v1/competitions/:id/news", async ({ params, request }) => {
    await delay(D);
    const data = await body<{ title: string; content: string; imageUrl?: string }>(request);
    const item = { id: `news-${Date.now()}`, competitionId: params.id as string, publishedAt: new Date().toISOString(), ...data };
    news.push(item as typeof news[0]);
    return HttpResponse.json(item, { status: 201 });
  }),

  http.delete("/api/v1/competitions/:id/news/:newsId", async ({ params }) => {
    await delay(D);
    const idx = news.findIndex((n) => n.id === params.newsId);
    if (idx !== -1) news.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Notifications ─────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/notifications", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(notifications.filter((n) => n.competitionId === params.id));
  }),

  http.post("/api/v1/competitions/:id/notifications/send", async () => {
    await delay(800);
    return HttpResponse.json({ sent: true, recipientCount: 47 });
  }),

  // ── Schedule ──────────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/schedule", async ({ params }) => {
    await delay(D);
    return HttpResponse.json(scheduleSlots.filter((s) => s.competitionId === params.id));
  }),

  http.post("/api/v1/competitions/:id/schedule", async ({ params, request }) => {
    await delay(D);
    const data = await body<Record<string, unknown>>(request);
    const sec = sections.find((s) => s.id === data.sectionId);
    const slot = { id: `slot-${Date.now()}`, competitionId: params.id as string, sectionId: (data.sectionId as string) ?? null, roundId: null, label: sec?.name ?? "Unknown", startTime: new Date().toISOString(), durationMinutes: (data.durationMinutes as number) ?? 15, orderIndex: scheduleSlots.length, type: "ROUND" as const, liveStatus: "NOT_STARTED" as const, manuallyMoved: false, suggested: false, durationLocked: false, roundNumber: null };
    scheduleSlots.push(slot);
    return HttpResponse.json(slot, { status: 201 });
  }),

  http.delete("/api/v1/competitions/:id/schedule/:slotId", async () => {
    await delay(D);
    return new HttpResponse(null, { status: 204 });
  }),

  // ── Payments ──────────────────────────────────────────────────────────────────
  http.get("/api/v1/competitions/:id/payments", async () => {
    await delay(D);
    return HttpResponse.json(pairs.map((p) => ({
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
    })));
  }),

  http.get("/api/v1/competitions/:id/payments/summary", async () => {
    await delay(D);
    const paid = pairs.filter((p) => p.paymentStatus === "PAID").length;
    const pending = pairs.filter((p) => p.paymentStatus === "PENDING").length;
    return HttpResponse.json({
      totalExpected: pairs.length * 40,
      totalCollected: paid * 40,
      totalPending: pending * 40,
      currency: "EUR",
      paidCount: paid,
      pendingCount: pending,
    });
  }),

  http.put("/api/v1/competitions/:id/payments/:paymentId/mark-paid", async () => {
    await delay(D);
    return HttpResponse.json({ status: "PAID" });
  }),

  http.put("/api/v1/competitions/:id/payments/:paymentId/waive", async () => {
    await delay(D);
    return HttpResponse.json({ status: "WAIVED" });
  }),

  // ── Me / My registrations ─────────────────────────────────────────────────────
  http.get("/api/v1/me/registrations", async () => {
    await delay(D);
    return HttpResponse.json([
      { id: "reg-001", competitionId: "comp-001", competitionName: "Slovak Dance Cup 2026", competitionLocation: "Bratislava", competitionStartDate: "2026-04-15T09:00:00", competitionStatus: "REGISTRATION_OPEN", sectionId: "sec-001", sectionName: "Adult Standard A", startNumber: 1, dancer1FirstName: "Martin", dancer1LastName: "Novák", dancer2FirstName: "Eva", dancer2LastName: "Nováková", paymentStatus: "PAID", amountDue: 40, currency: "EUR", registeredAt: "2026-02-01T10:00:00" },
    ]);
  }),

  http.get("/api/v1/me/payments", async () => {
    await delay(D);
    return HttpResponse.json([
      { id: "mpay-001", registrationId: "reg-001", competitionName: "Slovak Dance Cup 2026", amount: 40, currency: "EUR", status: "PAID", paidAt: "2026-02-05T10:00:00" },
    ]);
  }),

  // ── SSE (just ignore) ─────────────────────────────────────────────────────────
  http.get("/api/v1/sse/competitions/:id", async () => {
    return new HttpResponse(null, { status: 200, headers: { "Content-Type": "text/event-stream" } });
  }),

  // ── Crisis scenarios ──────────────────────────────────────────────────────────
  http.post("/api/v1/competitions/:id/pairs/:pairId/withdraw", async ({ params }) => {
    await delay(D);
    const idx = pairs.findIndex((p) => p.id === params.pairId);
    if (idx !== -1) pairs.splice(idx, 1); // remove from competition
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/competitions/:id/pairs/:pairId/penalty", async () => {
    await delay(D);
    return HttpResponse.json({ applied: true });
  }),

  // ── Catch-all passthrough ─────────────────────────────────────────────────────
  http.all("/api/v1/*", async ({ request }) => {
    console.warn("[MSW] Unhandled:", request.method, request.url);
    return HttpResponse.json({ message: "Mock not implemented" }, { status: 501 });
  }),
];
