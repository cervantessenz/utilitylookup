# v g0.002 validation

- TypeScript check passed.
- Static production build passed. The compiled site uses relative asset paths and does not require `/api` endpoints or localhost.
- All 11 automated lookup/retry tests passed.
- Live direct-source checks passed for 602 NE Brazee St (Portland), 12725 SW Millikan Way (Beaverton), and 581 Holmes Ln (Oregon City). All five utilities returned results; water overlaps and provisional sewer districts remain flagged for verification.
- Browser access headers were checked using `Origin: https://example.github.io`. All queried sources returned that origin or `*` in Access-Control-Allow-Origin.
- The compiled interface loaded under `/property-utilities/` before the session interruption. The interactive browser connection was unavailable after resuming, so final end-to-end browser lookup/copy/download checks could not be completed. Test those at your actual published URL before sharing widely.
- This release has not been uploaded to GitHub or deployed. No GitHub account or repository was modified.
- The local v 0.002 app, lookup library, and Vite configuration match the hashes captured before creating this version.

To rerun the direct-source and origin-header checks:

```text
node --experimental-strip-types scripts/check-live.mjs
```

Header checks do not guarantee permanent source availability. Provider data and source browser-access policies can change independently of this release.
