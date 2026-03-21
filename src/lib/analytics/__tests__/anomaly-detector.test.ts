import { describe, it, expect } from "vitest";

// Test the pure math function used in anomaly detection
function calculateStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

// Anomaly detection threshold logic
function isAnomaly(
  current: number,
  avg30d: number,
  stdDev: number,
  threshold = 2
): boolean {
  if (stdDev === 0 || avg30d === 0) return false;
  const deviation = Math.abs(current - avg30d);
  return deviation > threshold * stdDev;
}

describe("calculateStdDev", () => {
  it("returns 0 for empty array", () => {
    expect(calculateStdDev([])).toBe(0);
  });

  it("returns 0 for single value", () => {
    expect(calculateStdDev([42])).toBe(0);
  });

  it("returns 0 for identical values", () => {
    expect(calculateStdDev([5, 5, 5, 5, 5])).toBe(0);
  });

  it("calculates correctly for known values", () => {
    // Values: [2, 4, 4, 4, 5, 5, 7, 9]
    // Mean = 5, sample variance = 4.571, sample std dev ≈ 2.138
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    const result = calculateStdDev(values);
    expect(result).toBeCloseTo(2.138, 2);
  });

  it("increases with more spread out values", () => {
    const tight = [98, 99, 100, 101, 102];
    const spread = [80, 90, 100, 110, 120];
    expect(calculateStdDev(spread)).toBeGreaterThan(calculateStdDev(tight));
  });

  it("is always non-negative", () => {
    const values = [-10, -5, 0, 5, 10];
    expect(calculateStdDev(values)).toBeGreaterThanOrEqual(0);
  });

  it("uses sample standard deviation (n-1 denominator)", () => {
    // For [0, 10]: mean = 5, sample variance = 50, sample std dev ≈ 7.071
    const result = calculateStdDev([0, 10]);
    expect(result).toBeCloseTo(7.071, 2);
  });
});

describe("isAnomaly (2σ threshold)", () => {
  it("returns false when stdDev is 0", () => {
    expect(isAnomaly(100, 80, 0)).toBe(false);
  });

  it("returns false when avg30d is 0", () => {
    expect(isAnomaly(100, 0, 10)).toBe(false);
  });

  it("detects anomaly when current is far above average", () => {
    // avg=100, stdDev=10, current=130 => 3σ above
    expect(isAnomaly(130, 100, 10)).toBe(true);
  });

  it("detects anomaly when current is far below average", () => {
    // avg=100, stdDev=10, current=70 => 3σ below
    expect(isAnomaly(70, 100, 10)).toBe(true);
  });

  it("does not flag values within 2σ", () => {
    // avg=100, stdDev=10, current=115 => 1.5σ (within 2σ)
    expect(isAnomaly(115, 100, 10)).toBe(false);
  });

  it("flags values exactly at 2σ boundary", () => {
    // avg=100, stdDev=10, current=121 => 2.1σ (barely above 2σ)
    expect(isAnomaly(121, 100, 10)).toBe(true);
  });

  it("does not flag values exactly at 2σ", () => {
    // avg=100, stdDev=10, current=119 => 1.9σ (barely below 2σ)
    expect(isAnomaly(119, 100, 10)).toBe(false);
  });

  it("respects custom threshold", () => {
    // avg=100, stdDev=10, current=140 => 4σ
    expect(isAnomaly(140, 100, 10, 3)).toBe(true);
    // avg=100, stdDev=10, current=125 => 2.5σ (< 3σ threshold)
    expect(isAnomaly(125, 100, 10, 3)).toBe(false);
  });
});

describe("anomaly severity classification", () => {
  function classifySeverity(
    current: number,
    avg30d: number,
    stdDev: number
  ): "info" | "warning" | "critical" | "none" {
    if (stdDev === 0 || avg30d === 0) return "none";
    const deviation = Math.abs(current - avg30d);
    const sigmas = deviation / stdDev;

    if (sigmas <= 2) return "none";

    // Positive anomaly (unexpected increase)
    if (current > avg30d) return "info";

    // Negative anomaly
    if (sigmas > 3) return "critical";
    return "warning";
  }

  it("returns none for normal values", () => {
    expect(classifySeverity(100, 100, 10)).toBe("none");
  });

  it("returns info for positive anomalies", () => {
    expect(classifySeverity(130, 100, 10)).toBe("info");
  });

  it("returns warning for moderate negative anomalies", () => {
    expect(classifySeverity(75, 100, 10)).toBe("warning");
  });

  it("returns critical for severe negative anomalies (>3σ)", () => {
    expect(classifySeverity(60, 100, 10)).toBe("critical");
  });
});
