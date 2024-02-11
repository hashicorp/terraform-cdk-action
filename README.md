# Terraform CDK GitHub Action

The Terraform CDK GitHub Action allows you to run CDKTF as part of your CI/CD workflow.

<!-- action-docs-inputs -->
## Inputs

| parameter | description | required | default |
| --- | --- | --- | --- |
| cdktfVersion | The version of CDKTF to use | `false` | 0.20.3 |
| terraformVersion | The version of Terraform to use | `false` | 1.7.3 |
| workingDirectory | The directory to use for the project | `false` | ./ |
| mode | What action to take: `synth-only` runs only the synthesis, `plan-only` only runs a plan, `auto-approve-apply` runs a plan and then performs an apply, `auto-approve-destroy` runs a plan and then performs a destroy | `true` |  |
| stackName | The stack to run / plan, only required when the mode is `plan-only` or `plan-and-apply` | `false` |  |
| terraformCloudToken | The Terraform Cloud / Terraform Enterprise token to use | `false` |  |
| githubToken | The github token to use | `false` |  |
| commentOnPr | Whether to comment the plan / the status on the PR | `false` | true |
| updateComment | Whether to update the last comment on the PR rather than adding a new comment | `false` | true |
| customNpxArgs | The additional CLI arguments to pass to npx as part of the cdktf-cli execution. | `false` |  |
<!-- action-docs-inputs -->

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

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v3
        with:
          cdktfVersion: 0.20.3
          terraformVersion: 1.7.3
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

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v3
        with:
          cdktfVersion: 0.20.3
          terraformVersion: 1.7.3
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

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Test the synth
        uses: hashicorp/terraform-cdk-action@v3
        with:
          cdktfVersion: 0.20.3
          terraformVersion: 1.7.3
          mode: synth-only
          stackName: my-stack
```

## Limitations

This action is intended to be limited to a single stack. While you could pass `*` as the stack name and use multi-stack deployments, we don't currently support all the complexities of doing accurate plans across multiple dependent workspaces within the action.
