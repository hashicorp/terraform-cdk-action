# Terraform CDK GitHub Action

The Terraform CDK GitHub Action allows you to run CDKTF as part of your CI/CD workflow.

<!-- action-docs-inputs action="action.yml" -->
## Inputs

| name | description | required | default |
| --- | --- | --- | --- |
| `cdktfVersion` | <p>The version of CDKTF to use</p> | `false` | `0.20.11` |
| `terraformVersion` | <p>The version of Terraform to use</p> | `false` | `1.11.4` |
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
          terraform_version: 1.11.4

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v8
        with:
          cdktfVersion: 0.20.11
          terraformVersion: 1.11.4
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
          terraform_version: 1.11.4

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v8
        with:
          cdktfVersion: 0.20.11
          terraformVersion: 1.11.4
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
          terraform_version: 1.11.4

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Test the synth
        uses: hashicorp/terraform-cdk-action@v8
        with:
          cdktfVersion: 0.20.11
          terraformVersion: 1.11.4
          mode: synth-only
          stackName: my-stack
```

## Limitations

This action is intended to be limited to a single stack. While you could pass `*` as the stack name and use multi-stack deployments, we don't currently support all the complexities of doing accurate plans across multiple dependent workspaces within the action.
