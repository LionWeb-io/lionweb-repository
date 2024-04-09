# Publish and Tag Docker Image

The `publish-docker.sh` script does the following interactively:

- Ask which packages to  include (always answer by SPACE-RETURN)
- Ask which packages get a major version bump
  - SPACE-RETURN will result in a major version bump
  - RETURN will ask a new question which packages get a minor version bump
    - SPACE-RETURN will get a minor version bump
    - RETURN will get a new patch version
- Ask a short description. 
  Don’t leave this empty, it requires some text. 
  The text ends up in a CHANGELOG.md file (per package) cumulatively for each version. 
  I have not yet checked in this file, but we can do that
- Ask a question whether this all is ok:
  - ENTER (is yes)

The script then

- updates the versions of all packages, and also the versions of the dependencies to the packages (both in the package.json).   
- Creates a tag @lionweb/repository@<version>
- Commits all changes to the package.json files and the new tag to git
- Pushes this commit

On the CI this results in the tag being added to the repository and a docker image to be published on github.  
