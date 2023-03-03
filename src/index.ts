/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import * as core from "@actions/core";
import { run } from "./action";

run().catch((error) => {
  core.setFailed(error.message);
});
