const { TextFile } = require("projen");
const {
  GitHubActionTypeScriptProject,
} = require("projen-github-action-typescript");

const inputs = {
  cdktfVersion: {
    description: "The version of cdktf CLI to use",
    default: "0.12.2",
    required: false,
    type: "string",
  },
  terraformVersion: {
    description: "The version of terraform to use",
    default: "1.2.2",
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
};

const project = new GitHubActionTypeScriptProject({
  defaultReleaseBranch: "main",
  name: "terraform-cdk-action",
  githubOptions: {
    mergify: false,
    pullRequestLint: true,
    workflows: true,
  },
  prettier: true,

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

new TextFile(project, "src/inputs.ts", {
  committed: true,
  marker: true,
  lines: [
    `import * as core from "@actions/core";`,
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
project.prettier.addIgnorePattern("src/inputs.ts");

project.synth();
