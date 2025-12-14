Firestore init - secure steps

This repository includes a script to create example documents in Firestore:

- `scripts/initFirestore.js` (uses firebase-admin)

IMPORTANT: Do NOT commit your service account JSON. If you have already exposed one, rotate/revoke it immediately (see below).

Steps (Windows PowerShell):

1. Install admin SDK (once):

```powershell
npm install firebase-admin
```

2. Download a Service Account JSON from Firebase Console (IAM & Admin → Service accounts → Generate new private key). Save it somewhere local, e.g. `C:\keys\turplace-admin.json`.

3. Ensure `.gitignore` excludes the file (this repo already ignores `*.firebase-adminsdk-*.json`).

4. Set env var pointing to the JSON (PowerShell):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\keys\turplace-admin.json'
```

5. Run the init script (optional args: adminUid adminEmail):

```powershell
node scripts/initFirestore.js myAdminUid admin@example.com
# or via npm
npm run init:firestore -- myAdminUid admin@example.com
```

6. Verify in Firebase Console → Firestore that the following were created:
- `users/{adminUid}`
- `services/{sample}` (status: `approved`)
- `leads/{sample}`

Security & cleanup (CRITICAL if key was exposed):

- Revoke the exposed key immediately: Go to Firebase Console → Project Settings → Service Accounts → Manage keys → Revoke/Delete the compromised key.
- Create a new service account key and store it securely.
- If you accidentally committed the JSON, remove it from git history (see below) and force-push the cleaned history.

Commands to remove leaked file from git history (use carefully):

```bash
# remove file from all commits, then force-push
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch path/to/leaked.json" --prune-empty --tag-name-filter cat -- --all
git push origin --force --all
```

Alternatively use BFG Repo Cleaner (recommended for large repos): https://rtyley.github.io/bfg-repo-cleaner/

If you want, I can generate the exact `git` commands for your repo and guide you through the process interactively.
