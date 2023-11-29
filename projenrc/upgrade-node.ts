/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { typescript } from "projen";
import { JobPermission, JobStep } from "projen/lib/github/workflows-model";

/**
 * Auto-updates Node to the next LTS version a month before the previous one goes EOL
 */
export class UpgradeNode {
  constructor(project: typescript.TypeScriptProject) {
    const autoWorkflow = project.github?.addWorkflow("upgrade-node");
    const manualWorkflow = project.github?.addWorkflow("upgrade-node-manually");

    if (!autoWorkflow) throw new Error("no workflow defined");
    if (!manualWorkflow) throw new Error("no workflow defined");

    autoWorkflow.on({
      schedule: [{ cron: "13 7 * * *" }], // Runs once a day
      workflowDispatch: {}, // allow manual triggering
    });
    manualWorkflow.on({
      workflowDispatch: {
        inputs: {
          version: {
            description: "Node.js version to upgrade to, in format: 12.34.56",
            required: true,
            type: "string",
          },
        },
      },
    });

    (autoWorkflow.concurrency as any) =
      "${{ github.workflow }}-${{ github.ref }}";

    const commonSteps: JobStep[] = [
      {
        name: "Checkout",
        uses: "actions/checkout@v4",
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
        name: "Get current Node.js version",
        id: "current_version",
        run: [
          `ENGINES_NODE_VERSION=$(npm pkg get engines.node | tr -d '"')`,
          `CURRENT_VERSION=$(cut -d " " -f 2 <<< "$ENGINES_NODE_VERSION")`,
          `CURRENT_VERSION_SHORT=$(cut -d "." -f 1 <<< "$CURRENT_VERSION")`,
          `echo "CURRENT_NODEJS_VERSION=$CURRENT_VERSION" >> $GITHUB_ENV`,
          `echo "CURRENT_NODEJS_VERSION_SHORT=$CURRENT_VERSION_SHORT" >> $GITHUB_ENV`,
          `echo "value=$CURRENT_VERSION" >> $GITHUB_OUTPUT`,
          `echo "short=$CURRENT_VERSION_SHORT" >> $GITHUB_OUTPUT`,
        ].join("\n"),
      },
    ];
    const createPRstep: JobStep = {
      name: "Create Pull Request",
      uses: "peter-evans/create-pull-request@v3",
      with: {
        "commit-message":
          "chore: increase Node.js version to ${{ steps.latest_version.outputs.value }}",
        branch: "auto/upgrade-node-${{ steps.latest_version.outputs.short }}",
        base: "main",
        title:
          "chore: increase Node.js version to ${{ steps.latest_version.outputs.value }}",
        body: [
          "This PR initiates the upgrade of Node.js from `v${{ steps.current_version.outputs.value }}` to `v${{ steps.latest_version.outputs.value }}`.",
          "Unfortunately, not everything can be automated, and the following steps need to be completed manually:",
          " ",
          "- [ ] Check if the `RunsUsing` value should be updated [here](https://github.com/hashicorp/terraform-cdk-action/blob/8b74e0c471bd6eb9ea8869f1a73de83b7129717e/.projenrc.ts#L164). Check [here](https://docs.github.com/en/actions/creating-actions/metadata-syntax-for-github-actions#runs-for-javascript-actions) for supported options.",
          "    - Note that the GitHub Actions runners don't automatically support every LTS version - sometimes they skip one.",
          "- [ ] Run `npx projen build`",
          " ",
          "Please checkout this PR, complete the above steps, push the changes to this branch, and then mark this PR as ready for review to complete the upgrade. Thanks!",
        ].join("\n"),
        labels: "automerge,automated,security",
        token: "${{ secrets.PROJEN_GITHUB_TOKEN }}",
        author: "team-tf-cdk <github-team-tf-cdk@hashicorp.com>",
        committer: "team-tf-cdk <github-team-tf-cdk@hashicorp.com>",
        signoff: true,
        "delete-branch": true,
        draft: true,
      },
    };

    autoWorkflow.addJobs({
      upgrade: {
        name: "Upgrade Node.js",
        runsOn: ["ubuntu-latest"],
        steps: [
          ...commonSteps,
          {
            name: "Get the earliest supported Node.js version whose EOL date is at least a month away",
            uses: "actions/github-script@v7",
            with: {
              script: [
                `const script = require('./scripts/check-node-versions.js')`,
                `await script({github, context, core})`,
              ].join("\n"),
            },
          },
          {
            name: "Run upgrade script",
            if: "env.CURRENT_NODEJS_VERSION_SHORT < env.NEW_NODEJS_VERSION_SHORT",
            run: "scripts/update-node.sh $NEW_NODEJS_VERSION",
          },
          {
            name: "Get values for pull request",
            id: "latest_version",
            if: "env.CURRENT_NODEJS_VERSION_SHORT < env.NEW_NODEJS_VERSION_SHORT",
            run: [
              `echo "value=$NEW_NODEJS_VERSION" >> $GITHUB_OUTPUT`,
              `echo "short=$NEW_NODEJS_VERSION_SHORT" >> $GITHUB_OUTPUT`,
            ].join("\n"),
          },
          createPRstep,
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

    manualWorkflow.addJobs({
      upgrade: {
        name: "Upgrade Node.js to a specified version",
        runsOn: ["ubuntu-latest"],
        steps: [
          ...commonSteps,
          {
            name: "Parse desired new version",
            id: "latest_version",
            run: [
              `NEW_VERSION_SHORT=$(cut -d "." -f 1 <<< "$NEW_VERSION")`,
              `echo "NEW_NODEJS_VERSION=$NEW_VERSION" >> $GITHUB_ENV`,
              `echo "NEW_NODEJS_VERSION_SHORT=$NEW_VERSION_SHORT" >> $GITHUB_ENV`,
              `echo "value=$NEW_VERSION" >> $GITHUB_OUTPUT`,
              `echo "short=$NEW_VERSION_SHORT" >> $GITHUB_OUTPUT`,
            ].join("\n"),
            env: {
              NEW_VERSION: "${{ inputs.version }}",
            },
          },
          // @TODO should we try to validate that this new version actually exists...?
          {
            name: "Run upgrade script",
            if: "env.CURRENT_NODEJS_VERSION != env.NEW_NODEJS_VERSION",
            run: "scripts/update-node.sh $NEW_NODEJS_VERSION",
          },
          createPRstep,
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
