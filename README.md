# The Future of Terraform CDK

## Sunset Notice

Terraform CDK (CDKTF) will sunset and be archived on December 10, 2025. HashiCorp, an IBM Company, will no longer maintain or develop the project after that date. Unfortunately, Terraform CDK did not find product-market fit at scale. HashiCorp, an IBM Company, has chosen to focus its investments on Terraform core and its broader ecosystem.

As of December 10, 2025, Terraform CDK will be archived on GitHub, and the documentation will reflect its deprecated status. The archived code will remain available on GitHub, but it will be read-only. No further updates, fixes, or improvements (including compatibility updates) will be made.

You will be able to continue to use Terraform CDK at your own risk. Terraform CDK is licensed under the Mozilla Public License (MPL). HashiCorp, an IBM Company, does not apply any additional restrictions. We encourage community forks if there’s interest in continuing development independently.

## Migration to HCL

You can use the following command to generate Terraform-compatible .tf files directly from your Terraform CDK project:

`cdktf synth --hcl`

This will produce readable HCL configuration files, making it easier to migrate away from Terraform CDK. After running the command, you can use standard Terraform CLI commands (`terraform init`, `terraform plan`, `terraform apply`) to continue managing your infrastructure. Please note that while this helps bootstrap your configuration, you may still need to review and adjust the generated files for clarity, organization, or best practices.

### Note on AWS CDK

If your infrastructure is defined in Terraform CDK but also tightly integrated with AWS CDK, you may find it more consistent to migrate directly to the AWS CDK ecosystem. If you are not using AWS CDK, we highly recommend migrating to standard Terraform and HCL for long-term support and ecosystem alignment.

## FAQ

Q: Is CDKTF still being developed?

A: No. CDKTF will sunset and be archived on December 10, 2025. HashiCorp, an IBM Company, will no longer maintain or develop the project after that date.

Q: Why is CDKTF being sunset?

A: CDKTF did not find product-market fit at scale. We’ve chosen to focus our investments on Terraform core and its broader ecosystem.

Q: Will CDKTF be removed from GitHub?

A: CDKTF will be archived on GitHub, and documentation will reflect its deprecated status.

Q: Can I still use CDKTF after it's sunset?

A: Yes, the archived code will remain available on GitHub, but it will be read-only. No further updates, fixes, or improvements will be made.

Q: Will CDKTF continue to support new versions of Terraform or providers?

A: No. Compatibility updates will not be made after the EOL date.

Q: Can I fork CDKTF and maintain it myself?

A: Yes. CDKTF is open source, and we encourage community forks if there’s interest in continuing development independently.

Q: Can I keep using CDKTF?

A: You may continue to use it at your own risk. HashiCorp, an IBM Company, will no longer be maintaining it.

Q: Is there a migration tool?

A: You can use the following command to generate Terraform-compatible .tf files directly from your CDKTF project:

`cdktf synth --hcl`

This will produce readable HCL configuration files, making it easier to migrate away from CDKTF. After running the command, you can use standard Terraform CLI commands (terraform init, terraform plan, terraform apply) to continue managing your infrastructure. Please note that while this helps bootstrap your configuration, you may still need to review and adjust the generated files for clarity, organization, or best practices.

Q: What migration guidance can we provide to customers?

A: For users looking to migrate away from CDKTF:

If your infrastructure is defined in CDKTF but also tightly integrated with AWS CDK, you may find it more consistent to migrate directly to the AWS CDK ecosystem.

If you are not using AWS CDK, we highly recommend migrating to standard Terraform and HCL for long-term support and ecosystem alignment.

---

# Terraform CDK GitHub Action

The Terraform CDK GitHub Action allows you to run CDKTF as part of your CI/CD workflow.

<!-- action-docs-inputs action="action.yml" -->
## Inputs

| name | description | required | default |
| --- | --- | --- | --- |
| `cdktfVersion` | <p>The version of CDKTF to use</p> | `false` | `0.21.0` |
| `terraformVersion` | <p>The version of Terraform to use</p> | `false` | `1.13.3` |
| `workingDirectory` | <p>The directory to use for the project</p> | `false` | `./` |
| `mode` | <p>What action to take: <code>synth-only</code> runs only the synthesis, <code>plan-only</code> only runs a plan, <code>auto-approve-apply</code> runs a plan and then performs an apply, <code>auto-approve-destroy</code> runs a plan and then performs a destroy</p> | `true` | `""` |
| `stackName` | <p>The stack to run / plan, only required when the mode is <code>plan-only</code> or <code>plan-and-apply</code></p> | `false` | `""` |
| `terraformCloudToken` | <p>The Terraform Cloud / Terraform Enterprise token to use</p> | `false` | `""` |
| `githubToken` | <p>The github token to use</p> | `false` | `""` |
| `commentOnPr` | <p>Whether to comment the plan / the status on the PR</p> | `false` | `true` |
| `updateComment` | <p>Whether to update the last comment on the PR rather than adding a new comment</p> | `false` | `true` |
| `customNpxArgs` | <p>The additional CLI arguments to pass to npx as part of the cdktf-cli execution.</p> | `false` | `""` |
| `cdktfArgs` | <p>The additional CLI arguments to pass to cdktf as part of the cdktf-cli execution.</p> | `false` | `""` |
| `suppressOutput` | <p>Whether to suppress the output of the action in PR comments</p> | `false` | `false` |
<!-- action-docs-inputs action="action.yml" -->

## Example Configurations

The examples assume you have your provider credentials in Terraform Cloud and you are using remote execution to access the provider credentials or you are passing the provider credentials as environment variables [through the `env` key on the action](https://github.com/Azure/actions-workflow-samples/blob/master/assets/create-secrets-for-GitHub-workflows.md#consume-secrets-in-your-workflow). Please don't use this action with the default `local` backend as the state might get lost and locking might not work.

### Comment the plan of a stack on a PR

```yml
name: "Comment a Plan on a PR"

on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  terraform:
    name: "Terraform CDK Diff"
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - use: actions/setup-terraform@v3
        with:
          terraform_version: 1.13.3

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v11
        with:
          cdktfVersion: 0.21.0
          terraformVersion: 1.13.3
          mode: plan-only
          stackName: my-stack
          terraformCloudToken: ${{ secrets.TF_API_TOKEN }}
          githubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Apply a stack after a PR is merged

```yml
name: "Apply Stack after PR is Merged"

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pull-requests: write
  issues: read

jobs:
  terraform:
    name: "Terraform CDK Deploy"
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - use: actions/setup-terraform@v3
        with:
          terraform_version: 1.13.3

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v11
        with:
          cdktfVersion: 0.21.0
          terraformVersion: 1.13.3
          mode: auto-approve-apply
          stackName: my-stack
          terraformCloudToken: ${{ secrets.TF_API_TOKEN }}
          githubToken: ${{ secrets.GITHUB_TOKEN }}
```

### Synthesize on PRs

```yml
name: "Synth the CDKTF Application on PRs"

on: [pull_request]

permissions:
  contents: read
  pull-requests: write

jobs:
  terraform:
    name: "Terraform CDK Synth"
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - use: actions/setup-terraform@v3
        with:
          terraform_version: 1.13.3

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Test the synth
        uses: hashicorp/terraform-cdk-action@v11
        with:
          cdktfVersion: 0.21.0
          terraformVersion: 1.13.3
          mode: synth-only
          stackName: my-stack
```

## Limitations

This action is intended to be limited to a single stack. While you could pass `*` as the stack name and use multi-stack deployments, we don't currently support all the complexities of doing accurate plans across multiple dependent workspaces within the action.
