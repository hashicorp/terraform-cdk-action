/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";

import { CommentController } from "./comment";
import * as input from "./inputs";
import { Inputs } from "./models";
import { setupTerraform } from "./setup-terraform";
function getRunUrl(output: string): string | undefined {
  const runUrlIdentifier = "Created speculative Terraform Cloud run:";
  const runUrl = output
    .split("\n")
    .find((line) => line.includes(runUrlIdentifier));

  if (!runUrl) {
    return undefined;
  }

  const urlStart = runUrl.indexOf("http");
  return runUrl.substring(urlStart);
}

enum ExecutionMode {
  SynthOnly = "synth-only",
  PlanOnly = "plan-only",
  AutoApproveApply = "auto-approve-apply",
  AutoApproveDestroy = "auto-approve-destroy",
}

async function execute(
  cdktfCommand: string,
  inputs: Inputs,
  reportSuccess: (output: string, runUrl?: string) => Promise<void>,
  reportFailure: (
    error: Error,
    output: string,
    runUrl?: string
  ) => Promise<void>
): Promise<void> {
  core.debug(`Installing terraform`);
  await setupTerraform(inputs.terraformVersion);

  core.debug(`Installing CDKTF`);
  await exec(`npm install -g cdktf-cli@${inputs.cdktfVersion}`);

  core.debug(`Executing: ${cdktfCommand}`);
  let output = "";
  try {
    await exec(cdktfCommand, [], {
      cwd: inputs.workingDirectory || process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "0", // disable chalk terminal colors
        TF_CLI_ARGS: "-no-color", // disable terraform colors
        TERRAFORM_CLOUD_TOKEN: inputs.terraformCloudToken, // set the terraform cloud token if present
      },
      listeners: {
        stderr: (data) => {
          const str = data.toString();
          output += str;
          core.warning(str);
        },
        stdout: (data) => {
          const str = data.toString();
          output += str;
          core.info(str);
        },
      },
    });
  } catch (error) {
    core.debug(`Output: ${output}`);
    await reportFailure(error as Error, output, getRunUrl(output));
    throw error;
  }

  await reportSuccess(output, getRunUrl(output));
  core.debug(`Finished executing`);
}

export async function run(): Promise<void> {
  const inputs: Inputs = {
    cdktfVersion: input.cdktfVersion,
    terraformVersion: input.terraformVersion,
    workingDirectory: input.workingDirectory,
    stackName: input.stackName,
    mode: input.mode,
    terraformCloudToken: input.terraformCloudToken,
    githubToken: input.githubToken,
    commentOnPr: input.commentOnPr,
    updateComment: input.updateComment,
  };
  const octokit = github.getOctokit(inputs.githubToken);
  const commentController = new CommentController({
    inputs,
    octokit,
    context: github.context,
  });
  core.debug(
    `Starting action with context: ${JSON.stringify(github.context, null, 2)}`
  );

  core.debug(`Running action in '${inputs.mode}' mode`);
  switch (inputs.mode) {
    case ExecutionMode.SynthOnly:
      await execute(
        `cdktf synth`,
        inputs,
        () =>
          commentController.postCommentOnPr(
            `✅ Successfully synthesized the Terraform CDK Application`
          ),
        (error, output) =>
          commentController.postCommentOnPr(
            `### ❌ Error synthesizing the Terraform CDK Application

<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`
          )
      );
      break;

    case ExecutionMode.PlanOnly:
      if (!inputs.stackName) {
        throw new Error(
          `Stack name must be provided when running in 'plan-only' mode`
        );
      }
      await execute(
        `cdktf plan ${inputs.stackName}`,
        inputs,
        (output, runUrl) =>
          commentController.postCommentOnPr(
            `### ✅ Successfully planned Terraform CDK Stack '${
              inputs.stackName
            }'
          
${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}

<details><summary>Show Plan</summary>

\`\`\`shell
${output}
\`\`\`

</details>`
          ),
        (error, output, runUrl) =>
          commentController.postCommentOnPr(
            `### ❌ Error planning Terraform CDK Stack '${inputs.stackName}'

${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}

<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`
          )
      );
      break;

    case ExecutionMode.AutoApproveApply:
      if (!inputs.stackName) {
        throw new Error(
          `Stack name must be provided when running in 'auto-approve-apply' mode`
        );
      }
      await execute(
        `cdktf apply ${inputs.stackName} --auto-approve`,
        inputs,
        (output, runUrl) =>
          commentController.postCommentOnPr(
            `### ✅ Successfully applied Terraform CDK Stack '${
              inputs.stackName
            }'

${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}
<details><summary>Show Run</summary>

\`\`\`shell
${output}
\`\`\`

</details>`
          ),
        (error, output, runUrl) =>
          commentController.postCommentOnPr(
            `### ❌ Error applying Terraform CDK Stack '${inputs.stackName}'

          ${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}
<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`
          )
      );
      break;

    case ExecutionMode.AutoApproveDestroy:
      if (!inputs.stackName) {
        throw new Error(
          `Stack name must be provided when running in 'auto-approve-destroy' mode`
        );
      }
      await execute(
        `cdktf destroy ${inputs.stackName} --auto-approve`,
        inputs,
        () =>
          commentController.postCommentOnPr(
            `✅ Successfully destroyed the Terraform CDK Application`
          ),
        (error, output) =>
          commentController.postCommentOnPr(
            `### ❌ Error destroying the Terraform CDK Application

<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`
          )
      );
      break;

    default:
      throw new Error(
        `Invalid mode passed: '${inputs.mode}', needs to be one of '${ExecutionMode.SynthOnly}', '${ExecutionMode.PlanOnly}', '${ExecutionMode.AutoApproveApply}'`
      );
  }
}
