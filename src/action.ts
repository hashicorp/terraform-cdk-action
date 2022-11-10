import * as core from "@actions/core";
import { exec } from "@actions/exec";
import * as github from "@actions/github";

import * as input from "./inputs";
import { setupTerraform } from "./setup-terraform";

async function postCommentOnPr(message: string): Promise<void> {
  let pull_number = github.context.payload.pull_request?.number;
  if (!input.commentOnPr) {
    core.debug(`Not commenting on PR by configuration`);
    return;
  }

  const octokit = github.getOctokit(input.githubToken);
  if (!pull_number) {
    core.debug(
      `Not running on a PR, looking for a pull request number via search`
    );

    if (!github.context.payload.repository?.full_name) {
      core.debug(`Could not identify repository name, skipping comment on PR`);
    }

    const q = `is:pr repo:${github.context.payload.repository?.full_name} sha:${github.context.sha}`;
    const result = await octokit.rest.search.issuesAndPullRequests({
      q,
    });

    core.debug(
      `Searched for '${q}', got ${JSON.stringify(result.data, null, 2)}`
    );

    if (result.data.items.length) {
      pull_number = result.data.items[0].number;
    }
  }

  if (!pull_number) {
    core.debug(`Not commenting on PR since it could not be identified`);
    return;
  }

  await octokit.rest.issues.createComment({
    ...github.context.repo,
    issue_number: pull_number,
    body: message,
  });
}

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
}

async function execute(
  cdktfCommand: string,
  reportSuccess: (output: string, runUrl?: string) => Promise<void>,
  reportFailure: (
    error: Error,
    output: string,
    runUrl?: string
  ) => Promise<void>
): Promise<void> {
  core.debug(`Installing terraform`);
  await setupTerraform(input.terraformVersion);

  core.debug(`Installing CDKTF`);
  await exec(`npm install -g cdktf-cli@${input.cdktfVersion}`);

  core.debug(`Executing: ${cdktfCommand}`);
  let output = "";
  try {
    await exec(cdktfCommand, [], {
      cwd: input.workingDirectory || process.cwd(),
      env: {
        ...process.env,
        FORCE_COLOR: "0", // disable chalk terminal colors
        TF_CLI_ARGS: "-no-color", // disable terraform colors
        TERRAFORM_CLOUD_TOKEN: input.terraformCloudToken, // set the terraform cloud token if present
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
  core.debug(
    `Starting action with context: ${JSON.stringify(github.context, null, 2)}`
  );

  core.debug(`Running action in '${input.mode}' mode`);
  switch (input.mode) {
    case ExecutionMode.SynthOnly:
      await execute(
        `cdktf synth`,
        () =>
          postCommentOnPr(
            `✅ Successfully synthesized the Terraform CDK Application`
          ),
        (error, output) =>
          postCommentOnPr(`### ❌ Error synthesizing the Terraform CDK Application

<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`)
      );
      break;

    case ExecutionMode.PlanOnly:
      if (!input.stackName) {
        throw new Error(
          `Stack name must be provided when running in 'plan-only' mode`
        );
      }
      await execute(
        `cdktf plan ${input.stackName}`,
        (output, runUrl) =>
          postCommentOnPr(`### ✅ Successfully planned Terraform CDK Stack '${
            input.stackName
          }'
          
${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}

<details><summary>Show Plan</summary>

\`\`\`shell
${output}
\`\`\`

</details>`),
        (error, output, runUrl) =>
          postCommentOnPr(`### ❌ Error planning Terraform CDK Stack '${
            input.stackName
          }'

${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}

<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`)
      );
      break;

    case ExecutionMode.AutoApproveApply:
      if (!input.stackName) {
        throw new Error(
          `Stack name must be provided when running in 'auto-approve-apply' mode`
        );
      }
      await execute(
        `cdktf apply ${input.stackName} --auto-approve`,
        (output, runUrl) =>
          postCommentOnPr(`### ✅ Successfully applied Terraform CDK Stack '${
            input.stackName
          }'

${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}
<details><summary>Show Run</summary>

\`\`\`shell
${output}
\`\`\`

</details>`),
        (error, output, runUrl) =>
          postCommentOnPr(`### ❌ Error applying Terraform CDK Stack '${
            input.stackName
          }'

          ${runUrl ? `<a target="_blank" href='${runUrl}'>🌍 View run</a>` : ""}
<details><summary>${error}</summary>

\`\`\`shell
${output}
\`\`\`

</details>`)
      );
      break;

    default:
      throw new Error(
        `Invalid mode passed: '${input.mode}', needs to be one of '${ExecutionMode.SynthOnly}', '${ExecutionMode.PlanOnly}', '${ExecutionMode.AutoApproveApply}'`
      );
  }
}
