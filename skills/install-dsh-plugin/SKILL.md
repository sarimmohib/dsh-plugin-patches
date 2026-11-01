---
name: install-dsh-plugin
description: Use when installing, enabling, disabling, removing, or repairing a DeepSeek Harness (DSH) plugin/extension bundle in a profile - to add the package, register it in dsh.profile.bundles, verify it actually mounted, and handle the failure modes where a plugin installs but silently never loads.
whenToUse: The user wants to install a DSH plugin, a plugin was added but does nothing, a plugin's tools/commands/UI are missing, or a plugin must be removed or updated.
---

# Install a DSH plugin

A DSH plugin is a **package plus a bundle registration**. Installing the package is
only half the job — if it is not listed in the profile's `dsh.profile.bundles`, it
never loads and reports no error. Most "the plugin doesn't work" reports are this
second step being missed.

## 1. Know where things live

| Path | What it is |
|---|---|
| `$env:DSH_HOME` (default `C:\Users\<user>\.dsh`) | Harness home |
| `%DSH_HOME%\profiles\<name>\package.json` | The profile: dependencies **and** `dsh.profile.bundles` |
| `%DSH_HOME%\profiles\<name>\cordis.patch.yml` | Your own overrides, applied after the bundles |
| `%DSH_HOME%\profiles\<name>\cordis.yml` | Empty entry list — **do not edit**; the tree is composed from patches |
| `%DSH_HOME%\profiles\<name>\node_modules\` | Installed plugins |

The CLI is `dsh.cmd` under
`C:\Users\<user>\AppData\Local\Programs\DeepSeek Harness\resources\runtime\cli\bin\`.

## 2. Install the package

`dsh plugin` is a thin forwarder to `pnpm` inside the profile directory:

```powershell
$dsh = 'C:\Users\Sarim\AppData\Local\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd'

# from the npm registry
& $dsh plugin --profile web add dsh-some-plugin

# from a GitHub repo
& $dsh plugin --profile web add github:owner/repo

# from a local directory (development)
& $dsh plugin --profile web add file:C:\path\to\plugin

# remove
& $dsh plugin --profile web remove dsh-some-plugin
```

`--profile` picks the profile. Use `web` for the browser surface, `tui` for the
terminal, `desktop` for the desktop app. **Check which profile the user actually
runs** before installing — a plugin added to `web` does nothing for `desktop`.

## 3. Register the bundle — the step everyone misses

`dsh plugin add` updates `dependencies` but **not** `dsh.profile.bundles`. Edit
`%DSH_HOME%\profiles\<name>\package.json` by hand and append the package name:

```json
{
  "dependencies": { "dsh-some-plugin": "^1.0.0" },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "dsh-some-plugin"
      ]
    }
  }
}
```

Order matters: bundles load in array order and later patch layers win. A plugin
that overrides a base row must come **after** `@deepseek-ai/dsh-base`.

## 4. Verify it actually mounted

The only trustworthy check is the composed tree:

```powershell
& $dsh --profile web --dump-config > $env:TEMP\dump.yml
Select-String -Path $env:TEMP\dump.yml -Pattern 'some-plugin' -Context 2,4
```

Look for the row and confirm it is **not** `disabled: true`:

```
- id: some-plugin
  name: dsh-some-plugin        # good
- id: some-plugin
  name: dsh-some-plugin
  disabled: true               # installed but inert
```

`--dump-default-config` prints the tree without your user layer, so comparing the
two isolates whether your own override is the thing disabling it.

A mounted plugin's tools and commands then appear in the session; a web plugin
also contributes its `client.js` to the boot manifest.

## 5. What a plugin package must declare

A loadable plugin has a `dsh` block in its `package.json`:

```json
{
  "name": "dsh-some-plugin",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "inject": ["@deepseek-ai/dsh-client-runtime"] }
  }
}
```

- `dsh.bundle.patch` — the patch file that inserts the plugin's row(s).
- `dsh.client` — present only if the plugin has a **browser** half. `inject` lists
the client packages its browser code imports.

A minimal `cordis.patch.yml` inserts one row:

```yaml
- insert:
    - id: some-plugin
      name: dsh-some-plugin
      config:
        someOption: value
```

To override an existing row instead of adding one, target it by `id`:

```yaml
- id: compaction-basic
  disabled: true      # patch the row that is already in the tree
```

## 6. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| Plugin installed, nothing happens | Not in `dsh.profile.bundles` | Add it (step 3) |
| `disabled: true` in the dump | Your own patch layer or a later bundle disabled it | Find the later layer; order it after |
| Row present, tools missing | Plugin adds only a UI half, or its preset row is not in the session's agent preset | Check `dsh.client` and the preset |
| Settings card absent | Host provides no settings namespace for that package | Expected on older DSH |
| Works, then breaks after an upgrade | `dsh plugin update` rebuilt from the store and reverted local patches | Re-apply your patches (step 7) |

## 7. Surviving updates

`dsh plugin add` and `dsh plugin update` rebuild the package from the store, which
silently **reverts any local edits** to its files. If you patched a plugin, keep the
patch as a script and re-run it after every update:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Users\Sarim\.dsh\patches\reapply-free-web-search.ps1
```

Judge a patch script by reading the files back, not by its exit code or stdout —
the Electron binary (`ELECTRON_RUN_AS_NODE=1`) can exit non-zero on success and
returns **empty captured stdout**, so `$out = & $exe ...` is empty even when the
script ran fine:

```powershell
$env:ELECTRON_RUN_AS_NODE = '1'
& $exe .\patch.mjs $dir          # run it
# then verify by re-reading the file, e.g.:
Select-String -Path $dir\lib\index.js -Pattern 'myMarker' -Quiet
```

## 8. Restarting after a change

Profile and bundle changes take effect only on a **new process**. DSH runs as a
process tree and kills processes it spawned when a tool call ends, so a helper
launched with `Start-Process` from an agent tool call dies before it can restart
the app. Launch it through WMI instead, which reparents it outside that boundary:

```powershell
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{
  CommandLine = "cmd.exe /c C:\path\to\restart-helper.bat"
}
```

To stop DSH, kill the **tree** — killing only the main PID orphans the host, GPU,
and renderer processes, which keep the port bound:

```powershell
taskkill /F /T /IM "DeepSeek Harness.exe"
```
