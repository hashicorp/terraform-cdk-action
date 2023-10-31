/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { typescript } from "projen";
import { JobPermission } from "projen/lib/github/workflows-model";

/**
 * Automatically create/update floating version tag aliases, e.g.
 * - Release v3.14.1 has tags: v3.14.1, v3.14, v3
 * - When v3.14.2 is published, this script runs
 *   - Now, release v3.14.2 has tags: v3.14.2, v3.14, v3
 *   - Release v3.14.1 only has the tag v3.14.1
 * - When v3.15.0 is published, this script runs
 *   - Now, release v3.15.0 has tags: v3.15.0, v3.15, v3
 *   - Release v3.14.2 has tags: v3.14.2, v3.14
 *
 * This is to accommodate the GitHub Actions convention to add actions like:
 *     actions/checkout@v3.5
 *     actions/setup-node@v3
 */
export class UpdateGitTags {
  constructor(project: typescript.TypeScriptProject) {
    const workflow = project.github?.addWorkflow("git-tags");

    if (!workflow) throw new Error("no workflow defined");

    workflow.runName = "Update git version aliases";
    workflow.on({
      push: {
        tags: ["v[0-9]+.[0-9]+.[0-9]+"],
      },
    });

    workflow.addJob("tag", {
      runsOn: ["ubuntu-latest"],
      permissions: {
        contents: JobPermission.WRITE,
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
          id: "get_aliases",
          uses: "pr-mpt/actions-semver-aliases@v2",
          with: {
            version: "${{ github.ref_name }}",
          },
        },
        {
          name: "Delete tags if they are already in use",
          run: 'for t in ${ALIAS_ARR//,/ }; do git push origin :refs/tags/"$t" && git tag -d "$t"; done',
          env: {
            ALIAS_ARR: "${{ steps.get_aliases.outputs.csv }}",
          },
          continueOnError: true,
        },
        {
          name: "Pause to allow the remote deletion to be fully processed",
          run: "sleep 10s",
        },
        {
          name: "Create the new tags",
          run: 'for t in ${ALIAS_ARR//,/ }; do git tag "$t" ${{ github.sha }}; done',
          env: {
            ALIAS_ARR: "${{ steps.get_aliases.outputs.csv }}",
          },
        },
        {
          name: "Push tags",
          run: "git push origin --tags",
        },
      ],
    });
  }
}
