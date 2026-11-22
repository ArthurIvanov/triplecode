"""Keep Electron's main thread responsive while macOS authorizes Keychain access."""

from pathlib import Path
import shutil
import sys


out = Path(sys.argv[1]) / "out"


def patch(path, replacements):
    source = path.read_text()
    for old, new in replacements:
        if source.count(old) != 1:
            raise SystemExit(f"Expected exactly one Electron Keychain anchor: {old}")
        source = source.replace(old, new)
    path.write_text(source)


decrypt_error = "TripleCode could not decrypt the secret with macOS Keychain"
shutil.copyfile(Path(__file__).with_name("keychain-worker.mjs"), out / "keychain-worker.mjs")
patch(out / "main.js", ((
    'await import("./mainImpl.js");',
    'if(process.argv.includes("--triplecode-keychain-worker"))'
    '(await import("./keychain-worker.mjs")).runKeychainWorker();'
    'else await import("./mainImpl.js");',
),))
patch(out / "mainImpl.js", (
    (
        'import{safeStorage as y5,app as v5}from"electron";',
        'import{safeStorage as y5,app as v5}from"electron";'
        'import{requestKeychain}from"./keychain-worker.mjs";',
    ),
    (
        "JSON.stringify(_s.encryptString(n))",
        'JSON.stringify(Buffer.from(await requestKeychain("encrypt",n),"base64"))',
    ),
    (
        "let r=_s.decryptString(t);",
        'let r;try{r=await requestKeychain("decrypt",t.toString("base64"))}'
        f'catch(error){{throw new Error("{decrypt_error}",{{cause:error}})}}',
    ),
    (
        'isEncryptionAvailable(){this.logService.trace("[EncryptionMainService]',
        'async isEncryptionAvailable(){this.logService.trace("[EncryptionMainService]',
    ),
    # Workbench selects its storage backend even when there is no secret to read.
    # On macOS, select Keychain without starting I/O. Encrypt/decrypt request the
    # key themselves and reject if it is unavailable.
    ("let n=_s.isEncryptionAvailable();", "let n=v5.isReady();"),
))

# Permission can be granted later. A failed Keychain read must keep the encrypted value.
patch(out / "vs/workbench/workbench.desktop.main.js", ((
    'catch(i){this._logService.error(i);let n=Cti(e);this._logService.trace("[secrets] deleting invalid secret',
    f'catch(i){{this._logService.error(i);if(i?.message==="{decrypt_error}")return;'
    'let n=Cti(e);this._logService.trace("[secrets] deleting invalid secret',
),))
