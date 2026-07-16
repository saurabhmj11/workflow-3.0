# lock-env.ps1
# Locks all .env* files in the project root so only the current Windows user can read/write them.
# Run this after creating or updating your .env file.
# Usage: powershell -ExecutionPolicy Bypass -File scripts\lock-env.ps1

$projectRoot = Split-Path -Parent $PSScriptRoot
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

Write-Host ""
Write-Host "=== ENV FILE LOCKER ===" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "Locking to user: $currentUser"
Write-Host ""

# Find all .env* files in project root (not in node_modules or .next)
$envFiles = Get-ChildItem -Path $projectRoot -Force |
    Where-Object { $_.Name -match "^\.env" -and -not $_.PSIsContainer }

if ($envFiles.Count -eq 0) {
    Write-Host "No .env files found in project root." -ForegroundColor Yellow
    Write-Host "Create a .env file first, then run this script." -ForegroundColor Yellow
    exit 0
}

foreach ($file in $envFiles) {
    try {
        $acl = Get-Acl $file.FullName

        # Remove inheritance, don't copy inherited rules
        $acl.SetAccessRuleProtection($true, $false)

        # Clear all existing rules
        $acl.Access | ForEach-Object { $acl.RemoveAccessRule($_) | Out-Null }

        # Grant ONLY the current user full control
        $rule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $currentUser,
            "FullControl",
            "Allow"
        )
        $acl.SetAccessRule($rule)

        Set-Acl -Path $file.FullName -AclObject $acl

        Write-Host "LOCKED: $($file.Name)" -ForegroundColor Green

        # Verify
        $verifiedAcl = (Get-Acl $file.FullName).Access
        foreach ($entry in $verifiedAcl) {
            Write-Host "  -> $($entry.IdentityReference): $($entry.FileSystemRights) [$($entry.AccessControlType)]" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "ERROR locking $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done. Your .env files are now owner-only." -ForegroundColor Cyan
Write-Host "Remember: .env* is already in .gitignore — it will never be committed." -ForegroundColor Cyan
Write-Host ""
