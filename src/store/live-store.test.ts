import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MockAdapter from "axios-mock-adapter";

import apiClient from "@/lib/api-client";
import { useAlertsStore } from "@/store/alerts-store";
import { useLiveStore } from "./live-store";

const resetLiveStore = () => {
  useLiveStore.setState({
    selectedRoundId: null,
    selectedDanceId: null,
    selectedHeatId: null,
    judgeStatuses: {},
    judgeOnline: {},
    activePairs: [],
    heatResults: null,
    incidents: [],
    presMode: false,
    lastSentAt: null,
    isHydrating: false,
    danceConfirmations: {},
    roundClosed: false,
    danceStatuses: [],
  });
};

describe("live-store", () => {
  let mock: MockAdapter;

  beforeEach(() => {
    mock = new MockAdapter(apiClient);
    resetLiveStore();
  });

  afterEach(() => {
    mock.restore();
  });

  describe("hydrateFromServer — downgrade guard", () => {
    it("does NOT downgrade a judge already marked submitted", async () => {
      useLiveStore.setState({ judgeStatuses: { j1: "submitted" } });

      mock.onGet("/heats/h1/judge-statuses").reply(200, [{ judgeId: "j1", status: "scoring" }]);
      mock.onGet("/heats/h1/results").reply(204);
      mock.onGet("/competitions/c1/incidents").reply(200, []);

      await useLiveStore.getState().hydrateFromServer("c1", "h1");

      expect(useLiveStore.getState().judgeStatuses.j1).toBe("submitted");
    });

    it("upgrades pending → submitted when server reports submitted", async () => {
      useLiveStore.setState({ judgeStatuses: { j1: "pending" } });

      mock.onGet("/heats/h1/judge-statuses").reply(200, [{ judgeId: "j1", status: "submitted" }]);
      mock.onGet("/heats/h1/results").reply(204);
      mock.onGet("/competitions/c1/incidents").reply(200, []);

      await useLiveStore.getState().hydrateFromServer("c1", "h1");

      expect(useLiveStore.getState().judgeStatuses.j1).toBe("submitted");
    });

    it("adds an alert and short-circuits on empty heatId", async () => {
      const addAlert = vi.spyOn(useAlertsStore.getState(), "addAlert");

      await useLiveStore.getState().hydrateFromServer("c1", "");

      expect(addAlert).toHaveBeenCalled();
      expect(useLiveStore.getState().isHydrating).toBe(false);
      addAlert.mockRestore();
    });

    it("stores heat results when response is 200", async () => {
      const results = [{ pairId: "p1", pairNumber: 101, votes: 3, totalJudges: 5, advances: true }];
      mock.onGet("/heats/h1/judge-statuses").reply(200, []);
      mock.onGet("/heats/h1/results").reply(200, results);
      mock.onGet("/competitions/c1/incidents").reply(200, []);

      await useLiveStore.getState().hydrateFromServer("c1", "h1");

      expect(useLiveStore.getState().heatResults).toEqual(results);
    });
  });

  describe("allDancesClosed", () => {
    it("returns false for empty danceStatuses", () => {
      expect(useLiveStore.getState().allDancesClosed()).toBe(false);
    });

    it("returns true when every dance is CLOSED", () => {
      useLiveStore.setState({
        danceStatuses: [
          { danceName: "Samba", status: "CLOSED" },
          { danceName: "Rumba", status: "CLOSED" },
        ],
      });
      expect(useLiveStore.getState().allDancesClosed()).toBe(true);
    });

    it("returns false when any dance is not CLOSED", () => {
      useLiveStore.setState({
        danceStatuses: [
          { danceName: "Samba", status: "CLOSED" },
          { danceName: "Rumba", status: "PENDING" },
        ],
      });
      expect(useLiveStore.getState().allDancesClosed()).toBe(false);
    });
  });

  describe("setDanceConfirmation", () => {
    it("accumulates per-dance entries without clobbering siblings", () => {
      useLiveStore.getState().setDanceConfirmation("d1", 2, 5);
      useLiveStore.getState().setDanceConfirmation("d2", 3, 5);

      expect(useLiveStore.getState().danceConfirmations).toEqual({
        d1: { submitted: 2, total: 5 },
        d2: { submitted: 3, total: 5 },
      });
    });
  });
});
