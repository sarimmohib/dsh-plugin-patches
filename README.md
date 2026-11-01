# DSH plugin patches

Local patches for [DeepSeek Harness](https://github.com/deepseek-ai) plugins, kept in one
place so they survive `dsh plugin add` / `dsh plugin update` — which rebuild a package
from the store and silently revert any edits to its files.

Two things live here:

| Path | What it is |
|---|---|
| [`free-web-search/`](free-web-search/) | A patched copy of `dsh-free-web-search` (upstream: [delef/dsh-free-web-search](https://github.com/delef/dsh-free-web-search), Apache-2.0) |
| [`patches/`](patches/) | The scripts that produce those edits, plus the reapply runner |
| [`skills/install-dsh-plugin/`](skills/install-dsh-plugin/SKILL.md) | A DSH skill teaching agents how to install plugins correctly |

## Why patches instead of a fork

Upstream `dsh-free-web-search` does not yet accept the fixes below. Rather than
maintain a divergent fork, this repo keeps the **patched build output** together with
the **scripts that generate it**, so the edits are reproducible and reviewable rather
than an unexplained blob of JavaScript.

Run the reapply script after any `dsh plugin add/update`:

```powershell
powershell -ExecutionPolicy Bypass -File patches\reapply-free-web-search.ps1
```

## What the free-web-search patches change

Four edits, each a small textual patch (see `patches/patch-free-web-search-*.mjs`):

1. **`unwrapVolatile`** — unwraps the volatile settings wrapper so the settings card
   reads plain values instead of the wrapper object.
2. **User-layer settings** — reads `descriptor?.user` so a user-layer override is
   honoured rather than being shadowed by the deployment default.
3. **`.volatile()`** — applies volatile semantics to the settings descriptor.
4. **`SettingsConflictError`** — imports the real error type instead of falling
   through to a generic throw.

The bundle patch also changes the default provider:

```yaml
- insert:
    - id: web-search-free
      name: dsh-free-web-search
      config:
        provider: anysearch     # upstream ships `bing`
        bingMarket: en-US
```

Upstream defaults to `bing`, whose scraped SERP returns unrelated pages; the keyless
AnySearch engine gives usable results without an API key.

Every marker is verified after patching — the script reads the files back rather than
trusting an exit code:

```powershell
$js = Get-Content free-web-search\lib\index.js -Raw
$js -match 'unwrapVolatile'   # True
$js -match 'descriptor\?\.user' # True
```

## The plugin-installation skill

[`skills/install-dsh-plugin/SKILL.md`](skills/install-dsh-plugin/SKILL.md) is built
around the failure mode that actually bites: **`dsh plugin add` installs the package but
does not register the bundle.** Without a matching entry in `dsh.profile.bundles` the
plugin never loads and reports no error at all.

It also covers:

- the `dsh.bundle` / `dsh.client` contract a loadable plugin must declare
- verifying a plugin actually mounted via `dsh --dump-config`
- a failure-mode table (installed-but-inert, disabled row, missing settings card)
- surviving `dsh plugin update`, including the Electron stdout quirk where
  `ELECTRON_RUN_AS_NODE=1` exits non-zero on success and returns empty captured output
- restarting DSH so changes take effect, and why a helper launched with
  `Start-Process` from an agent tool call dies before it can act

To install it, copy the folder into your skills root:

```powershell
Copy-Item skills\install-dsh-plugin -Recurse "$env:USERPROFILE\.dsh\skills\" -Force
```

## Scope and caveats

- These are **build artifacts**, not source. `free-web-search/lib/` is compiled output;
  the real source lives upstream. Do not send pull requests against this repo.
- Patches are tied to the versions they were built against (`dsh-free-web-search` 0.1.0).
  A version bump can move the anchors — the scripts print `MISS:` rather than silently
  producing a half-patched file, so a failed reapply is visible.
- `dsh-engram` translation scripts are included in `patches/` for convenience but are
  not part of the search plugin.

## License

`free-web-search/` retains upstream's Apache-2.0 [`LICENSE`](free-web-search/LICENSE)
and identifies its author in `package.json`. The patch scripts and skill are provided
under the same terms.
