/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

// NOTE: might be better to update .projenrc.ts and generate this schema in inputs.ts
export interface Inputs {
  cdktfVersion: string;
  terraformVersion: string;
  workingDirectory: string;
  stackName: string;
  mode: string;
  terraformCloudToken: string;
  githubToken: string;
  commentOnPr: boolean;
  updateComment: boolean;
  customNpxArgs: string;
}
