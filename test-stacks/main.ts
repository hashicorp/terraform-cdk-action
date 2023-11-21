/**
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

import { Construct } from "constructs";
import { App, TerraformStack } from "cdktf";
import { NullProvider } from "@cdktf/provider-null/lib/provider";
import { Resource } from "@cdktf/provider-null/lib/resource";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    new NullProvider(this, "null-provider", {});

    new Resource(this, "resource", {});
  }
}

const app = new App();
new MyStack(app, "test-stack");
app.synth();
