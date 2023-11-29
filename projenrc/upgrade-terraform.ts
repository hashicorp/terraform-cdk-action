/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { typescript } from "projen";
import { JobPermission, JobStep } from "projen/lib/github/workflows-model";

/**
 * Checks for new versions of Terraform and creates a PR with an upgrade change if there are changes.
 */
export class UpgradeTerraform {
  constructor(project: typescript.TypeScriptProject) {
    const workflow = project.github?.addWorkflow("upgrade-terraform");

    if (!workflow) throw new Error("no workflow defined");

    workflow.on({
      schedule: [{ cron: "39 23 * * 0" }], // Runs once a week
      workflowDispatch: {}, // allow manual triggering
    });

    (workflow.concurrency as any) = "${{ github.workflow }}-${{ github.ref }}";

    const createPRbase: JobStep = {
      uses: "peter-evans/create-pull-request@v3",
      with: {
        branch:
          "auto/upgrade-terraform-1-${{ steps.latest_version.outputs.minor }}",
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
        name: "Upgrade Terraform",
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
            name: "Get current Terraform version",
            id: "current_version",
            run: [
              // HACK ALERT! This will stop working once CDKTF goes 1.0+
              `OLD_VERSION=$(sed -nE 's/default: "(1\..*)",/\\1/p' .projenrc.ts | xargs)`,
              `OLD_VERSION_MINOR=$(cut -d "." -f 2 <<< "$OLD_VERSION")`,
              `echo "value=$OLD_VERSION" >> $GITHUB_OUTPUT`,
              `echo "minor=$OLD_VERSION_MINOR" >> $GITHUB_OUTPUT`,
            ].join("\n"),
          },
          {
            name: "Get latest Terraform version",
            uses: "actions/github-script@v7",
            with: {
              script: [
                `const script = require('./scripts/check-terraform-version.js')`,
                `await script({github, context, core})`,
              ].join("\n"),
            },
          },
          {
            name: "Parse latest Terraform version into variables",
            id: "latest_version",
            run: [
              `TERRAFORM_VERSION_MINOR=$(cut -d "." -f 2 <<< "$NEW_TERRAFORM_VERSION")`,
              `echo "value=$NEW_TERRAFORM_VERSION" >> $GITHUB_OUTPUT`,
              `echo "minor=$TERRAFORM_VERSION_MINOR" >> $GITHUB_OUTPUT`,
            ].join("\n"),
          },
          {
            name: "Run upgrade script",
            if: "steps.current_version.outputs.value != steps.latest_version.outputs.value",
            run: "scripts/update-terraform.sh ${{ steps.latest_version.outputs.value }}",
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
              `NEW_GHA_VERSION=$((GHA_VERSION_MAJOR + 1))`,
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
                "chore!: change default Terraform version to ${{ steps.latest_version.outputs.value }}",
              title:
                "chore!: change default Terraform version to ${{ steps.latest_version.outputs.value }}",
              body: [
                "This PR increases the default version of Terraform used from `${{ steps.current_version.outputs.value }}` to version `${{ steps.latest_version.outputs.value }}`.",
                "This is considered a breaking change because anyone who does not manually specify a `terraformVersion` in their action configuration will automatically start using the new version.",
                " ",
                "Unfortunately, not everything can be automated, and the following steps need to be completed manually:",
                " ",
                "- [ ] Update the _Terraform Version_ to `${{ steps.latest_version.outputs.value }}` in the TFC web UI for the [cdk-action-testing](https://app.terraform.io/app/cdktf/workspaces/cdk-action-testing/settings/general) workspace",
                " ",
                "Please complete the above steps and then mark this PR as ready for review to rerun the checks. Thanks!",
              ].join("\n"),
              draft: true,
            },
          },
          {
            ...createPRbase,
            name: "Create pull request for a non-breaking change",
            if: "steps.current_version.outputs.minor == steps.latest_version.outputs.minor",
            with: {
              ...createPRbase.with,
              "commit-message":
                "fix: change default Terraform version to ${{ steps.latest_version.outputs.value }}",
              title:
                "fix: change default Terraform version to ${{ steps.latest_version.outputs.value }}",
              body: [
                "This PR increases the default version of Terraform used from `${{ steps.current_version.outputs.value }}` to version `${{ steps.latest_version.outputs.value }}`.",
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
