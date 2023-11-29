/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { typescript } from "projen";
import { JobPermission, JobStep } from "projen/lib/github/workflows-model";

/**
 * Checks for new versions of CDKTF and creates a PR with an upgrade change if there are changes.
 */
export class UpgradeCDKTF {
  constructor(project: typescript.TypeScriptProject) {
    const workflow = project.github?.addWorkflow("upgrade-cdktf");

    if (!workflow) throw new Error("no workflow defined");

    workflow.on({
      schedule: [{ cron: "11 */6 * * *" }], // Runs four times a day
      workflowDispatch: {}, // allow manual triggering
    });

    (workflow.concurrency as any) = "${{ github.workflow }}-${{ github.ref }}";

    const createPRbase: JobStep = {
      uses: "peter-evans/create-pull-request@v3",
      with: {
        branch: "auto/upgrade-cdktf-${{ steps.latest_version.outputs.minor }}",
        base: "main",
        labels: "automerge,dependencies",
        token: "${{ secrets.PROJEN_GITHUB_TOKEN }}",
        author: "team-tf-cdk <github-team-tf-cdk@hashicorp.com>",
        committer: "team-tf-cdk <github-team-tf-cdk@hashicorp.com>",
        signoff: true,
        "delete-branch": true,
      },
    };

    workflow.addJobs({
      upgrade: {
        name: "Upgrade CDKTF",
        runsOn: ["ubuntu-latest"],
        steps: [
          {
            name: "Checkout",
            uses: "actions/checkout@v4",
            with: {
              "fetch-depth": 0,
            },
          },
          {
            name: "Setup Node.js",
            uses: "actions/setup-node@v4",
            with: {
              "node-version": project.minNodeVersion,
            },
          },
          {
            name: "Install",
            run: "yarn install",
          },
          {
            name: "Get current CDKTF version",
            id: "current_version",
            run: [
              // HACK ALERT! This will stop working once CDKTF goes 1.0+
              `OLD_VERSION=$(sed -nE 's/default: "(0\..*)",/\\1/p' .projenrc.ts | xargs)`,
              `OLD_VERSION_MINOR=$(cut -d "." -f 2 <<< "$OLD_VERSION")`,
              `echo "value=$OLD_VERSION" >> $GITHUB_OUTPUT`,
              `echo "minor=$OLD_VERSION_MINOR" >> $GITHUB_OUTPUT`,
            ].join("\n"),
          },
          {
            name: "Get latest CDKTF version",
            id: "latest_version",
            run: [
              `CDKTF_VERSION=$(yarn info cdktf --json | jq -r '.data.version')`,
              `CDKTF_VERSION_MINOR=$(cut -d "." -f 2 <<< "$CDKTF_VERSION")`,
              `echo "value=$CDKTF_VERSION" >> $GITHUB_OUTPUT`,
              `echo "minor=$CDKTF_VERSION_MINOR" >> $GITHUB_OUTPUT`,
            ].join("\n"),
            // IMPORTANT: the above behavior changed in Yarn 2+; `yarn info` instead gives the version of the installed package
            // If/when we upgrade we'll likely want to switch to `yarn npm info`: https://yarnpkg.com/cli/npm/info
          },
          {
            name: "Run upgrade script",
            if: "steps.current_version.outputs.value != steps.latest_version.outputs.value",
            run: "scripts/update-cdktf.sh ${{ steps.latest_version.outputs.value }}",
          },
          {
            name: "Get the latest version of this GitHub Action from git",
            if: "steps.current_version.outputs.minor != steps.latest_version.outputs.minor",
            id: "github_action",
            run: 'echo "version=$(git describe --tags | cut -d "-" -f 1)" >> $GITHUB_OUTPUT',
            // the `cut` is here because if you run this on a branch, the tag looks like `v0.3.7-2-gc4ec783`
          },
          {
            name: "Update the README for a breaking change",
            if: "steps.current_version.outputs.minor != steps.latest_version.outputs.minor",
            env: {
              GHA_VERSION: "${{ steps.github_action.outputs.version }}",
            },
            run: [
              `GHA_VERSION_MAJOR=$(cut -d "." -f 1 <<< "$GHA_VERSION" | cut -c2-)`,
              `NEW_GHA_VERSION=$((GHA_VERSION_MAJOR+1))`,
              `sed -i 's/terraform-cdk-action@v.*/terraform-cdk-action@v'"$NEW_GHA_VERSION"'/' "./README.md"`,
            ].join("\n"),
          },
          {
            ...createPRbase,
            name: "Create pull request for a breaking change",
            if: "steps.current_version.outputs.minor != steps.latest_version.outputs.minor",
            with: {
              ...createPRbase.with,
              "commit-message":
                "chore!: change default CDKTF version to ${{ steps.latest_version.outputs.value }}",
              title:
                "chore!: change default CDKTF version to ${{ steps.latest_version.outputs.value }}",
              body: [
                "This PR increases the default version of CDKTF used from `${{ steps.current_version.outputs.value }}` to version `${{ steps.latest_version.outputs.value }}`.",
                "This is considered a breaking change because anyone who does not manually specify a `cdktfVersion` in their action configuration will automatically start using the new version.",
              ].join("\n"),
            },
          },
          {
            ...createPRbase,
            name: "Create pull request for a non-breaking change",
            if: "steps.current_version.outputs.minor == steps.latest_version.outputs.minor",
            with: {
              ...createPRbase.with,
              "commit-message":
                "fix: change default CDKTF version to ${{ steps.latest_version.outputs.value }}",
              title:
                "fix: change default CDKTF version to ${{ steps.latest_version.outputs.value }}",
              body: [
                "This PR increases the default version of CDKTF used from `${{ steps.current_version.outputs.value }}` to version `${{ steps.latest_version.outputs.value }}`.",
                "This is not considered a breaking change because it's just a patch release that shouldn't have any backwards incompatibilities.",
              ].join("\n"),
            },
          },
        ],
        env: {
          CI: "true",
          CHECKPOINT_DISABLE: "1",
        },
        permissions: {
          contents: JobPermission.READ,
        },
      },
    });
  }
}
