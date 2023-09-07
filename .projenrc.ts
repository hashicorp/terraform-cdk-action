/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { TextFile } from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";
import { UpgradeDependenciesSchedule } from "projen/lib/javascript";
import {
  GitHubActionTypeScriptProject,
  RunsUsing,
} from "projen-github-action-typescript";
import { AutoApprove } from "./projenrc/auto-approve";
import { Automerge } from "./projenrc/automerge";
import { CustomizedLicense } from "./projenrc/customized-license";
import { LockIssues } from "./projenrc/lock-issues";
import { UpdateGitTags } from "./projenrc/update-tags";
import { UpgradeCDKTF } from "./projenrc/upgrade-cdktf";
import { UpgradeNode } from "./projenrc/upgrade-node";
import { UpgradeTerraform } from "./projenrc/upgrade-terraform";

const githubActionPinnedVersions = {
  "actions/checkout": "c85c95e3d7251135ab7dc9ce3241c5835cc595a9", // v3.5.3
  "actions/download-artifact": "9bc31d5ccc31df68ecc42ccf4149144866c47d8a", // v3.0.2
  "actions/github-script": "d7906e4ad0b1822421a7e6a35d5ca353c962f410", // v6.4.1
  "actions/setup-node": "5e21ff4d9bc1a8cf6de233a3057d20ec6b3fb69d", // v3.8.1
  "actions/stale": "1160a2240286f5da8ec72b1c0816ce2481aabf84", // v8.0.0
  "actions/upload-artifact": "0b7f8abb1508181956e8e162db84b466c27e18ce", // v3.1.2
  "amannn/action-semantic-pull-request":
    "c3cd5d1ea3580753008872425915e343e351ab54", // v5.2.0
  "dessant/lock-threads": "be8aa5be94131386884a6da4189effda9b14aa21", // v4.0.1
  "peter-evans/create-pull-request": "284f54f989303d2699d373481a0cfa13ad5a6666", // v5.0.1
  "pr-mpt/actions-semver-aliases": "01b2241f545f14efe72edaa2fcec49705dbe910d", // v2.0.0
  "slackapi/slack-github-action": "e28cf165c92ffef168d23c5c9000cffc8a25e117", // v1.24.0
};

const inputs = {
  cdktfVersion: {
    description: "The version of CDKTF to use",
    default: "0.12.2",
    required: false,
    type: "string",
  },
  terraformVersion: {
    description: "The version of Terraform to use",
    default: "1.3.0",
    required: false,
    type: "string",
  },
  workingDirectory: {
    description: "The directory to use for the project",
    default: "./",
    required: false,
    type: "string",
  },
  mode: {
    description:
      "What action to take: `synth-only` runs only the synthesis, `plan-only` only runs a plan, `auto-approve-apply` runs a plan and then performs an apply, `auto-approve-destroy` runs a plan and then performs a destroy",
    required: true,
    type: "string",
  },
  stackName: {
    description:
      "The stack to run / plan, only required when the mode is `plan-only` or `plan-and-apply`",
    required: false,
    type: "string",
  },
  terraformCloudToken: {
    description: "The Terraform Cloud / Terraform Enterprise token to use",
    required: false,
    type: "string",
  },
  githubToken: {
    description: "The github token to use",
    required: false,
    type: "string",
  },
  commentOnPr: {
    description: "Whether to comment the plan / the status on the PR",
    default: "true",
    required: false,
    type: "boolean",
  },
  updateComment: {
    description:
      "Whether to update the last comment on the PR rather than adding a new comment",
    default: "true",
    required: false,
    type: "boolean",
  },
};

