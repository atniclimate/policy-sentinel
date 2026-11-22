export function cfrArchive(year, title) {
  const path = `CFR/${year}/title-${title}`;
  const name = `CFR-${year}-title-${title}.zip`;
  return {
    name,
    listingUrl: `https://www.govinfo.gov/bulkdata/json/${path}`,
    zipUrl: `https://www.govinfo.gov/bulkdata/${path}/${name}`,
  };
}

export function listsCfrArchive(listing, archive) {
  return (
    Array.isArray(listing?.files) &&
    listing.files.some(
      (file) =>
        file?.justFileName === archive.name && file.link === archive.zipUrl,
    )
  );
}
