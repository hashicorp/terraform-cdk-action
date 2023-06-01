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
import { CustomizedLicense } from "./projenrc/customized-license";
import { LockIssues } from "./projenrc/lock-issues";

const githubActionPinnedVersions = {
  "actions/checkout": "8e5e7e5ab8b370d6c329ec480221332ada57f0ab", // v3.5.2
  "actions/upload-artifact": "0b7f8abb1508181956e8e162db84b466c27e18ce", // v3.1.2
  "actions/download-artifact": "9bc31d5ccc31df68ecc42ccf4149144866c47d8a", // v3.0.2
  "dessant/lock-threads": "c1b35aecc5cdb1a34539d14196df55838bb2f836", // v4.0.0
  "amannn/action-semantic-pull-request":
    "c3cd5d1ea3580753008872425915e343e351ab54", // v5.2.0
  "actions/setup-node": "64ed1c7eab4cce3362f8c340dee64e5eaeef8f7c", // v3.6.0
  "actions/stale": "1160a2240286f5da8ec72b1c0816ce2481aabf84", // v8.0.0
  "peter-evans/create-pull-request": "284f54f989303d2699d373481a0cfa13ad5a6666", // v5.0.1
  "slackapi/slack-github-action": "e28cf165c92ffef168d23c5c9000cffc8a25e117", // v1.24.0
};

const inputs = {
  cdktfVersion: {
    description: "The version of cdktf CLI to use",
    default: "0.12.2",
    required: false,
    type: "string",
  },
  terraformVersion: {
    description: "The version of terraform to use",
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
  stackName: {
    description:
      "The stack to run / plan, only required when the mode is plan 'plan-only' or 'plan-and-apply'",
    required: false,
    type: "string",
  },
  mode: {
    description:
      "What action to take: 'synth-only', 'plan-only', 'plan-and-apply'",
    required: true,
    type: "string",
  },
  terraformCloudToken: {
    description: "The terraform cloud / terraform enterprise token to use",
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
      "Whether to update comment on the PR rather than adding comment",
    default: "true",
    required: false,
    type: "boolean",
  },
};

const repoName = "terraform-cdk-action";
const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: "main",
  name: repoName,
  githubOptions: {
    mergify: false,
    pullRequestLint: true,
    workflows: true,
  },
  prettier: true,
  projenrcTs: true,
  licensed: false, // we do supply our own license file with a custom header
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
    "projen-github-action-typescript",
    "@types/node",
    "@types/fs-extra",
  ],

  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // packageName: undefined,  /* The "name" in package.json. */
});

new CustomizedLicense(project);
new LockIssues(project);

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

project.synth();
