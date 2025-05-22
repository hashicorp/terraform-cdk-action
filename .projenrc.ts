/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { TerraformCdkActionProject } from "./projenrc";

const githubActionPinnedVersions = {
  "actions/checkout": "11bd71901bbe5b1630ceea73d27597364c9af683", // v4.2.2
  "actions/download-artifact": "95815c38cf2ff2164869cbab79da8d1f422bc89e", // v4.2.1
  "actions/github-script": "60a0d83039c74a4aee543508d2ffcb1c3799cdea", // v7.0.1
  "actions/setup-node": "cdca7365b2dadb8aad0a33bc7601856ffabcc48e", // v4.3.0
  "actions/stale": "5bef64f19d7facfb25b37b414482c7164d639639", // v9.1.0
  "actions/upload-artifact": "ea165f8d65b6e75b540449e92b4886f43607fa02", // v4.6.2
  "amannn/action-semantic-pull-request":
    "0723387faaf9b38adef4775cd42cfd5155ed6017", // v5.5.3
  "dessant/lock-threads": "1bf7ec25051fe7c00bdd17e6a7cf3d7bfb7dc771", // v5.0.1
  "hashicorp/setup-copywrite": "32638da2d4e81d56a0764aa1547882fc4d209636", // v1.1.3
  "peter-evans/create-pull-request": "271a8d0340265f705b14b6d32b9829c1cb33d45e", // v7.0.8
  "pr-mpt/actions-semver-aliases": "01b2241f545f14efe72edaa2fcec49705dbe910d", // v2.0.0
  "slackapi/slack-github-action": "485a9d42d3a73031f12ec201c457e2162c45d02d", // v2.0.0
};

const inputs = {
  cdktfVersion: {
    description: "The version of CDKTF to use",
    default: "0.20.12",
    required: false,
    type: "string",
  },
  terraformVersion: {
    description: "The version of Terraform to use",
    default: "1.12.1",
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
  customNpxArgs: {
    description:
      "The additional CLI arguments to pass to npx as part of the cdktf-cli execution.",
    default: "",
    required: false,
    type: "string",
  },
  cdktfArgs: {
    description:
      "The additional CLI arguments to pass to cdktf as part of the cdktf-cli execution.",
    default: "",
    required: false,
    type: "string",
  },
  suppressOutput: {
    description: "Whether to suppress the output of the action in PR comments",
    default: "false",
    required: false,
    type: "boolean",
  },
};

const repoName = "terraform-cdk-action";
const description =
  "The Terraform CDK GitHub Action allows you to run CDKTF as part of your CI/CD workflow.";

const project = new TerraformCdkActionProject({
  name: repoName,
  description,
  inputs,
  metadata: {
    author: "HashiCorp, Inc.",
    description,
    branding: {
      color: "purple",
      icon: "terminal",
    },
  },
});

// Use pinned versions of github actions
Object.entries(githubActionPinnedVersions).forEach(([name, sha]) => {
  project.github?.actions.set(name, `${name}@${sha}`);
});

project.synth();
