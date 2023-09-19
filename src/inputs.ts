/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as core from "@actions/core";

export const cdktfVersion: string = core.getInput("cdktfVersion");
export const terraformVersion: string = core.getInput("terraformVersion");
export const workingDirectory: string = core.getInput("workingDirectory");
export const mode: string = core.getInput("mode");
export const stackName: string = core.getInput("stackName");
export const terraformCloudToken: string = core.getInput("terraformCloudToken");
export const githubToken: string = core.getInput("githubToken");
export const commentOnPr: boolean = core.getBooleanInput("commentOnPr");
export const updateComment: boolean = core.getBooleanInput("updateComment");
export const customNpxArgs: string = core.getInput("customNpxArgs");
