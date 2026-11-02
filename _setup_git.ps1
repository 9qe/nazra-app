$ErrorActionPreference = "Stop"
Set-Location "C:\Users\pc\Downloads\radarbot-clone"

$ignore = @(
  "node_modules/"
  "dist/"
  ".build/"
  "app/node_modules/"
  "app/ios/"
  "app/android/"
  "app/.expo/"
  "app/dist/"
  "preview/dist/"
  "release/qa/node_modules/"
  "__pycache__/"
  "*.pyc"
  ".DS_Store"
  "Thumbs.db"
  "*.log"
  "npm-debug.log*"
  "mcp/"
) -join "`n"
Set-Content -Path .gitignore -Value $ignore -Encoding UTF8

git init
git add .
git -c user.email=dev@nazra.jo -c user.name="Nazra Build Bot" commit -m "baseline: project as of 2026-11-02 - pre Nazra overhaul (PWA+RN+tools+research)"
git rev-parse --show-toplevel
git log --oneline -n 1
