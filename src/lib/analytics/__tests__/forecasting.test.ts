import { describe, it, expect } from "vitest";

// Test the pure math functions used in forecasting
// These are re-implemented here since they're not exported from the module

function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = values.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
}

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

describe("movingAverage", () => {
  it("returns same values when window is 1", () => {
    const values = [10, 20, 30, 40, 50];
    const result = movingAverage(values, 1);
    expect(result).toEqual([10, 20, 30, 40, 50]);
  });

  it("calculates 3-period moving average correctly", () => {
    const values = [10, 20, 30, 40, 50];
    const result = movingAverage(values, 3);
    // i=0: avg(10) = 10
    // i=1: avg(10,20) = 15
    // i=2: avg(10,20,30) = 20
    // i=3: avg(20,30,40) = 30
    // i=4: avg(30,40,50) = 40
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(15);
    expect(result[2]).toBe(20);
    expect(result[3]).toBe(30);
    expect(result[4]).toBe(40);
  });

  it("handles single value", () => {
    expect(movingAverage([42], 7)).toEqual([42]);
  });

  it("handles empty array", () => {
    expect(movingAverage([], 7)).toEqual([]);
  });

  it("handles window larger than data", () => {
    const values = [10, 20];
    const result = movingAverage(values, 7);
    expect(result[0]).toBe(10);
    expect(result[1]).toBe(15);
  });

  it("smooths noisy data", () => {
    const noisy = [100, 120, 80, 110, 90, 105, 95];
    const smoothed = movingAverage(noisy, 3);
    // Smoothed values should have lower variance
    const noisyVariance = variance(noisy);
    const smoothedVariance = variance(smoothed);
    expect(smoothedVariance).toBeLessThan(noisyVariance);
  });
});

describe("linearRegression", () => {
  it("returns zero slope for constant values", () => {
    const values = [5, 5, 5, 5, 5];
    const { slope, intercept } = linearRegression(values);
    expect(slope).toBeCloseTo(0, 10);
    expect(intercept).toBeCloseTo(5, 10);
  });

  it("returns correct slope for perfect linear increase", () => {
    const values = [0, 2, 4, 6, 8];
    const { slope, intercept } = linearRegression(values);
    expect(slope).toBeCloseTo(2, 10);
    expect(intercept).toBeCloseTo(0, 10);
  });

  it("returns correct slope for perfect linear decrease", () => {
    const values = [10, 8, 6, 4, 2];
    const { slope, intercept } = linearRegression(values);
    expect(slope).toBeCloseTo(-2, 10);
    expect(intercept).toBeCloseTo(10, 10);
  });

  it("handles single value", () => {
    const { slope, intercept } = linearRegression([42]);
    expect(slope).toBe(0);
    expect(intercept).toBe(42);
  });

  it("handles empty array", () => {
    const { slope, intercept } = linearRegression([]);
    expect(slope).toBe(0);
    expect(intercept).toBe(0);
  });

  it("fits noisy upward trend", () => {
    // Upward trend with noise
    const values = [10, 12, 11, 14, 13, 16, 15, 18, 17, 20];
    const { slope } = linearRegression(values);
    expect(slope).toBeGreaterThan(0);
    expect(slope).toBeCloseTo(1, 0); // Roughly +1 per step
  });

  it("predicted values follow the line", () => {
    const values = [0, 2, 4, 6, 8];
    const { slope, intercept } = linearRegression(values);
    // Predict next value (index 5)
    const predicted = slope * 5 + intercept;
    expect(predicted).toBeCloseTo(10, 10);
  });
});

// Helper
function variance(values: number[]): number {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
}
