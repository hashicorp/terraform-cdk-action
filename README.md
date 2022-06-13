# Terraform CDK GitHub Action

This is the Terraform CDK GitHub Action, it allows you to run Terraform CDK as part of your CI/CD workflow.

## Usage

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

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v0.0.0
        with:
          terraformVersion: 1.0.7
          cdktfVersion: 0.11.1
          stackName: my-stack
          mode: plan-only
          terraformCloudToken: ${{ secrets.TF_API_TOKEN }}
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
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

      - name: Run Terraform CDK
        uses: hashicorp/terraform-cdk-action@v0.0.0
        with:
          terraformVersion: 1.0.7
          cdktfVersion: 0.11.2
          stackName: my-stack
          mode: auto-approve-apply
          terraformCloudToken: ${{ secrets.TF_API_TOKEN }}
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```
