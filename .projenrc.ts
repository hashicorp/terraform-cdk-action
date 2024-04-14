/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { TerraformCdkActionProject } from "./projenrc";

const githubActionPinnedVersions = {
  "actions/checkout": "b4ffde65f46336ab88eb53be808477a3936bae11", // v4.1.1
  "actions/download-artifact": "c850b930e6ba138125429b7e5c93fc707a7f8427", // v4.1.4
  "actions/github-script": "60a0d83039c74a4aee543508d2ffcb1c3799cdea", // v7.0.1
  "actions/setup-node": "60edb5dd545a775178f52524783378180af0d1f8", // v4.0.2
  "actions/stale": "28ca1036281a5e5922ead5184a1bbf96e5fc984e", // v9.0.0
  "actions/upload-artifact": "5d5d22a31266ced268874388b861e4b58bb5c2f3", // v4.3.1
  "amannn/action-semantic-pull-request":
    "e9fabac35e210fea40ca5b14c0da95a099eff26f", // v5.4.0
  "dessant/lock-threads": "1bf7ec25051fe7c00bdd17e6a7cf3d7bfb7dc771", // v5.0.1
  "peter-evans/create-pull-request": "70a41aba780001da0a30141984ae2a0c95d8704e", // v6.0.2
  "pr-mpt/actions-semver-aliases": "01b2241f545f14efe72edaa2fcec49705dbe910d", // v2.0.0
  "slackapi/slack-github-action": "6c661ce58804a1a20f6dc5fbee7f0381b469e001", // v1.25.0
};

const inputs = {
  cdktfVersion: {
    description: "The version of CDKTF to use",
    default: "0.20.6",
    required: false,
    type: "string",
  },
  terraformVersion: {
    description: "The version of Terraform to use",
    default: "1.8.0",
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
