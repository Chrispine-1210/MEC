param(
  [string[]]$Environments = @("production", "preview", "development"),
  [string]$EmailFrom = "Mtendere Education Consult <no-reply@notifications.mtendereeducationconsult.com>",
  [string]$ProviderOrder = "resend,sendgrid,smtp,postmark,ses,custom",
  [switch]$SkipResendSecret,
  [switch]$SkipSendGridSecret
)

$ErrorActionPreference = "Stop"

function Import-LocalEnv {
  $envPath = Join-Path (Get-Location) ".env"
  if (-not (Test-Path -LiteralPath $envPath)) {
    return
  }

  Get-Content -LiteralPath $envPath | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith("#") -or $line -notmatch "^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$") {
      return
    }

    $name = $matches[1]
    $value = $matches[2].Trim()
    $commentIndex = $value.IndexOf(" #")
    if ($commentIndex -ge 0) {
      $value = $value.Substring(0, $commentIndex).Trim()
    }
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    [Environment]::SetEnvironmentVariable($name, $value.Trim(), "Process")
  }
}

function Convert-SecureStringToPlainText {
  param([Parameter(Mandatory = $true)][securestring]$SecureValue)

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Invoke-VercelCli {
  param(
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $processInfo = [Diagnostics.ProcessStartInfo]::new()
  $processInfo.FileName = $script:VercelCommand.Source
  $processInfo.UseShellExecute = $false
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true

  foreach ($argument in $Arguments) {
    [void]$processInfo.ArgumentList.Add($argument)
  }

  $process = [Diagnostics.Process]::Start($processInfo)
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($stdout) {
    Write-Host $stdout.TrimEnd()
  }
  if ($stderr) {
    Write-Host $stderr.TrimEnd()
  }

  if ($process.ExitCode -ne 0) {
    throw "Vercel CLI failed with exit code $($process.ExitCode): $($Arguments -join ' ')"
  }
}

function Set-VercelEnv {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Value,
    [Parameter(Mandatory = $true)][string]$Environment,
    [switch]$Sensitive
  )

  if ([string]::IsNullOrWhiteSpace($Value)) {
    Write-Host "Skipping $Name for $Environment because the value is empty."
    return
  }

  Write-Host "Configuring $Name for $Environment..."
  $arguments = @("env", "add", $Name, $Environment, "--value", $Value, "--yes", "--force")
  if ($Sensitive -and $Environment -ne "development") {
    $arguments += "--sensitive"
  } else {
    $arguments += "--no-sensitive"
  }

  Invoke-VercelCli -Arguments $arguments
}

$script:VercelCommand = Get-Command vercel.cmd -ErrorAction SilentlyContinue
if (-not $script:VercelCommand) {
  $script:VercelCommand = Get-Command vercel -ErrorAction SilentlyContinue
}

if (-not $script:VercelCommand) {
  throw "Vercel CLI was not found. Install it with: npm i -g vercel"
}

Import-LocalEnv

$resendApiKey = $env:RESEND_API_KEY
if ($resendApiKey -and $resendApiKey -notmatch "^re_") {
  Write-Host "Ignoring existing Resend value because it does not look like a Resend API key."
  $resendApiKey = $null
}

if (-not $resendApiKey -and -not $SkipResendSecret) {
  $secureKey = Read-Host "Enter Resend API key (input hidden)" -AsSecureString
  $resendApiKey = Convert-SecureStringToPlainText $secureKey
}

$sendGridApiKey = $env:SENDGRID_API_KEY
if (-not $sendGridApiKey -and $env:SMTP_HOST -match "sendgrid\.net$" -and $env:SMTP_USER -eq "apikey") {
  $sendGridApiKey = $env:SMTP_PASSWORD
}

if ($sendGridApiKey -and $sendGridApiKey -notmatch "^SG\.") {
  Write-Host "Ignoring existing SendGrid value because it does not look like a SendGrid API key."
  $sendGridApiKey = $null
}

if (-not $sendGridApiKey -and -not $resendApiKey -and -not $SkipSendGridSecret) {
  $secureKey = Read-Host "Enter SendGrid API key (input hidden)" -AsSecureString
  $sendGridApiKey = Convert-SecureStringToPlainText $secureKey
}

$values = [ordered]@{
  RESEND_DOMAIN = if ($env:RESEND_DOMAIN) { $env:RESEND_DOMAIN } else { 'notifications.mtendereeducationconsult.com' }
  EMAIL_FROM = $EmailFrom
  EMAIL_PROVIDER_ORDER = $ProviderOrder
  EMAIL_DRY_RUN = 'false'
  EMAIL_LINK_BASE_URL = 'https://links.mtendereeducationconsult.com'
  RESEND_API_KEY = $resendApiKey
  SENDGRID_TRACKING_ENABLED = 'true'
  SENDGRID_API_KEY = $sendGridApiKey
  SMTP_HOST = $env:SMTP_HOST
  SMTP_PORT = if ($env:SMTP_PORT) { $env:SMTP_PORT } else { '587' }
  SMTP_USER = $env:SMTP_USER
  SMTP_PASSWORD = $env:SMTP_PASSWORD
  CRON_SECRET = $env:CRON_SECRET
}

foreach ($environment in $Environments) {
  foreach ($entry in $values.GetEnumerator()) {
    $isSecret = $entry.Key -in @("RESEND_API_KEY", "SENDGRID_API_KEY", "SMTP_PASSWORD", "CRON_SECRET")
    Set-VercelEnv -Name $entry.Key -Value $entry.Value -Environment $environment -Sensitive:$isSecret
  }
}

Write-Host "Vercel email environment configuration completed."
Write-Host "Redeploy after this script finishes, then verify /api/health shows email.ready=true and activeProviders includes resend, sendgrid, or smtp."
