$ErrorActionPreference = 'Stop'
# Re-apply every compatibility patch to the installed dsh-free-web-search copies.
# Needed after `dsh plugin add/update`, which rebuilds the package from the store
# and silently reverts both the JS patches and the bundle patch's provider.
#
#   powershell -ExecutionPolicy Bypass -File reapply-free-web-search.ps1
$patches = 'C:\Users\Sarim\.dsh\patches'
$exe = 'C:\Users\Sarim\AppData\Local\Programs\DeepSeek Harness\DeepSeek Harness.exe'
$dirs = @(
  'C:/Users/Sarim/.dsh/profiles/desktop/node_modules/dsh-free-web-search',
  'C:/Users/Sarim/.dsh/profiles/web/node_modules/dsh-free-web-search'
) | Where-Object { Test-Path $_ }

$env:ELECTRON_RUN_AS_NODE = '1'
# The Electron binary exits non-zero even on success, so judge each patch by its
# output: a genuine anchor failure prints `Error:` / `pattern not found`.
foreach ($script in 'patch-free-web-search.mjs','patch-free-web-search-volatile.mjs','patch-free-web-search-userlayer.mjs','patch-free-web-search-unwrap.mjs','patch-free-web-search-engine2.mjs','patch-free-web-search-command-description.mjs') {
  $out = (& $exe (Join-Path $patches $script) @dirs 2>&1) -join "`n"
  Write-Output $out
  if ($out -match 'pattern not found|anchor not found|^Error:|\nError:') { throw "$script failed" }
}

# The bundle patch ships `provider: bing`; Bing's scraped SERP returns unrelated
# pages, so default to the keyless AnySearch engine instead.
foreach ($dir in $dirs) {
  $file = Join-Path $dir 'cordis.patch.yml'
  $text = Get-Content $file -Raw
  if ($text -match 'provider: anysearch') { Write-Output "skip (already applied): $file"; continue }
  Set-Content -Path $file -Value ($text -replace 'provider: bing', 'provider: anysearch') -Encoding utf8
  Write-Output "patched: $file"
}
# Prove the edits are present rather than trusting the patch exit status.
foreach ($dir in $dirs) {
  $js = Join-Path $dir 'lib/index.js'
  $text = Get-Content $js -Raw
  $missing = @()
  if ($text -notmatch 'unwrapVolatile') { $missing += 'unwrap' }
  if ($text -notmatch 'descriptor\?\.user') { $missing += 'user-layer' }
  if ($text -notmatch '\.volatile\(\)') { $missing += 'volatile' }
  if ($text -notmatch 'SettingsConflictError } from') { $missing += 'imports' }
  if ($missing.Count -gt 0) { throw "$js is missing: $($missing -join ', ')" }
  Write-Output "verified: $js"

  # The command contribution's `description` must be a thunk: the host command
  # menu calls contribution.description(). A plain string throws
  # "TypeError: contribution.description is not a function", which kills the
  # whole candidate list, so the + button opens nothing and "/" shows no menu.
  $clientJs = Join-Path $dir 'lib/client.js'
  $clientText = Get-Content $clientJs -Raw
  if ($clientText -match 'description:\s*"Switch web search engine"') {
    throw "$clientJs registers a string description; the + / slash menu will be dead"
  }
  if ($clientText -notmatch 'description:\s*\(\)\s*=>\s*"Switch web search engine"') {
    throw "$clientJs is missing the command description thunk"
  }
  Write-Output "verified (plus menu alive): $clientJs"
}
# ---- dsh-engram English translation ----
# dsh-engram ships Chinese UI text and a Chinese [ESR] block injected into the
# system prompt every turn. Four passes cover it:
#   patch-engram-english.mjs        host: ESR block, settings, mental model, tools
#   patch-engram-english2.mjs       host: capsule, push-legs, result-pack, todo-sink
#   patch-engram-client-english.mjs browser: lib/client.js (the ESR board + card)
#   fix-engram-client-quotes.mjs    repairs quotes the client pass can break
#
# lib/client.js stores its Chinese as \uXXXX escapes, so a plain text scan of the
# file finds nothing -- the browser half must be decoded before it is visible.
# `dsh plugin add/update` reverts all of this, so it lives here.
#
# The Electron binary returns empty captured stdout, so judge the result by
# reading the files back rather than by parsing the script's output.
foreach ($dir in @('C:/Users/Sarim/.dsh/profiles/desktop/node_modules/dsh-engram')) {
  if (-not (Test-Path $dir)) { continue }
  foreach ($script in 'patch-engram-english.mjs','patch-engram-english2.mjs','patch-engram-client-english.mjs','fix-engram-client-quotes.mjs') {
    & $exe (Join-Path $patches $script) $dir
  }

  # Rendered = a CJK line that is not a comment.
  $bad = @()
  foreach ($rel in 'lib/index-block.js','lib/settings.js','lib/mental.js','lib/tools.js','lib/capsule.js','lib/push-legs.js','lib/result-pack.js','lib/todo-sink.js') {
    $file = Join-Path $dir $rel
    if (-not (Test-Path $file)) { continue }
    $n = (Get-Content $file | Where-Object { $_ -match '[\u4e00-\u9fff]' -and $_ -notmatch '^\s*(//|\*|/\*)' }).Count
    if ($n -gt 0) { $bad += "$rel=$n" }
  }

  # The browser bundle keeps non-ASCII as \uXXXX escapes; decode, then look for
  # any Chinese code point at all (there should be none left).
  $client = Join-Path $dir 'lib/client.js'
  if (Test-Path $client) {
    $raw = Get-Content $client -Raw
    $decoded = [regex]::Replace($raw, '\\u([0-9a-fA-F]{4})', { param($m) [string][char][Convert]::ToInt32($m.Groups[1].Value, 16) })
    $m = [regex]::Matches($decoded, '[\u4e00-\u9fff]')
    if ($m.Count -gt 0) { $bad += "lib/client.js=$($m.Count)" }
  }

  if ($bad.Count -gt 0) { throw "$dir still has Chinese rendered text: $($bad -join ', ')" }
  Write-Output "verified (English): $dir"
}

Write-Output 'reapply complete'
