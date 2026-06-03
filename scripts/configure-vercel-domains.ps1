param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectName,

  [string[]]$Domains = @(
    "mtendereeducationconsult.com",
    "www.mtendereeducationconsult.com",
    "admin.mtendereeducationconsult.com",
    "api.mtendereeducationconsult.com"
  ),

  [switch]$IncludeSendGridTrackingDomains
)

$ErrorActionPreference = "Stop"

if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
  throw "Vercel CLI was not found. Install it with: npm i -g vercel"
}

$sendGridOwnedDomains = @(
  "links.mtendereeducationconsult.com",
  "mail.mtendereeducationconsult.com"
)

if ($IncludeSendGridTrackingDomains) {
  Write-Warning "You requested links/mail on Vercel. This conflicts with SendGrid DNS when those hosts CNAME to sendgrid.net."
  $Domains = @($Domains + $sendGridOwnedDomains | Select-Object -Unique)
} else {
  Write-Host "Keeping links.mtendereeducationconsult.com and mail.mtendereeducationconsult.com on SendGrid."
  Write-Host "Do not add them to Vercel while their DNS CNAME records point to SendGrid."
}

foreach ($domain in $Domains) {
  Write-Host "Adding $domain to Vercel project $ProjectName..."
  vercel domains add $domain $ProjectName
}

Write-Host "Vercel domain configuration submitted."
Write-Host "Expected Cloudflare DNS for Vercel app hosts:"
Write-Host "  mtendereeducationconsult.com -> Vercel apex record shown by Vercel"
Write-Host "  www.mtendereeducationconsult.com -> cname.vercel-dns.com"
Write-Host "  admin.mtendereeducationconsult.com -> cname.vercel-dns.com"
Write-Host "  api.mtendereeducationconsult.com -> cname.vercel-dns.com"
Write-Host ""
Write-Host "Expected SendGrid DNS remains:"
Write-Host "  links.mtendereeducationconsult.com -> sendgrid.net"
Write-Host "  mail.mtendereeducationconsult.com -> u54085667.wl168.sendgrid.net"
