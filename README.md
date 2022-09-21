# Terraform CDK GitHub Action

This is the Terraform CDK GitHub Action, it allows you to run Terraform CDK as part of your CI/CD workflow.

## Usage

These are the configuration options for the action:

| **Name**            | **Type**                                            | **Description**                                                                                                                              | **Default** |
| ------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| cdktfVersion        | string                                              | The version of cdktf CLI to use                                                                                                              | 0.11.1      |
| terraformVersion    | string                                              | The version of terraform to use                                                                                                              | 1.2.2       |
| workingDirectory    | string                                              | The directory to use for the project                                                                                                         | ./          |
| stackName           | string                                              | The stack to run / plan, only required when the mode is plan 'plan-only' or 'plan-and-apply'                                                 | <optional>  |
| mode                | "synth-only" \| "plan-only" \| "auto-approve-apply" | What action to take: 'plan-only' only runs a plan, 'plan-and-apply' runs a plan and then an apply, 'synth-only' runs only the synthetization | <required>  |
| terraformCloudToken | string                                              | The terraform cloud / terraform enterprise token to use                                                                                      | <optional>  |
| githubToken         | string                                              | The github token to use                                                                                                                      | <optional>  |
| commentOnPr         | boolean                                             | Whether to comment the plan / the status on the PR                                                                                           | true        |

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
        uses: actions/checkout@v2

      - uses: actions/setup-node@v1
        with:
          node-version: "16"

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v0.1.0
        with:
          terraformVersion: 1.0.7
          cdktfVersion: 0.11.1
          stackName: my-stack
          mode: plan-only
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
        uses: actions/checkout@v2

      - uses: actions/setup-node@v1
        with:
          node-version: "16"

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v0.1.0
        with:
          terraformVersion: 1.0.7
          cdktfVersion: 0.11.2
          stackName: my-stack
          mode: auto-approve-apply
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
        uses: actions/checkout@v2

      - uses: actions/setup-node@v1
        with:
          node-version: "16"

      - name: Install dependencies
        run: yarn install

      - name: Generate module and provider bindings
        run: npx cdktf-cli get

      # Remove this step if you don't have any
      - name: Run unit tests
        run: yarn test

      - name: Test the synth
        uses: hashicorp/terraform-cdk-action@v0.1.0
        with:
          terraformVersion: 1.0.7
          cdktfVersion: 0.11.1
          stackName: my-stack
          mode: synth-only
```
