$ErrorActionPreference = "Stop"

$records = @(
  @{ Type = "CNAME"; Name = "links.mtendereeducationconsult.com"; Expected = "sendgrid.net" },
  @{ Type = "CNAME"; Name = "54085667.mtendereeducationconsult.com"; Expected = "sendgrid.net" },
  @{ Type = "CNAME"; Name = "mail.mtendereeducationconsult.com"; Expected = "u54085667.wl168.sendgrid.net" },
  @{ Type = "CNAME"; Name = "mtd1._domainkey.mtendereeducationconsult.com"; Expected = "mtd1.domainkey.u54085667.wl168.sendgrid.net" },
  @{ Type = "CNAME"; Name = "mtd12._domainkey.mtendereeducationconsult.com"; Expected = "mtd12.domainkey.u54085667.wl168.sendgrid.net" },
  @{ Type = "TXT"; Name = "_dmarc.mtendereeducationconsult.com"; Expected = "v=DMARC1; p=none;" }
)

foreach ($record in $records) {
  $answers = Resolve-DnsName -Name $record.Name -Type $record.Type -ErrorAction SilentlyContinue
  $actual = if ($record.Type -eq "TXT") {
    ($answers | ForEach-Object { ($_.Strings -join "") }) -join "; "
  } else {
    ($answers | ForEach-Object { $_.NameHost.TrimEnd(".") }) -join "; "
  }

  $matches = if ($record.Type -eq "TXT") {
    $actual.Trim() -eq $record.Expected.Trim()
  } else {
    [bool](($actual -split ";\s*") | Where-Object { $_.TrimEnd(".") -eq $record.Expected.TrimEnd(".") })
  }
  [pscustomobject]@{
    Type = $record.Type
    Name = $record.Name
    Expected = $record.Expected
    Actual = $actual
    Status = if ($matches) { "ok" } else { "needs_update" }
  }
}
