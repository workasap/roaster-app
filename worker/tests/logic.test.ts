import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildRoasterMatrix,
  computeShootDerivedFields,
  parseArtistList,
  parseRangeToIso
} from "../logic";
import type { Shoot, Vacation } from "../types";

describe("logic helpers", () => {
  it("parses date ranges into ISO values", () => {
    const parsed = parseRangeToIso("01-11-2025 TO 05-11-2025");
    assert.deepEqual(parsed, { start: "2025-11-01", end: "2025-11-05" });
  });

  it("normalizes shoot derived fields", () => {
    const shoot: Partial<Shoot> = {
      inv_date: "2025-11-01",
      invoice_no: "INV-TEST",
      per_day_rate: 5000,
      work_days: 2,
      artist_provided: "Anya, beau"
    };

    const derived = computeShootDerivedFields(shoot);
    assert.equal(derived.total_artists, 2);
    assert.equal(derived.amount, 20000);
    assert.equal(derived.balance, 20000);
    assert.equal(derived.artist_provided, "ANYA, BEAU");
  });

  it("builds roaster matrix and detects conflicts", () => {
    const shoots: Shoot[] = [
      {
        id: 1,
        inv_date: "2025-11-01",
        invoice_no: "INV-001",
        coordinator: "RAHUL",
        location: "MUMBAI",
        work_type: "AD",
        description: "Brand film",
        shoot_start_date: "2025-11-02",
        shoot_end_date: "2025-11-03",
        artist_provided: parseArtistList("ANYA, AIMEE").join(", ")
      }
    ];

    const vacations: Vacation[] = [
      {
        id: 1,
        artist: "ANYA",
        vacation_start: "2025-11-03",
        vacation_end: "2025-11-03",
        vacation_range: "03-11-2025 TO 03-11-2025",
        reason: "Rest"
      } as Vacation
    ];

    const result = buildRoasterMatrix(shoots, vacations, 11, 2025);
    assert.ok(result.matrix["2025-11-02"].ANYA);
    assert.equal(result.matrix["2025-11-03"].ANYA.type, "CONFLICT");
    assert.equal(result.entries.length, 4); // 2 artists * 2 days
  });
});


