/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import crypto from "crypto";
import * as core from "@actions/core";
import { getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { Inputs } from "./models";

export interface CommentControllerConfig {
  inputs: Inputs;
  context: Context;
  octokit: ReturnType<typeof getOctokit>;
}
export class CommentController {
  constructor(private config: CommentControllerConfig) {}
  async postCommentOnPr(message: string): Promise<void> {
    const { inputs, octokit, context } = this.config;
    if (!inputs.commentOnPr) {
      core.debug(`Not commenting on PR by configuration`);
      return;
    }

    const pull_number = await this.getPullNumber();
    if (!pull_number) {
      core.debug(`Not commenting on PR since it could not be identified`);
      return;
    }

    const tag = this.getCommentTag();
    const messageWithTag = `${tag}\n${message}`;
    let previousComment;
    if (inputs.updateComment) {
      previousComment = await this.fetchPreviousComment(
        octokit,
        context.repo,
        pull_number,
        tag
      );
    }

    if (previousComment) {
      core.debug(`Updating previous comment`);
      await octokit.rest.issues.updateComment({
        ...context.repo,
        body: messageWithTag,
        comment_id: previousComment.id,
      });
      return;
    }

    core.debug(`Adding new comment`);
    await octokit.rest.issues.createComment({
      ...context.repo,
      issue_number: pull_number,
      body: messageWithTag,
    });
  }

  private async getPullNumber(): Promise<number | undefined> {
    const { octokit, context } = this.config;

    if (context.payload.pull_request?.number) {
      return context.payload.pull_request?.number;
    }

    core.debug(
      `Not running on a PR, looking for a pull request number via search`
    );

    if (!context.payload.repository?.full_name) {
      core.debug(`Could not identify repository name, skipping comment on PR`);
      return;
    }

    const q = `is:pr repo:${context.payload.repository?.full_name} sha:${context.sha}`;
    const result = await octokit.rest.search.issuesAndPullRequests({
      q,
    });

    core.debug(
      `Searched for '${q}', got ${JSON.stringify(result.data, null, 2)}`
    );

    if (result.data.items.length) {
      return result.data.items[0].number;
    }
    return;
  }

  private getCommentTag() {
    const {
      cdktfVersion,
      mode,
      stackName,
      terraformVersion,
      workingDirectory,
    } = this.config.inputs;

    const options = {
      cdktfVersion,
      terraformVersion,
      workingDirectory,
      stackName,
      mode,
    };
    const optionsHash = hashString(JSON.stringify(options));
    return `<!-- terraform cdk action for options with hash ${optionsHash} -->`;
  }

  private async fetchPreviousComment(
    octokit: ReturnType<typeof getOctokit>,
    repo: { owner: string; repo: string },
    pull_number: number,
    tag: string
  ) {
    const commentList = await octokit.paginate(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        ...repo,
        issue_number: pull_number,
      }
    );

    const previousComment = commentList.find((comment) =>
      comment.body?.includes(tag)
    );

    return !previousComment ? null : previousComment;
  }
}
const hashString = (str: string) => {
  return crypto.createHash("md5").update(str).digest("hex");
};
