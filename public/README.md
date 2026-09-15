# Public assets

Everything in this directory is copied to the root of the production bundle by Vite. Use it for files that must keep a stable public URL or must be served without passing through the JavaScript module graph.

## Maintained files

| Path | Purpose | Update rule |
| --- | --- | --- |
| `LLMs.json` | Plan-grouped model catalog consumed by the frontend at runtime. | Keep IDs aligned with the backend and provider logo filenames. |
| `legal/privacy.md` | Privacy policy rendered by the legal page. | Treat as controlled legal copy. |
| `legal/tos.md` | Terms of service rendered by the legal page. | Treat as controlled legal copy. |
| `provider-logos/` | Artwork used by the model catalog. | Prefer compact SVG assets and stable filenames. |
| `auth.md` | Machine-readable registration and authentication guidance. | Run `npm run validate:auth-md` after editing. |
| `.well-known/api-catalog` | API discovery linkset. | Run `npm run validate:api-catalog` after editing. |
| `robots.txt` | Crawler policy and discovery links. | Review whenever public routes or indexing policy change. |
| `sitemap.xml` | Canonical public page URLs. | Generate it; do not maintain it by hand. |
| `manifest.json`, `favicon.ico`, `logo.svg` | Browser and brand metadata. | Keep manifest paths rooted in this directory. |

## Sitemap workflow

Public routes are declared in `../src/public/publicPageRoutes.jsx`. Regenerate the sitemap after adding, removing, or renaming a public route:

```bash
npm run generate:sitemap
```

The generator accepts only canonical static routes. Parameterized or wildcard routes intentionally fail validation. `npm run build` also regenerates the sitemap through the `prebuild` hook.

## Safety notes

- Every file here is publicly retrievable after deployment. Do not add secrets, private source material, or environment-specific credentials.
- Vite serves these files from `/`, so code should reference `logo.svg` as `/logo.svg`, not `/public/logo.svg`.
- Keep legal and discovery URLs consistent with the production origins used by CAI.
