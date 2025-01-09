#!/bin/bash
# Copyright (c) HashiCorp, Inc.
# SPDX-License-Identifier: MPL-2.0

set -ex

PROJECT_ROOT=$(cd "$(dirname "${BASH_SOURCE:-$0}")/.." && pwd)
CDKTF_VERSION=$1
CONSTRUCTS_VERSION=$2

if [ -z "$CDKTF_VERSION" ]; then
  echo "Usage: $0 <cdktf-version> <constructs-version>"
  exit 1
fi
if [ -z "$CONSTRUCTS_VERSION" ]; then
  echo "Usage: $0 <cdktf-version> <constructs-version>"
  exit 1
fi

echo "Updating default cdktf version to $CDKTF_VERSION and constructs version $CONSTRUCTS_VERSION"
yarn
# HACK ALERT! This will stop working once CDKTF goes 1.0+
sed -i 's/default: "0\..*",/default: "'"$CDKTF_VERSION"'",/' "$PROJECT_ROOT/.projenrc.ts"
sed -i "s/constructsVersion = \".*\";/constructsVersion = \"$CONSTRUCTS_VERSION\";/" "$PROJECT_ROOT/projenrc/index.ts"
CI=0 npx projen
npx projen build

echo "Updating README"
sed -i 's/cdktfVersion: .*/cdktfVersion: '"$CDKTF_VERSION"'/' "$PROJECT_ROOT/README.md"
