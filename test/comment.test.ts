/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { getOctokit } from "@actions/github";
import { Context } from "@actions/github/lib/context";
import { CommentController } from "../src/comment";
describe("comment", () => {
  const issuesAndPullRequests = jest.fn();
  const createComment = jest.fn();
  const updateComment = jest.fn();
  const paginate = jest.fn();

  const search = { issuesAndPullRequests };
  const issues = { createComment, updateComment };
  const rest = { search, issues };
  const octokit = { rest, paginate } as unknown as ReturnType<
    typeof getOctokit
  >;

  const context: Context = {
    sha: "some-sha",
    payload: {
      repository: {
        full_name: "some-repo",
      },
      pull_request: {
        number: 1,
      },
    },
  } as Context;
  const defaultInput = {
    cdktfVersion: "1.4.0",
    terraformVersion: "1.4.0",
    workingDirectory: "some-directory",
    stackName: "some-stack",
    mode: "plan-only",
    terraformCloudToken: "xxx",
    githubToken: "xxx",
    commentOnPr: true,
    updateComment: true,
    customNpxArgs: "",
  };

  const pullRequestData = {
    data: {
      items: [
        {
          number: 1,
        },
      ],
    },
  };

  const hash = "761811df765e65db8321b6c4002ca358";
  const commentDataWithTag = [
    {
      id: "comment_id_1",
      body: "some comment",
    },
    {
      id: "comment_id_2",
      body: `<!-- terraform cdk action for options with hash ${hash} -->\nprevious-message`,
    },
  ];

  const commentDataWithUnMatchedTag = [
    {
      id: "comment_id_1",
      body: "some comment",
    },
    {
      id: "comment_id_2",
      body: "<!-- terraform cdk action for options with hash SOME-DIFFERENT-HASH -->\nprevious-message",
    },
  ];

  beforeEach(() => {
    issuesAndPullRequests.mockClear();
    createComment.mockClear();
    updateComment.mockClear();
    paginate.mockClear();
  });

  describe("postCommentOnPr", () => {
    it("should skip commenting if commentOnPr is false", async () => {
      const commentController = new CommentController({
        inputs: { ...defaultInput, commentOnPr: false },
        context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(createComment).not.toBeCalled();
      expect(updateComment).not.toBeCalled();
      expect(actual).toBeUndefined();
    });

    it("should skip when repository.full_name is missing in the context", async () => {
      const commentController = new CommentController({
        inputs: defaultInput,
        context: {
          payload: {
            repository: {
              full_name: undefined,
            },
          },
        } as Context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(createComment).not.toBeCalled();
      expect(updateComment).not.toBeCalled();
      expect(actual).toBeUndefined();
    });

    it("should successfully add new comment if updateCommentOnPr is false", async () => {
      createComment.mockResolvedValue({});
      const commentController = new CommentController({
        inputs: { ...defaultInput, updateComment: false },
        context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(actual).toBeUndefined();
      expect(createComment).toBeCalledWith({
        body: `<!-- terraform cdk action for options with hash ${hash} -->\nsome-message`,
        issue_number: pullRequestData.data.items[0].number,
      });
      expect(updateComment).not.toBeCalled();
    });

    it("should successfully add new comment if no previous comment", async () => {
      paginate.mockResolvedValue([]);
      const commentController = new CommentController({
        inputs: defaultInput,
        context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(actual).toBeUndefined();
      expect(updateComment).not.toBeCalled();
      expect(createComment).toBeCalledWith({
        body: `<!-- terraform cdk action for options with hash ${hash} -->\nsome-message`,
        issue_number: pullRequestData.data.items[0].number,
      });
    });

    it("should successfully add new comment if no matched previous comment", async () => {
      paginate.mockResolvedValue(commentDataWithUnMatchedTag);
      const commentController = new CommentController({
        inputs: defaultInput,
        context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(actual).toBeUndefined();
      expect(updateComment).not.toBeCalled();
      expect(createComment).toBeCalledWith({
        body: `<!-- terraform cdk action for options with hash ${hash} -->\nsome-message`,
        issue_number: pullRequestData.data.items[0].number,
      });
    });

    it("should successfully update comment if previous comment matched with a tag", async () => {
      paginate.mockResolvedValue(commentDataWithTag);
      const commentController = new CommentController({
        inputs: defaultInput,
        context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(actual).toBeUndefined();
      expect(updateComment).toBeCalledWith({
        body: `<!-- terraform cdk action for options with hash ${hash} -->\nsome-message`,
        comment_id: commentDataWithTag[1].id,
      });
      expect(createComment).not.toBeCalled();
    });

    it("should get pull_number via API if not running on PR", async () => {
      issuesAndPullRequests.mockResolvedValueOnce(pullRequestData);
      paginate.mockResolvedValueOnce(commentDataWithTag);
      const commentController = new CommentController({
        inputs: defaultInput,
        context: {
          payload: {
            repository: {
              full_name: "some-org/some-repo",
            },
          },
        } as Context,
        octokit,
      });
      const actual = await commentController.postCommentOnPr("some-message");
      expect(createComment).not.toBeCalled();
      expect(updateComment).toBeCalledWith({
        body: `<!-- terraform cdk action for options with hash ${hash} -->\nsome-message`,
        comment_id: commentDataWithTag[1].id,
      });
      expect(actual).toBeUndefined();
    });
  });
});
