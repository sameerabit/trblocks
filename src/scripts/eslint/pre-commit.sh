#!/bin/bash
for file in $(git diff --cached --name-only | grep -E '\.(js|jsx)$')
do
  git show ":$file" | $(npm bin)/eslint -c .eslintrc.js . --ignore-pattern .gitignore --stdin --stdin-filename "$file" # we only want to lint the
  # staged changes
  if [ $? -ne 0 ]; then
    echo "ESLint failed on staged file '$file'. Please check your code and try again or skip linting by using \"git commit -n ...\""
    exit 1 # exit with failure status
  fi
done
