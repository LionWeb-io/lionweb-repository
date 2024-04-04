#!/usr/bin/env bash

# prepare and apply changeset
npx changeset add
set A=`npx changeset version`
echo A: $A
npx changeset tag

# find the latest tag for the main repository package
# use sort to ensure 0.0.10 comes after 0.0.1 and 0.0.2 etc.
TAG=`git tag -l "@lionweb/repository@*"  --sort=v:refname | tail -1`

# commit all package.json files
git commit -m "update version to $TAG" -- '*package.json'

# push tag (and therefore all the committed files)
git push origin
git push origin $TAG
