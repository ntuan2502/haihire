import { describe, it, expect } from "vitest";
import { checkGithubActionVersions } from "../check-github-action-versions";

describe("CI Gate: lint:github-action-versions (scripts/check-github-action-versions.ts)", () => {
  it("Test 1: passes when workflow uses dorny/paths-filter@v4", () => {
    const virtualFiles = {
      "ci-dev.yml": `
name: CI Dev
jobs:
  filter:
    steps:
      - uses: actions/checkout@v5
      - uses: dorny/paths-filter@v4
        id: filter
`,
    };

    const result = checkGithubActionVersions({ files: virtualFiles });
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("Test 2: fails when workflow uses dorny/paths-filter@v3 with deprecation message", () => {
    const virtualFiles = {
      "ci-feature.yml": `
name: CI Feature
jobs:
  filter:
    steps:
      - uses: dorny/paths-filter@v3
`,
    };

    const result = checkGithubActionVersions({ files: virtualFiles });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].message).toBe(
      "dorny/paths-filter@v3 is deprecated (Node 20). Use dorny/paths-filter@v4 or newer.",
    );
    expect(result.violations[0].file).toBe("ci-feature.yml");
    expect(result.violations[0].line).toBe(6);
  });

  it("Test 3: fails when workflow uses actions/checkout@v4", () => {
    const virtualFiles = {
      "ci-staging.yml": `
name: CI Staging
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
`,
    };

    const result = checkGithubActionVersions({ files: virtualFiles });
    expect(result.passed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].action).toBe("actions/checkout");
    expect(result.violations[0].currentVersion).toBe("v4");
    expect(result.violations[0].message).toBe(
      "actions/checkout@v4 is deprecated (Node 20). Use actions/checkout@v5 or newer.",
    );
  });

  it("Test 4: passes when workflow contains only actions not in the minimum version table", () => {
    const virtualFiles = {
      "custom-deploy.yml": `
name: Deploy
jobs:
  deploy:
    steps:
      - uses: docker/login-action@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - uses: custom-org/my-action@v1
`,
    };

    const result = checkGithubActionVersions({ files: virtualFiles });
    expect(result.passed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("Test 5: fails when workflow uses unpinned aquasecurity/trivy-action and passes with v0.36.0", () => {
    const virtualFilesFail = {
      "cd-release.yml": `
name: CD Release
jobs:
  scan:
    steps:
      - uses: aquasecurity/trivy-action@master
`,
    };

    const resultFail = checkGithubActionVersions({ files: virtualFilesFail });
    expect(resultFail.passed).toBe(false);
    expect(resultFail.violations).toHaveLength(1);
    expect(resultFail.violations[0].action).toBe("aquasecurity/trivy-action");
    expect(resultFail.violations[0].minimumVersion).toBe("v0.36.0");

    const virtualFilesPass = {
      "cd-release.yml": `
name: CD Release
jobs:
  scan:
    steps:
      - uses: aquasecurity/trivy-action@v0.36.0
`,
    };

    const resultPass = checkGithubActionVersions({ files: virtualFilesPass });
    expect(resultPass.passed).toBe(true);
    expect(resultPass.violations).toHaveLength(0);
  });
});