const repoName = "terraform-cdk-action";
const project = new GitHubActionTypeScriptProject({
  name: repoName,
  description:
    "The Terraform CDK GitHub Action allows you to run CDKTF as part of your CI/CD workflow.",
  repository: `https://github.com/hashicorp/${repoName}.git`,
  authorName: "HashiCorp",
  authorUrl: "https://hashicorp.com",
  authorOrganization: true,
  defaultReleaseBranch: "main",
  projenrcTs: true,
  prettier: true,
  licensed: false,
  pullRequestTemplate: false,
  mergify: false,
  depsUpgradeOptions: {
    workflowOptions: {
      labels: ["automerge", "dependencies"],
      schedule: UpgradeDependenciesSchedule.MONTHLY,
    },
  },
  workflowGitIdentity: {
    name: "team-tf-cdk",
    email: "github-team-tf-cdk@hashicorp.com",
  },
  stale: true,
  staleOptions: {
    issues: {
      exemptLabels: ["backlog", "help wanted"],
      staleLabel: "stale",
      daysBeforeStale: 30,
      staleMessage:
        "Hi there! 👋 We haven't heard from you in 30 days and would like to know if the problem has been resolved or if " +
        "you still need help. If we don't hear from you before then, I'll auto-close this issue in 30 days.",
      daysBeforeClose: 30,
      closeMessage:
        "I'm closing this issue because we haven't heard back in 60 days. ⌛️ If you still need help, feel free to reopen the issue!",
    },
    pullRequest: {
      exemptLabels: ["backlog", "help wanted"],
      staleLabel: "stale",
      daysBeforeStale: 60,
      staleMessage:
        "Hi there! 👋 We haven't heard from you in 60 days and would like to know if you're still working on this or need help. " +
        "If we don't hear from you before then, I'll auto-close this PR in 30 days.",
      daysBeforeClose: 30,
      closeMessage:
        "I'm closing this pull request because we haven't heard back in 90 days. ⌛️ If you're still working on this, feel free to reopen the PR or create a new one!",
    },
  },

  actionMetadata: {
    author: "HashiCorp, Inc.",
    description:
      "The Terraform CDK GitHub Action allows you to run CDKTF as part of your CI/CD workflow.",
    branding: {
      color: "purple",
      icon: "terminal",
    },
    inputs: Object.entries(inputs).reduce(
      (acc, [key, value]) => ({ ...acc, [key]: { ...value, type: undefined } }),
      {}
    ),
    runs: {
      using: RunsUsing.NODE_16,
      main: "dist/index.js",
    },
  },

  deps: [
    "@actions/exec",
    "@actions/io",
    "@actions/tool-cache",
    "@hashicorp/js-releases",
  ],
  devDeps: [
    "projen-github-action-typescript@^0.0.392",
    "@types/fs-extra",
    "action-docs",
    "node-fetch@~2", // @TODO this can be removed once we upgrade to Node 18 and use native fetch
  ],
  minNodeVersion: "18.12.0",
});

new Automerge(project);
new AutoApprove(project);
new CustomizedLicense(project);
new LockIssues(project);
new UpdateGitTags(project);
new UpgradeCDKTF(project);
new UpgradeNode(project);
new UpgradeTerraform(project);

new TextFile(project, "src/inputs.ts", {
  committed: true,
  marker: true,
  lines: [
    `/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as core from "@actions/core";`,
    "",
    Object.entries(inputs)
      .map(
        ([key, value]) =>
          `export const ${key}: ${value.type} = core.${
            value.type === "boolean" ? "getBooleanInput" : "getInput"
          }("${key}");`
      )
      .join("\n"),
    "",
  ],
});
project.prettier?.addIgnorePattern("src/inputs.ts");

project.projectBuild.postCompileTask.exec("npx action-docs --no-banner -u");

project.addPackageIgnore("scripts");
project.addPackageIgnore("examples");
project.addPackageIgnore("projenrc");
project.addPackageIgnore("/.projenrc.ts");

project.addPackageIgnore(".copywrite.hcl");
// Add copywrite headers to all files
project.buildWorkflow?.addPostBuildSteps(
  {
    name: "Setup Copywrite tool",
    uses: "hashicorp/setup-copywrite@867a1a2a064a0626db322392806428f7dc59cb3e", // v1.1.2
  },
  { name: "Add headers using Copywrite tool", run: "copywrite headers" }
);

// Use pinned versions of github actions
Object.entries(githubActionPinnedVersions).forEach(([name, sha]) => {
  project.github?.actions.set(name, `${name}@${sha}`);
});

// Add a step to notify Slack after a successful release
// This is because we can't automate updating the Marketplace, sadly
project.release?.addJobs({
  release_notification: {
    name: "Notify Slack about the release",
    needs: ["release_github"],
    runsOn: ["ubuntu-latest"],
    permissions: {
      contents: JobPermission.READ,
    },
    steps: [
      {
        name: "git checkout",
        uses: "actions/checkout@v3",
        with: {
          "fetch-depth": 0,
        },
      },
      {
        name: "Get the latest tag (version) from git",
        id: "git_label",
        run: 'echo "version=$(git describe --tags)" >> $GITHUB_OUTPUT',
      },
      {
        name: "Notify Slack via a custom Workflow webhook",
        uses: "slackapi/slack-github-action@v1",
        env: { SLACK_WEBHOOK_URL: "${{ secrets.SLACK_WEBHOOK_URL }}" },
        with: {
          payload: JSON.stringify({
            repository: repoName,
            version: "${{ steps.git_label.outputs.version }}",
          }),
        },
      },
    ],
  },
});

const releaseWorkflow = project.tryFindObjectFile(
  ".github/workflows/release.yml"
);
releaseWorkflow?.addOverride("on.push", {
  branches: ["main"],
  "paths-ignore": [
    // don't do a release if the change was only to these files/directories
    "examples/**",
    ".github/ISSUE_TEMPLATE/**",
    ".github/CODEOWNERS",
    ".github/dependabot.yml",
    ".github/**/*.md",
  ],
});
// The below is necessary in order to allow the git-tags workflow to run
releaseWorkflow?.addOverride(
  "jobs.release_github.steps.3.env.GITHUB_TOKEN",
  "${{ secrets.PROJEN_GITHUB_TOKEN }}"
);

project.synth();
