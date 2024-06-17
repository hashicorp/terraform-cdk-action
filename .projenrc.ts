/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { TerraformCdkActionProject } from "./projenrc";

const githubActionPinnedVersions = {
  "actions/checkout": "a5ac7e51b41094c92402da3b24376905380afc29", // v4.1.6
  "actions/download-artifact": "65a9edc5881444af0b9093a5e628f2fe47ea3b2e", // v4.1.7
  "actions/github-script": "60a0d83039c74a4aee543508d2ffcb1c3799cdea", // v7.0.1
  "actions/setup-node": "60edb5dd545a775178f52524783378180af0d1f8", // v4.0.2
  "actions/stale": "28ca1036281a5e5922ead5184a1bbf96e5fc984e", // v9.0.0
  "actions/upload-artifact": "65462800fd760344b1a7b4382951275a0abb4808", // v4.3.3
  "amannn/action-semantic-pull-request":
    "cfb60706e18bc85e8aec535e3c577abe8f70378e", // v5.5.2
  "dessant/lock-threads": "1bf7ec25051fe7c00bdd17e6a7cf3d7bfb7dc771", // v5.0.1
  "peter-evans/create-pull-request": "6d6857d36972b65feb161a90e484f2984215f83e", // v6.0.5
  "pr-mpt/actions-semver-aliases": "01b2241f545f14efe72edaa2fcec49705dbe910d", // v2.0.0
  "slackapi/slack-github-action": "70cd7be8e40a46e8b0eced40b0de447bdb42f68e", // v1.26.0
};

const inputs = {
  cdktfVersion: {
    description: "The version of CDKTF to use",
    default: "0.20.7",
    required: false,
    type: "string",
  },
  terraformVersion: {
    description: "The version of Terraform to use",
    default: "1.8.5",
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
