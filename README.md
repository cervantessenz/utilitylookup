# Property Utilities Lookup — v g0.002

This is the independent GitHub Pages version of local v 0.002. It runs entirely in the visitor's browser: no Node server, paid backend, API secret, or localhost connection is needed after publishing.

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
