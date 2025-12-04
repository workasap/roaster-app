import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateCoordinatorAmount } from "../logic";

describe("calculateCoordinatorAmount", () => {
  it("computes total and breakdown for equal shares", () => {
    const res = calculateCoordinatorAmount({
      date: "2025-11-10",
      number_of_artists: 3,
      per_day_rate: 8000,
      work_days: 2,
      artists: "ANYA, AIMEE, BEAU"
    });
    assert.equal(res.total, 48000);
    assert.equal(res.per_day, 24000);
    assert.equal(res.breakdown.length, 3);
    assert.equal(res.breakdown[0].amount, 16000);
  });

  it("handles missing artist names by generating placeholders", () => {
    const res = calculateCoordinatorAmount({
      number_of_artists: 2,
      per_day_rate: 5000,
      work_days: 1
    });
    assert.equal(res.total, 10000);
    assert.equal(res.breakdown.length, 2);
    assert.equal(res.breakdown[0].artist, "ARTIST_1");
  });
});

