/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

// Heavily inspired by https://github.com/hashicorp/setup-terraform/blob/main/lib/setup-terraform.js
// Removed the credentials and wrapper part, we don't need them we solve it through CDKTF directly

// Node.js core
import * as os from "os";

// External
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import * as releases from "@hashicorp/js-releases";

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch(arch: string) {
  const mappings: Record<string, string> = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS(operatingSystem: string) {
  const mappings: Record<string, string> = {
    win32: "windows",
  };
  return mappings[operatingSystem] || operatingSystem;
}

async function downloadCLI(url: string) {
  core.debug(`Downloading Terraform CLI from ${url}`);
  const pathToCLIZip = await tc.downloadTool(url);

  let pathToCLI = "";

  core.debug("Extracting Terraform CLI zip file");
  if (os.platform().startsWith("win")) {
    core.debug(`Terraform CLI Download Path is ${pathToCLIZip}`);
    const fixedPathToCLIZip = `${pathToCLIZip}.zip`;
    await io.mv(pathToCLIZip, fixedPathToCLIZip);
    core.debug(`Moved download to ${fixedPathToCLIZip}`);
    pathToCLI = await tc.extractZip(fixedPathToCLIZip);
  } else {
    pathToCLI = await tc.extractZip(pathToCLIZip);
  }

  core.debug(`Terraform CLI path is ${pathToCLI}.`);

  if (!pathToCLIZip || !pathToCLI) {
    throw new Error(`Unable to download Terraform from ${url}`);
  }

  return pathToCLI;
}

export async function setupTerraform(version: string) {
  // Gather OS details
  const osPlatform = os.platform();
  const osArch = os.arch();

  core.debug(`Finding releases for Terraform version ${version}`);
  const release = await releases.getRelease(
    "terraform",
    version,
    "GitHub Action: Terraform CDK"
  );
  const platform = mapOS(osPlatform);
  const arch = mapArch(osArch);
  core.debug(
    `Getting build for Terraform version ${release.version}: ${platform} ${arch}`
  );
  const build = release.getBuild(platform, arch);
  if (!build) {
    throw new Error(
      `Terraform version ${version} not available for ${platform} and ${arch}`
    );
  }

  // Download requested version
  const pathToCLI = await downloadCLI(build.url);
  // cache directory
  const cachedCLIPath = await tc.cacheDir(pathToCLI, "terraform", version);
  // Add to path
  core.addPath(cachedCLIPath);

  return cachedCLIPath;
}
