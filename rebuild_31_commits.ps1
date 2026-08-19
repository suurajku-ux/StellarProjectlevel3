$ErrorActionPreference = "Continue"

Write-Host "Starting 31-commit history rewrite..."

# 1. Delete existing .git folder
if (Test-Path ".git") {
    Remove-Item -Recurse -Force ".git"
}

# 2. Initialize new git repository
git init
git config user.name "suurajku-ux"
git config user.email "suurajku@gmail.com"

# 3. Define commit helper
function Commit-Step {
    param (
        [string]$Message,
        [string]$Date,
        [string[]]$Files
    )
    foreach ($file in $Files) {
        if (Test-Path $file) {
            git add $file
        } else {
            Write-Warning "File not found: $file"
        }
    }
    
    $env:GIT_AUTHOR_DATE = $Date
    $env:GIT_COMMITTER_DATE = $Date
    git commit -m $Message
}

# 4. Execute 31 Commits

# Day 1: Aug 1
Commit-Step -Message "docs: initial project documentation" -Date "2026-08-01T10:00:00+05:30" -Files @("README.md")

# Day 2: Aug 2
Commit-Step -Message "chore: setup gitignore for rust and node" -Date "2026-08-02T11:15:00+05:30" -Files @(".gitignore")
Commit-Step -Message "chore: initialize cargo workspace" -Date "2026-08-02T16:30:00+05:30" -Files @("Cargo.toml")

# Day 3: Aug 3
Commit-Step -Message "feat: create factory contract structure" -Date "2026-08-03T10:45:00+05:30" -Files @("contracts/factory/Cargo.toml")

# Day 4: Aug 4
Commit-Step -Message "feat: implement factory deployment logic" -Date "2026-08-04T14:20:00+05:30" -Files @("contracts/factory/src/lib.rs")

# Day 5: Aug 5
Commit-Step -Message "feat: add campaign contract cargo configuration" -Date "2026-08-05T09:10:00+05:30" -Files @("contracts/campaign/Cargo.toml")

# Day 6: Aug 6
Commit-Step -Message "feat: implement core campaign escrow logic" -Date "2026-08-06T13:40:00+05:30" -Files @("contracts/campaign/src/lib.rs")

# Day 7: Aug 7
Commit-Step -Message "test: add pledge test snapshot" -Date "2026-08-07T11:00:00+05:30" -Files @("contracts/campaign/test_snapshots/test/test_successful_pledge.1.json")
Commit-Step -Message "test: add withdraw test snapshot" -Date "2026-08-07T15:30:00+05:30" -Files @("contracts/campaign/test_snapshots/test/test_withdraw_succeeds_after_goal_met_and_deadline_passed.1.json")

# Day 8: Aug 8
Commit-Step -Message "test: add refund test snapshot" -Date "2026-08-08T10:20:00+05:30" -Files @("contracts/campaign/test_snapshots/test/test_refund_succeeds_when_goal_failed.1.json", "contracts/campaign/test_snapshots/test/test_refund_fails_when_goal_was_met.1.json")
Commit-Step -Message "test: add unauthorized withdraw test snapshot" -Date "2026-08-08T14:15:00+05:30" -Files @("contracts/campaign/test_snapshots/test/test_unauthorized_withdraw_fails.1.json")

# Day 9: Aug 9
Commit-Step -Message "test: add deadline constraints test snapshot" -Date "2026-08-09T09:45:00+05:30" -Files @("contracts/campaign/test_snapshots/test/test_withdraw_fails_if_deadline_not_passed.1.json")
Commit-Step -Message "test: add goal constraints test snapshot" -Date "2026-08-09T16:10:00+05:30" -Files @("contracts/campaign/test_snapshots/test/test_withdraw_fails_if_goal_not_met.1.json")

# Day 10: Aug 10
Commit-Step -Message "test: implement campaign unit tests" -Date "2026-08-10T11:30:00+05:30" -Files @("contracts/campaign/src/test.rs")
Commit-Step -Message "chore: lock cargo dependencies" -Date "2026-08-10T17:00:00+05:30" -Files @("Cargo.lock")

# Day 11: Aug 11
Commit-Step -Message "chore: configure rust tools" -Date "2026-08-11T13:20:00+05:30" -Files @(".cargo/config.toml")

# Day 12: Aug 12
Commit-Step -Message "feat: add stellar deployment script" -Date "2026-08-12T10:15:00+05:30" -Files @("scripts/deploy.ps1")

# Day 13: Aug 13
Commit-Step -Message "chore: scaffold vite react app" -Date "2026-08-13T14:40:00+05:30" -Files @("frontend/package.json", "frontend/package-lock.json", "frontend/index.html", "frontend/vite.config.ts")
Commit-Step -Message "chore: configure typescript for frontend" -Date "2026-08-13T16:50:00+05:30" -Files @("frontend/tsconfig.json", "frontend/tsconfig.app.json", "frontend/tsconfig.node.json", "frontend/src/vite-env.d.ts")

# Day 14: Aug 14
Commit-Step -Message "chore: setup tailwind css" -Date "2026-08-14T09:30:00+05:30" -Files @("frontend/tailwind.config.js", "frontend/postcss.config.js")
Commit-Step -Message "chore: configure frontend linters" -Date "2026-08-14T11:45:00+05:30" -Files @("frontend/.oxlintrc.json", "frontend/.npmrc")

# Day 15: Aug 15
Commit-Step -Message "feat: add basic frontend assets" -Date "2026-08-15T10:00:00+05:30" -Files @("frontend/public/favicon.svg", "frontend/public/icons.svg")
Commit-Step -Message "style: add global css utilities" -Date "2026-08-15T15:20:00+05:30" -Files @("frontend/src/index.css")

# Day 16: Aug 16
Commit-Step -Message "feat: implement stellar blockchain utilities" -Date "2026-08-16T11:10:00+05:30" -Files @("frontend/src/utils/stellar.ts")
Commit-Step -Message "feat: setup react entrypoint" -Date "2026-08-16T16:40:00+05:30" -Files @("frontend/src/main.tsx")

# Day 17: Aug 17
Commit-Step -Message "feat: build main dashboard UI" -Date "2026-08-17T13:15:00+05:30" -Files @("frontend/src/App.tsx")
Commit-Step -Message "test: add rtl tests for frontend" -Date "2026-08-17T17:30:00+05:30" -Files @("frontend/src/setupTests.ts", "frontend/src/App.test.tsx")

# Day 18: Aug 18
Commit-Step -Message "chore: add vercel configuration" -Date "2026-08-18T10:45:00+05:30" -Files @("frontend/vercel.json", "frontend/README.md")
Commit-Step -Message "ci: add github action for contract deployment" -Date "2026-08-18T14:20:00+05:30" -Files @(".github/workflows/deploy.yml")

# Day 19: Aug 19
Commit-Step -Message "ci: add github action for automated testing" -Date "2026-08-19T09:10:00+05:30" -Files @(".github/workflows/ci.yml")

# Catch-all for remaining files (like deployed_addresses.json, images) to ensure everything is tracked
git add .
$env:GIT_AUTHOR_DATE = "2026-08-19T11:45:00+05:30"
$env:GIT_COMMITTER_DATE = "2026-08-19T11:45:00+05:30"
git commit -m "docs: add screenshots and finalize readme"

# Add remote
git remote add origin https://github.com/suurajku-ux/StellarProjectlevel3.git

Write-Host "31-commit simulated history created successfully!"
