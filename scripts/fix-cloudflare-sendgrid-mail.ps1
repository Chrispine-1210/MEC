$ErrorActionPreference = "Stop"

$domain = "mtendereeducationconsult.com"
$recordName = "mail.$domain"
$expectedTarget = "u54085667.wl168.sendgrid.net"

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

function Invoke-Cloudflare {
  param(
    [Parameter(Mandatory = $true)][string]$Method,
    [Parameter(Mandatory = $true)][string]$Uri,
    [object]$Body = $null
  )

  $headers = @{ "Content-Type" = "application/json" }

  if ($env:CLOUDFLARE_API_TOKEN) {
    $headers.Authorization = "Bearer $($env:CLOUDFLARE_API_TOKEN.Trim())"
  } elseif ($env:CLOUDFLARE_EMAIL -and $env:Global_API_Key) {
    $headers["X-Auth-Email"] = $env:CLOUDFLARE_EMAIL.Trim()
    $headers["X-Auth-Key"] = $env:Global_API_Key.Trim()
  } else {
    throw "Set CLOUDFLARE_API_TOKEN with Zone:DNS Edit permission, or set CLOUDFLARE_EMAIL and Global_API_Key."
  }

  $jsonBody = if ($null -ne $Body) { $Body | ConvertTo-Json -Depth 5 } else { $null }
  try {
    if ($jsonBody) {
      Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body $jsonBody
    } else {
      Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
    }
  } catch {
    $status = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "no_response" }
    if ($status -eq 403) {
      throw "Cloudflare refused DNS access with 403. The token is active but lacks DNS edit permission for $domain."
    }
    throw
  }
}

Import-LocalEnv

if (-not $env:CLOUDFLARE_ZONE_ID) {
  throw "CLOUDFLARE_ZONE_ID is missing."
}

$zoneId = $env:CLOUDFLARE_ZONE_ID.Trim()
$base = "https://api.cloudflare.com/client/v4/zones/$zoneId/dns_records"
$encodedName = [uri]::EscapeDataString($recordName)
$lookup = Invoke-Cloudflare -Method Get -Uri "${base}?name=$encodedName"
if (-not $lookup.success) {
  throw "Cloudflare lookup failed for $recordName."
}

$existingRecords = @($lookup.result)
$body = @{
  type = "CNAME"
  name = $recordName
  content = $expectedTarget
  ttl = 1
  proxied = $false
}

$cname = $existingRecords | Where-Object { $_.type -eq "CNAME" } | Select-Object -First 1
if ($cname) {
  $updated = Invoke-Cloudflare -Method Patch -Uri "$base/$($cname.id)" -Body $body
  if (-not $updated.success) {
    throw "Cloudflare update failed for $recordName."
  }
  Write-Host "Updated $recordName -> $expectedTarget"
} else {
  foreach ($record in $existingRecords) {
    $deleted = Invoke-Cloudflare -Method Delete -Uri "$base/$($record.id)"
    if (-not $deleted.success) {
      throw "Cloudflare conflict delete failed for $recordName."
    }
  }

  $created = Invoke-Cloudflare -Method Post -Uri $base -Body $body
  if (-not $created.success) {
    throw "Cloudflare create failed for $recordName."
  }
  Write-Host "Created $recordName -> $expectedTarget"
}

Write-Host "Run npm run sendgrid:dns:verify to confirm propagation."
