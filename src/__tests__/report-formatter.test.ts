import { describe, expect, it } from "vitest";
import { ReportFormatter } from "../formatters/report-formatter.js";
import type { AggregatedTestResults } from "../types/test-results.js";
import type { AggregatedCoverageResults } from "../types/coverage.js";

describe("ReportFormatter", () => {
  const formatter = new ReportFormatter();

  it("should format results with all passing tests", () => {
    const results: AggregatedTestResults = {
      totalTests: 10,
      passedTests: 10,
      failedTests: 0,
      skippedTests: 0,
      totalTime: 5.5,
      passRate: 100,
      failedTestCases: [],
    };

    const comment = formatter.formatReport(results);

    expect(comment).toContain("✅ **10 passed**");
    expect(comment).toContain("**Total: 10**");
    expect(comment).toContain("**Pass Rate: 100%**");
    expect(comment).toContain("All tests are passing successfully.");
    expect(comment).toContain("5.50s");
  });

  it("should format results with failed tests", () => {
    const results: AggregatedTestResults = {
      totalTests: 5,
      passedTests: 3,
      failedTests: 2,
      skippedTests: 0,
      totalTime: 2.5,
      passRate: 60,
      failedTestCases: [
        {
          suiteName: "Test Suite 1",
          testCase: {
            classname: "test/example.test.ts",
            name: "should fail test 1",
            time: 0.5,
            failure: {
              message: "Expected 5 to equal 6",
              type: "AssertionError",
              content: "Error: Expected 5 to equal 6\n    at Object.toBe",
            },
          },
        },
        {
          suiteName: "Test Suite 2",
          testCase: {
            classname: "test/another.test.ts",
            name: "should fail test 2",
            time: 0.3,
            failure: {
              message: "Timeout exceeded",
            },
          },
        },
      ],
    };

    const comment = formatter.formatReport(results);

    expect(comment).toContain("✅ **3 passed**");
    expect(comment).toContain("❌ **2 failed**");
    expect(comment).toContain("**Pass Rate: 60%**");
    expect(comment).toContain("### ❌ Failed Tests");
    expect(comment).toContain("`should fail test 1`");
    expect(comment).toContain("**File:** `test/example.test.ts`");
    expect(comment).toContain("**Error:** Expected 5 to equal 6");
    expect(comment).toContain("<details>");
    expect(comment).toContain("<summary>Stack Trace</summary>");
    expect(comment).toContain("at Object.toBe");
    expect(comment).toContain("`should fail test 2`");
    expect(comment).toContain("**Error:** Timeout exceeded");
  });

  it("should format results with skipped tests", () => {
    const results: AggregatedTestResults = {
      totalTests: 8,
      passedTests: 5,
      failedTests: 1,
      skippedTests: 2,
      totalTime: 3.2,
      passRate: 62.5,
      failedTestCases: [
        {
          suiteName: "Test Suite",
          testCase: {
            classname: "test/example.test.ts",
            name: "failing test",
            time: 0.5,
            failure: {
              message: "Test failed",
            },
          },
        },
      ],
    };

    const comment = formatter.formatReport(results);

    expect(comment).toContain("✅ **5 passed**");
    expect(comment).toContain("❌ **1 failed**");
    expect(comment).toContain("⏭️ **2 skipped**");
    expect(comment).toContain("**Total: 8**");
    expect(comment).toContain("**Pass Rate: 62.5%**");
  });

  it("should format execution time correctly for different durations", () => {
    // Less than 1 second (milliseconds)
    let results: AggregatedTestResults = {
      totalTests: 1,
      passedTests: 1,
      failedTests: 0,
      skippedTests: 0,
      totalTime: 0.234,
      passRate: 100,
      failedTestCases: [],
    };

    let comment = formatter.formatReport(results);
    expect(comment).toContain("234ms");

    // Seconds
    results = {
      ...results,
      totalTime: 5.67,
    };
    comment = formatter.formatReport(results);
    expect(comment).toContain("5.67s");

    // Minutes and seconds
    results = {
      ...results,
      totalTime: 125.4,
    };
    comment = formatter.formatReport(results);
    expect(comment).toContain("2m 5s");
  });

  it("should add identifier to comment", () => {
    const comment = "Test comment";
    const withIdentifier = formatter.addIdentifier(comment);

    expect(withIdentifier).toContain(ReportFormatter.getCommentIdentifier());
    expect(withIdentifier).toContain("Test comment");
  });

  it("should handle tests with no stack trace", () => {
    const results: AggregatedTestResults = {
      totalTests: 1,
      passedTests: 0,
      failedTests: 1,
      skippedTests: 0,
      totalTime: 0.5,
      passRate: 0,
      failedTestCases: [
        {
          suiteName: "Test Suite",
          testCase: {
            classname: "test/example.test.ts",
            name: "test without stack trace",
            time: 0.5,
            failure: {
              message: "Simple failure",
            },
          },
        },
      ],
    };

    const comment = formatter.formatReport(results);

    expect(comment).toContain("**Error:** Simple failure");
    // Should not have details section for stack trace
    expect(comment.split("<details>").length - 1).toBe(0);
  });

  describe("Coverage Section", () => {
    it("should show checkmark for high patch coverage (>= 80%) even with project misses", () => {
      const coverageResults: AggregatedCoverageResults = {
        totalStatements: 1000,
        coveredStatements: 800,
        totalConditionals: 100,
        coveredConditionals: 80,
        totalMethods: 50,
        coveredMethods: 40,
        lineRate: 80,
        branchRate: 80,
        files: [],
        patchCoverageRate: 100,
        totalMisses: 1348,
      };

      const comment = formatter.formatReport(undefined, coverageResults);

      // Should show checkmark because patch coverage is >= 80%
      expect(comment).toContain(":white_check_mark: Patch coverage is **100.00%**.");
      // Should show project misses as separate info
      expect(comment).toContain("Project has **1348** uncovered lines.");
      // Should NOT have the old conflated message format
      expect(comment).not.toContain("with **1348 lines** missing coverage");
    });

    it("should show X for low patch coverage (< 80%)", () => {
      const coverageResults: AggregatedCoverageResults = {
        totalStatements: 1000,
        coveredStatements: 500,
        totalConditionals: 100,
        coveredConditionals: 50,
        totalMethods: 50,
        coveredMethods: 25,
        lineRate: 50,
        branchRate: 50,
        files: [],
        patchCoverageRate: 50,
        totalMisses: 500,
      };

      const comment = formatter.formatReport(undefined, coverageResults);

      // Should show X because patch coverage is < 80%
      expect(comment).toContain(":x: Patch coverage is **50.00%**.");
      // Should show project misses as separate info
      expect(comment).toContain("Project has **500** uncovered lines.");
    });

    it("should show checkmark with no project misses message when totalMisses is 0", () => {
      const coverageResults: AggregatedCoverageResults = {
        totalStatements: 100,
        coveredStatements: 100,
        totalConditionals: 10,
        coveredConditionals: 10,
        totalMethods: 5,
        coveredMethods: 5,
        lineRate: 100,
        branchRate: 100,
        files: [],
        patchCoverageRate: 100,
        totalMisses: 0,
      };

      const comment = formatter.formatReport(undefined, coverageResults);

      // Should show checkmark
      expect(comment).toContain(":white_check_mark: Patch coverage is **100.00%**.");
      // Should NOT mention project uncovered lines
      expect(comment).not.toContain("uncovered lines");
    });

    it("should use lineRate as fallback when patchCoverageRate is undefined", () => {
      const coverageResults: AggregatedCoverageResults = {
        totalStatements: 1000,
        coveredStatements: 850,
        totalConditionals: 100,
        coveredConditionals: 85,
        totalMethods: 50,
        coveredMethods: 42,
        lineRate: 85,
        branchRate: 85,
        files: [],
        // patchCoverageRate is undefined
        totalMisses: 150,
      };

      const comment = formatter.formatReport(undefined, coverageResults);

      // Should use lineRate (85%) which is >= 80%, so checkmark
      expect(comment).toContain(":white_check_mark: Patch coverage is **85.00%**.");
    });
  });
});
