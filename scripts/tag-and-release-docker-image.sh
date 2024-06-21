#!/usr/bin/env bash

# prepare and apply changeset
npx changeset add
npx changeset version
npx changeset tag

# find the latest tag for the main repository package
# use sort to ensure 0.0.10 comes after 0.0.1 and 0.0.2 etc.
TAG=`git tag -l "@lionweb/repository@*"  --sort=v:refname | tail -1`

# remove all tags for the individual paclages, as they will point to exactly the same commit.
# This avoid too many tags in the repo
git tag -d $(git tag | grep -E "common|bulkapi|additionalapi|dbadmin|history|inspection|languages|server|client|test")

# commit all package.json files
git commit -m "update version to $TAG" -- '*package.json'

# push tag (and therefore all the committed files)
git push --atomic origin  $TAG

