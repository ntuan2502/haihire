#!/usr/bin/env node
import { execSync } from "node:child_process";

/**
 * Automates counting added, renamed, and removed tests from git diff
 * to prevent human reporting discrepancies (IVV3-01).
 */
function analyzeTestChanges(baseRef = "HEAD~1", targetRef = "HEAD") {
  console.log(`Analyzing test changes between [${baseRef}] and [${targetRef}]...\n`);

  try {
    const diff = execSync(`git diff ${baseRef}..${targetRef} -- "*.spec.ts" "*.spec.tsx"`, {
      encoding: "utf-8",
    });

    const lines = diff.split("\n");
    let addedCount = 0;
    let removedCount = 0;
    const addedTests: string[] = [];
    const removedTests: string[] = [];

    for (const line of lines) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        const match = line.match(/^\+\s*(?:it|test)\s*\(\s*["'`](.*?)["'`]/);
        if (match) {
          addedCount++;
          addedTests.push(match[1]);
        }
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        const match = line.match(/^-\s*(?:it|test)\s*\(\s*["'`](.*?)["'`]/);
        if (match) {
          removedCount++;
          removedTests.push(match[1]);
        }
      }
    }

    const netNew = addedCount - removedCount;

    console.log("=================================================");
    console.log("            TEST SUITE DIFF AUDIT REPORT         ");
    console.log("=================================================");
    console.log(`Added test declarations (+it/+test):   ${addedCount}`);
    console.log(`Removed test declarations (-it/-test): ${removedCount}`);
    console.log(`Net New Tests:                         ${netNew}`);
    console.log("=================================================\n");

    if (addedTests.length > 0) {
      console.log("Added Tests:");
      addedTests.forEach((t, i) => console.log(`  ${i + 1}. + ${t}`));
    }
    if (removedTests.length > 0) {
      console.log("\nRemoved / Renamed Old Tests:");
      removedTests.forEach((t, i) => console.log(`  ${i + 1}. - ${t}`));
    }

    return { addedCount, removedCount, netNew };
  } catch (err: any) {
    console.error("Failed to calculate test diff:", err.message);
    process.exit(1);
  }
}

const args = process.argv.slice(2);
const base = args[0] || "HEAD~1";
const target = args[1] || "HEAD";
analyzeTestChanges(base, target);
