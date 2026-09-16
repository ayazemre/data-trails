#!/bin/sh
set -e

get_package_json_field() {
  FIELD_NAME=""
  for arg in "$@"; do
    case "$arg" in
      fieldName=*) FIELD_NAME="${arg#fieldName=}" ;;
    esac
  done
  if [ -z "$FIELD_NAME" ]; then
    echo "Error: fieldName is required, expected fieldName=<field>" >&2
    exit 1
  fi
  if [ ! -f "package.json" ]; then
    echo "Error: package.json not found" >&2
    exit 1
  fi
  FIELD_VALUE=$(awk -F\" "/\"$FIELD_NAME\"/{print \$4; exit}" package.json)
  if [ -z "$FIELD_VALUE" ]; then
    echo "Error: Could not extract $FIELD_NAME from package.json" >&2
    exit 1
  fi
  echo "$FIELD_VALUE"
}

get_package_version() {
  get_package_json_field fieldName=version
}

get_package_name() {
  get_package_json_field fieldName=name
}

run_npm_tests() {
  FILTER_VALUE=""
  for arg in "$@"; do
    case "$arg" in
      filter=*) FILTER_VALUE="${arg#filter=}" ;;
    esac
  done
  if [ -z "$FILTER_VALUE" ]; then
    dotenvx run -- node --test-global-setup=./tests/setup.ts --test tests/index.test.ts
  else
    dotenvx run -- node --test-global-setup=./tests/setup.ts --test **/"$FILTER_VALUE".test.ts
  fi
}

check_changelog_version() {
  PACKAGE_VERSION=$(get_package_version)
  echo "Package version: $PACKAGE_VERSION"
  if ! grep -q "## \[$PACKAGE_VERSION\]" CHANGELOG.md; then
    echo "Error: CHANGELOG.md is missing entry for version [$PACKAGE_VERSION]" >&2
    echo "Add '## [$PACKAGE_VERSION] - YYYY-MM-DD' to CHANGELOG.md" >&2
    exit 1
  fi
  echo "✓ CHANGELOG.md has entry for $PACKAGE_VERSION"
}

publish_package() {
  PACKAGE_NAME=$(get_package_name)
  PACKAGE_VERSION=$(get_package_version)
  PUBLISHED_VERSION=$(npm view "$PACKAGE_NAME" version 2>/dev/null || echo "0.0.0")
  echo "Current version: $PACKAGE_VERSION"
  echo "Published version: $PUBLISHED_VERSION"
  if [ "$(printf '%s\n' "$PUBLISHED_VERSION" "$PACKAGE_VERSION" | sort -V | head -n1)" = "$PUBLISHED_VERSION" ] && [ "$PUBLISHED_VERSION" != "$PACKAGE_VERSION" ]; then
    echo "Version check passed: $PACKAGE_VERSION > $PUBLISHED_VERSION"
    echo "Building package..."
    npm run build
    echo "Publishing $PACKAGE_NAME@$PACKAGE_VERSION to registry..."
    npm publish
  else
    echo "Version check failed or not higher: $PACKAGE_VERSION vs $PUBLISHED_VERSION" >&2
    exit 1
  fi
}

run_npm_checks() {
  npm run lint && npm run format && npm run test && npm run build
}

git_push() {
  COMMIT_MESSAGE=""
  for arg in "$@"; do
    case "$arg" in
      message=*) COMMIT_MESSAGE="${arg#message=}" ;;
    esac
  done
  if [ -z "$COMMIT_MESSAGE" ]; then
    echo "Error: message is required, expected message=\"<commit message>\"" >&2
    exit 1
  fi
  run_npm_checks
  git add . && git commit -m "$COMMIT_MESSAGE" && git push
}
