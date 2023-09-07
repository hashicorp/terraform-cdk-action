#!/bin/bash
# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

set -ex

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE:-$0}")/.." && pwd)
TERRAFORM_VERSION=$1

if [ -z "$TERRAFORM_VERSION" ]; then
  echo "Usage: $0 <terraform-version>"
  exit 1
fi

echo "Updating default Terraform version to $TERRAFORM_VERSION"
yarn
# HACK ALERT! This will stop working once CDKTF goes 1.0+
sed -i 's/default: "1\..*",/default: "'"$TERRAFORM_VERSION"'",/' "$PROJECT_ROOT/.projenrc.ts"
CI=0 npx projen
npx projen build

echo "Updating README"
sed -i 's/terraformVersion: .*/terraformVersion: '"$TERRAFORM_VERSION"'/' "$PROJECT_ROOT/README.md"
