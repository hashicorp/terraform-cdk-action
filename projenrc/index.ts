/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { TextFile } from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";
import { UpgradeDependenciesSchedule } from "projen/lib/javascript";
import {
  GitHubActionMetadata,
  GitHubActionTypeScriptOptions,
  GitHubActionTypeScriptProject,
  RunsUsing,
} from "projen-github-action-typescript";
import { AutoApprove } from "./auto-approve";
import { Automerge } from "./automerge";
import { CustomizedLicense } from "./customized-license";
import { LockIssues } from "./lock-issues";
import { UpdateGitTags } from "./update-tags";
import { UpgradeCDKTF } from "./upgrade-cdktf";
import { UpgradeNode } from "./upgrade-node";
import { UpgradeTerraform } from "./upgrade-terraform";
import { generateRandomCron, Schedule } from "./util/random-cron";

type GithubActionInput = {
  type: string;
  /** A `string` description of the input parameter. */
  description: string;
  /** A `boolean` to indicate whether the action requires the input parameter. Set to true when the parameter is required. */
  required: boolean;
  /** A `string` representing the default value. The default value is used when an input parameter isn't specified in a workflow file. */
  default?: string;
  /** If the input parameter is used, this `string` is logged as a warning message. You can use this warning to notify users that the input is deprecated and mention any alternatives. */
  deprecationMessage?: string;
};

export interface TerraformCdkActionOptions
  extends Partial<GitHubActionTypeScriptOptions> {
  readonly metadata: Partial<GitHubActionMetadata>;
  readonly inputs: {
    [inputName: string]: GithubActionInput;
  };
}

export class TerraformCdkActionProject extends GitHubActionTypeScriptProject {
  constructor(options: TerraformCdkActionOptions) {
    const { name, description, inputs, metadata } = options;

    super({
      name: name ?? "terraform-cdk-action",
      description,
      repository: `https://github.com/hashicorp/${name}.git`,
      authorName: "HashiCorp",
      authorUrl: "https://hashicorp.com",
      authorOrganization: true,
      minMajorVersion: 1, // should only be set once you are ready for a 1.0 release!
      defaultReleaseBranch: "main",
      projenrcTs: true,
      prettier: true,
      licensed: false,
      pullRequestTemplate: false,
      mergify: false,
      depsUpgradeOptions: {
        workflowOptions: {
          labels: ["automerge", "auto-approve", "dependencies"],
          schedule: UpgradeDependenciesSchedule.WEEKLY,
        },
      },
      workflowGitIdentity: {
        name: "team-tf-cdk",
        email: "github-team-tf-cdk@hashicorp.com",
      },
      stale: false, // disabling for now but keeping the options below so we can turn it back on if desired
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
        ...metadata,
        inputs: Object.entries(inputs).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: { ...value, type: undefined },
          }),
          {}
        ),
        runs: {
          using: RunsUsing.NODE_20,
          main: "dist/index.js",
        },
      },
      deps: [
        "@actions/exec",
        "@actions/io",
        "@actions/tool-cache",
        "@hashicorp/js-releases@^1.7.0",
      ],
      devDeps: [
        "projen-github-action-typescript@^0.0.395",
        "@types/fs-extra",
        "action-docs",
      ],
      peerDeps: ["constructs@^10.0.0"],
      minNodeVersion: "20.9.0",
    });

    new Automerge(this);
    new AutoApprove(this);
    new CustomizedLicense(this);
    new LockIssues(this);
    new UpdateGitTags(this);
    new UpgradeCDKTF(this);
    new UpgradeNode(this);
    new UpgradeTerraform(this);

    new TextFile(this, "src/inputs.ts", {
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
    this.prettier?.addIgnorePattern("src/inputs.ts");
    this.eslint?.addIgnorePattern("src/inputs.ts");

    this.projectBuild.postCompileTask.exec("npx action-docs --no-banner -u");

    this.addPackageIgnore("scripts");
    this.addPackageIgnore("examples");
    this.addPackageIgnore("projenrc");
    this.addPackageIgnore("/.projenrc.ts");

    this.addPackageIgnore(".copywrite.hcl");
    // Add copywrite headers to all files
    this.buildWorkflow?.addPostBuildSteps(
      {
        name: "Setup Copywrite tool",
        uses: "hashicorp/setup-copywrite",
      },
      { name: "Add headers using Copywrite tool", run: "copywrite headers" }
    );

    // Add a step to notify Slack after a successful release
    // This is because we can't automate updating the Marketplace, sadly
    this.release?.addJobs({
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
                repository: name,
                version: "${{ steps.git_label.outputs.version }}",
              }),
            },
          },
        ],
      },
    });

    const staleWorkflow = this.tryFindObjectFile(".github/workflows/stale.yml");
    staleWorkflow?.addOverride("on.schedule", [
      {
        cron: generateRandomCron({ project: this, maxHour: 4, hourOffset: 1 }),
      },
    ]);

    const upgradeWorkflow = this.tryFindObjectFile(
      ".github/workflows/upgrade-main.yml"
    );
    upgradeWorkflow?.addOverride("on.schedule", [
      {
        cron: generateRandomCron({
          project: this,
          maxHour: 2,
          schedule: Schedule.Weekly,
        }),
      },
    ]);

    const releaseWorkflow = this.tryFindObjectFile(
      ".github/workflows/release.yml"
    );
    releaseWorkflow?.addOverride("on.push", {
      branches: ["main"],
      paths: [
        // only publish a release if these files were changed in any way
        "dist/**",
        "action.yml",
      ],
    });
    // The below is necessary in order to allow the git-tags workflow to run
    releaseWorkflow?.addOverride(
      "jobs.release_github.steps.3.env.GITHUB_TOKEN",
      "${{ secrets.PROJEN_GITHUB_TOKEN }}"
    );
  }
}
