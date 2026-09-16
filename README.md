# Property Utilities Lookup — v g0.002

This is the independent GitHub Pages version of local v 0.002. It runs entirely in the visitor's browser: no Node server, paid backend, API secret, or localhost connection is needed after publishing.

## Publish on GitHub Pages

1. Extract the supplied ZIP on your computer. Do not upload the ZIP itself.
2. Create a **public** GitHub repository (for example, `property-utilities-lookup`) to use GitHub Pages on GitHub Free.
3. Upload the **contents** of this version folder to the repository. The repository should contain `docs/index.html`, `docs/assets/`, `src/`, `package.json`, and this README. Do not nest everything inside an extra `github-version-g0.002` folder.
4. Open the repository's **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select your branch (usually **main**) and the **/docs** folder, then **Save**.
7. Wait for GitHub's deployment to finish. Open the URL GitHub displays and share it with colleagues.

The compiled `docs` folder is already included. You do **not** need to install Node, run a build, buy hosting, configure secrets, or use GitHub Actions to publish this release.

Reference: [GitHub's publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## How it works

- Search and confirm a property address.
- All searches use the house/residential lookup.
- Your browser contacts the same public ArcGIS, PortlandMaps, and Metro sources used by local v 0.002.
- The app retains retry/backoff handling, source links, provider contact information, copy report and CSV export.
- Garbage results warn that multifamily properties require verification against the actual contract or invoice.
- Relative asset paths support repository URLs such as `https://your-name.github.io/property-utilities-lookup/`.

The published website is public. This package includes no portfolio CSVs, saved address searches, AppFolio credentials, or private property records. Typed addresses are sent to the public address geocoder and coordinates to the utility map services. Search results remain in the current page unless you copy or download them.

## Existing data limitations

“Fully browser-based” does not turn advisory maps into definitive service records. Water boundaries can overlap; sewer results are still provisional district/city-boundary matches, not a property-level sewer connection record. Coverage varies outside Portland, and private garbage contracts cannot be determined from a boundary map. All these qualifications remain visible in the report.

Third-party sources can change their browser-access policy or become unavailable. The app reports failures; it does not infer that a property has no service. After publishing, test one address at the actual GitHub URL to confirm access from that origin.

## Future changes and local preview

Requires Node 22.13 or later and npm for development only.

```text
npm ci
npm run dev
```

To rebuild the published site:

```text
npm run test
npm run build
```

Commit/upload the regenerated **docs** folder along with your source changes. GitHub Pages will publish it.

To preview the exact compiled files under a repository-style path:

```text
npm run preview
```

Open `http://127.0.0.1:5174/property-utilities/`. This preview serves static files only and contains no utility API endpoints.

## Version separation

Local **v 0.002** remains in the original project folder and uses its local server on port 5173. This separate version has its own copied lookup code, UI, dependencies, and build configuration. Changes here do not change the local version.
