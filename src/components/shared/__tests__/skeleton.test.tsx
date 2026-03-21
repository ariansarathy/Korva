import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Skeleton,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonText,
  SkeletonSection,
  DashboardSkeleton,
  AnalyticsSkeleton,
  TablePageSkeleton,
  ReportsSkeleton,
} from "../skeleton";

describe("Skeleton", () => {
  it("renders with base classes", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("animate-pulse");
    expect(el.className).toContain("rounded-md");
    expect(el.className).toContain("bg-surface-hover");
  });

  it("accepts custom className", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("w-20");
  });
});

describe("SkeletonText", () => {
  it("renders correct number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines.length).toBe(5);
  });

  it("defaults to 3 lines", () => {
    const { container } = render(<SkeletonText />);
    const lines = container.querySelectorAll(".animate-pulse");
    expect(lines.length).toBe(3);
  });
});

describe("SkeletonCard", () => {
  it("renders card with border and padding", () => {
    const { container } = render(<SkeletonCard />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded-xl");
    expect(el.className).toContain("border-border");
    expect(el.className).toContain("bg-surface");
  });

  it("renders 3 inner skeleton elements", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(3);
  });
});

describe("SkeletonChart", () => {
  it("renders chart container with bars", () => {
    const { container } = render(<SkeletonChart />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("rounded-xl");
    // Title skeleton + 12 bar skeletons
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(13);
  });
});

describe("SkeletonTable", () => {
  it("renders default 5 rows and 4 columns", () => {
    const { container } = render(<SkeletonTable />);
    // Header row + 5 data rows = 6 row divs, each with 4 skeletons = 24 total
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(24);
  });

  it("respects custom row and column count", () => {
    const { container } = render(<SkeletonTable rows={3} columns={2} />);
    // Header(2) + 3 rows(2 each) = 8
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(8);
  });
});

describe("SkeletonSection", () => {
  it("renders section with icon and content placeholder", () => {
    const { container } = render(<SkeletonSection />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    // icon(1) + title(1) + subtitle(1) + content(1) = 4
    expect(skeletons.length).toBe(4);
  });
});

describe("DashboardSkeleton", () => {
  it("renders 4 KPI card skeletons", () => {
    const { container } = render(<DashboardSkeleton />);
    // Each SkeletonCard has 3 inner skeletons = 12 from cards
    // Plus header(2), chart title+bars(13), insights section(header + 4*2 lines)
    const cards = container.querySelectorAll(".rounded-xl.border");
    // 4 KPI cards + 1 chart + 1 insights sidebar = at least 6
    expect(cards.length).toBeGreaterThanOrEqual(6);
  });
});

describe("AnalyticsSkeleton", () => {
  it("renders header and section skeletons", () => {
    const { container } = render(<AnalyticsSkeleton />);
    const sections = container.querySelectorAll(".rounded-xl.border");
    // 3 SkeletonSection cards + inner elements
    expect(sections.length).toBeGreaterThanOrEqual(3);
  });
});

describe("TablePageSkeleton", () => {
  it("renders header, search bar, and table", () => {
    const { container } = render(<TablePageSkeleton />);
    // Should have a table with rows
    const table = container.querySelector(".rounded-xl.border");
    expect(table).not.toBeNull();
  });
});

describe("ReportsSkeleton", () => {
  it("renders header, report cards, and table", () => {
    const { container } = render(<ReportsSkeleton />);
    const cards = container.querySelectorAll(".rounded-xl.border");
    // 4 SkeletonCards + 1 SkeletonTable = at least 5
    expect(cards.length).toBeGreaterThanOrEqual(5);
  });
});
