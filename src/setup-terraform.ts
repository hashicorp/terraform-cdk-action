/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

// Heavily inspired by https://github.com/hashicorp/setup-terraform/blob/main/lib/setup-terraform.js
// Removed the credentials and wrapper part, we don't need them we solve it through CDKTF directly

// Node.js core
import { execSync } from "child_process";

// External
import * as core from "@actions/core";

/**
 * Check if wanted version of Terraform is already available
 *
 * @param version expected version of Terraform
 */
async function checkVersionAvailability(version: string): Promise<boolean> {
  try {
    const terraformVersion = JSON.parse(
      execSync("terraform version -json", {
        encoding: "utf8",
        // Don't print out error if command is not found
        stdio: "pipe",
      })
    ).terraform_version;

    if (terraformVersion !== version) {
      core.debug(
        `Installed Terraform version is ${terraformVersion} while expecting ${version}`
      );
      return false;
    }
    core.debug(
      `Configured Terraform version ${terraformVersion} already available in PATH`
    );
    return true;
  } catch (e) {
    core.debug("Terraform installation not found from PATH");
    return false;
  }
}

export async function ensureTerraform(version: string) {
  if (!(await checkVersionAvailability(version))) {
    throw new Error(
      `Terraform not installed, please use the setup-terraform action with the specified version to install terraform.`
    );
  }
}
