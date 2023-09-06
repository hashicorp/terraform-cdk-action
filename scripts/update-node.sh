#!/bin/bash
# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

set -ex

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE:-$0}")/.." && pwd)
NODE_VERSION=$1

if [ -z "$NODE_VERSION" ]; then
  echo "Usage: $0 <node-version>"
  exit 1
fi

NODE_VERSION_SHORT=$(cut -d "." -f 1 <<< "$NODE_VERSION")

echo "Updating main level Node.js version to $NODE_VERSION"
sed -i 's/"@types\/node@.*",/"@types\/node@^'"$NODE_VERSION_SHORT"'",/' "$PROJECT_ROOT/.projenrc.ts"
CI=0 npx projen

echo "Updating README"
sed -i 's/node-version: .*/node-version: '"$NODE_VERSION_SHORT"'/' "$PROJECT_ROOT/README.md"

echo "Done"
