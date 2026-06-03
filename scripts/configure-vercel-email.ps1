param(
  [string[]]$Environments = @("production", "preview", "development"),
  [switch]$SkipSendGridSecret
)

$ErrorActionPreference = "Stop"

function Convert-SecureStringToPlainText {
  param([Parameter(Mandatory = $true)][securestring]$SecureValue)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Set-VercelEnv {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Environment
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    Write-Host "Skipping $Name for $Environment because the value is empty."
    return
  }

  Write-Host "Configuring $Name for $Environment..."
  vercel env rm $Name $Environment --yes 2>$null | Out-Null
  $Value | vercel env add $Name $Environment | Out-Null
}

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw "Vercel CLI was not found. Install it with: npm i -g vercel"
}

$sendGridApiKey = $env:SENDGRID_API_KEY
if (-not $sendGridApiKey -and $env:SMTP_HOST -match "sendgrid\.net$" -and $env:SMTP_USER -eq "apikey") {
  $sendGridApiKey = $env:SMTP_PASSWORD
}

if ($sendGridApiKey -and $sendGridApiKey -notmatch "^SG\.") {
  Write-Host "Ignoring existing SendGrid value because it does not look like a SendGrid API key."
  $sendGridApiKey = $null
}

if (-not $sendGridApiKey -and -not $SkipSendGridSecret) {
  $secureKey = Read-Host "Enter SendGrid API key (input hidden)" -AsSecureString
  $sendGridApiKey = Convert-SecureStringToPlainText $secureKey
}

$values = [ordered]@{
  EMAIL_FROM = 'Mtendere Education Consult <no-reply@mail.mtendereeducationconsult.com>'
  EMAIL_PROVIDER_ORDER = 'sendgrid,resend,postmark,ses,custom'
  EMAIL_DRY_RUN = 'false'
  EMAIL_LINK_BASE_URL = 'https://links.mtendereeducationconsult.com'
  SENDGRID_TRACKING_ENABLED = 'true'
  SENDGRID_API_KEY = $sendGridApiKey
}

foreach ($environment in $Environments) {
  foreach ($entry in $values.GetEnumerator()) {
    Set-VercelEnv -Name $entry.Key -Value $entry.Value -Environment $environment
  }
}

Write-Host "Vercel email environment configuration completed."
Write-Host "Redeploy after this script finishes, then verify /api/health shows email.ready=true and activeProviders includes sendgrid."
