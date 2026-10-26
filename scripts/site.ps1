<#
Turn the public website (kanakbeautyservice.com) on or off.

  npm run site:off      replace the site with the maintenance page (data and backend untouched)
  npm run site:on       build and deploy the real website again
  npm run site:status   show whether the live site is ON or OFF

Both actions deploy to the Cloudflare Worker "kanak-beauty"; the domain stays attached.
While the site is OFF, do not push to GitHub main: Cloudflare's automatic build would
deploy the real site again.
#>
param(
    [Parameter(Position = 0)]
    [ValidateSet('on', 'off', 'status')]
    [string]$Action = 'status'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
$Site = 'https://kanakbeautyservice.com'
$Marker = 'kanak-maintenance'

function Get-SiteState {
    try {
        # Cache-busting query so Cloudflare/browser caches never hide the current state.
        $html = (Invoke-WebRequest -Uri "$Site/?check=$([guid]::NewGuid())" -UseBasicParsing -TimeoutSec 20).Content
        if ($html -match $Marker) { return 'OFF' } else { return 'ON' }
    } catch {
        return "UNREACHABLE ($($_.Exception.Message))"
    }
}

switch ($Action) {
    'off' {
        Write-Host '==> Deploying the maintenance page to Worker kanak-beauty...'
        Push-Location $Root
        try {
            # Explicit --config: never picks up the real site's wrangler.jsonc or its dist build.
            npx wrangler deploy --config maintenance/wrangler.jsonc
            if ($LASTEXITCODE -ne 0) { throw 'wrangler deploy failed' }
        } finally { Pop-Location }
        Start-Sleep -Seconds 5
        Write-Host "==> Site is now: $(Get-SiteState)"
    }
    'on' {
        Write-Host '==> Building and deploying the real website...'
        Push-Location $Root
        try {
            npm run deploy
            if ($LASTEXITCODE -ne 0) { throw 'build or deploy failed' }
        } finally { Pop-Location }
        Start-Sleep -Seconds 5
        Write-Host "==> Site is now: $(Get-SiteState)"
    }
    'status' {
        Write-Host "Website ($Site): $(Get-SiteState)"
    }
}
