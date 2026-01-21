/**
 * Copyright IBM Corp. 2022, 2025
 * SPDX-License-Identifier: MPL-2.0
 */

import * as core from "@actions/core";
import { run } from "./action";

run().catch((error) => {
  core.setFailed(error.message);
});
