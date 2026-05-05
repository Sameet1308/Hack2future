# Hack2future - one-shot GitHub setup
# Run from this folder:  powershell -ExecutionPolicy Bypass -File .\setup-repo.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (Test-Path .git) {
    Write-Host "Removing existing .git folder..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force .git
}

Write-Host "Initializing git repo..." -ForegroundColor Cyan
git init -b main

Write-Host "Staging and committing..." -ForegroundColor Cyan
git add .
git commit -m "Initial commit"

Write-Host "Adding remote and pushing to GitHub..." -ForegroundColor Cyan
git remote add origin https://github.com/Sameet1308/Hack2future.git
git push -u origin main

Write-Host ""
Write-Host "Done! Repo is live at https://github.com/Sameet1308/Hack2future" -ForegroundColor Green
