# Public boundary reference sources review (terms and format only)

Accessed: 2026-09-15

Implementation state: review only; no download, no source registry entry, no
adapter, no geometry in Git, no private root created. Zero product-runner
requests were issued; the lead opened five official landing pages.

External authorization: none requested or granted. Under decision D-010 and
gate `G-G`, any boundary or parcel data download is a separate owner
decision, lands only in an owner-owned private root outside Git, is served
only through the existing explicit `127.0.0.1` local profile, and never
enters `dist/` or a public artifact. This review records terms and formats so
that decision can be made exactly.

## Sources observed

| Source | Landing URL observed | Format and access | Terms observed | Notes |
| --- | --- | --- | --- | --- |
| U.S. Census Bureau TIGER/Line Shapefiles | `https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html` | Shapefile (2007 to present) downloads; latest vintage 2025 released 2025-09-23 with legal boundaries as of 2025-01-01 | No terms or public-domain statement on the landing page; not located | The American Indian/Alaska Native/Native Hawaiian Areas layer was not confirmed on the landing page itself; its technical documentation must be reviewed before any reliance. Census boundaries are statistical or legal representations for census purposes, not land-status determinations |
| Bureau of Indian Affairs Branch of Geospatial Support | `https://www.bia.gov/bia/ots/dris/bogs` | BIA Open GIS Data portal on ArcGIS Hub, web maps and downloadable datasets at `biamaps.geoplatform.gov`; a "BIA Tract Viewer" displays Tribal, allotted and jointly managed tracts and parcels | No legal-boundary disclaimer located on the landing page | Tract and parcel views are exactly the content the public build excludes; any use is private-root only. The page lists an office mailbox and phone, not carried |
| Clallam County Public GIS Portal | Linked from `https://www.clallamcountywa.gov/1043/GIS-Mapping` as `https://clallam-county-portal-clallam.hub.arcgis.com/` plus a parcel and address search | ArcGIS Hub portal; formats not reviewed | County privacy and copyright notices linked, not reviewed | Parcel search exposes ownership-adjacent data that the public build excludes |
| Jefferson County GIS | `https://www.co.jefferson.wa.us/293/GIS` referenced from county pages | Not reviewed beyond the reference | Not located | The lead's fetch landed on a commissioners page; the GIS page itself was not opened |
| Washington Department of Natural Resources GIS | `https://www.dnr.wa.gov/programs-and-services/geology/publications-and-data/gis-data-and-databases` and agency-wide `data-wadnr.opendata.arcgis.com` | ESRI file geodatabases and REST services; the geology page states shapefiles are not offered | No terms statement located on the page | Geology and hazard layers, not boundaries; the agency-wide portal was not reviewed |

## What a later private-root decision would need

- Per-source terms and attribution confirmed on the originating site.
- Exact dataset identity, vintage and digest recorded at download time,
  matching the `LandBoundary 1.0.0` contract's `geometryRef.objectDigest`.
- Sensitivity classification: any Tribally supplied or reservation-related
  boundary is at least `restricted`; a county or Census reference layer is
  at least `internal`, because the `LandBoundary` contract has no `public`
  class at all: every boundary reference lives only in the private root and
  the contract permits no inline geometry.
- A build-time conversion step for shapefile or GeoJSON bundles, which this
  session documented as a follow-on and did not implement.

## Priority and status

Reviewed, not admitted; conclusion `gap` for terms. Priority: reference only.
Gates: `G-G` (private material) and `EXT-PRIVATE`; D-010 unchanged. No
download is authorized by this review.
