/* IMMICH COVER PHOTOS ----------------------------------------------------------------------- */

async function check_immich_authorization() {
    const immichUrl = document.getElementById("immichUrl").textContent;
    try {
        const response = await fetch(immichUrl + "api/auth/status");
        document.getElementById("immich_authorization_status").classList.remove("red-text");
        document.getElementById("immich_authorization_status").classList.add("green-text");
        document.getElementById("immich_authorization_status_OK").style.display = "block";
        document.getElementById("immich_authorization_status_OK_buttons").style.display = "block";
        console.log("Immich Auth OK");
        return response.status === 200;
    } catch (err) {
        document.getElementById("immich_authorization_status_NOT_OK").style.display = "block";
        console.log("Immich Auth NOT OK");
        return false;
    }
}


async function get_cover_album_list(immichUrl, immichCoverAlbumId) {
    const response = await fetch(immichUrl + "api/albums/" + immichCoverAlbumId);

    if (!response.ok) {
        throw new Error("Failed to fetch album: " + response.status + " " + response.statusText);
    }

    return response.json();

}


async function add_photo_to_album(immichUrl, immichCoverAlbumId, assetIds) {
    const response = await fetch(immichUrl + "api/albums/" + immichCoverAlbumId + "/assets", {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            ids: assetIds
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
            "Failed to add assets to album: " +
            response.status + " " +
            response.statusText + " - " +
            errorText
        );
    }

    return response.json();
}

async function searchByOriginalPath(immichUrl, originalPath) {
    if (!originalPath?.trim()) return null;

    const response = await fetch(new URL("/api/search/metadata", immichUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            originalPath: originalPath.normalize("NFC")
        })
    });

    return response.json();
}


async function searchMissingCoverPhotos(immichUrl, missingCoverPhotos) {
    const results = [];

    for (const item of missingCoverPhotos) {
        const originalPath = item.CoverPhoto;

        try {
            const searchResult = await searchByOriginalPath(
                immichUrl,
                originalPath
            );

            const assetId = searchResult?.assets?.items?.[0]?.id;
            if (assetId) {
                results.push({
                    coverPhoto: originalPath,
                    outerId: item.OuterId,
                    assetId
                });
            }
        } catch (err) {
            console.error(err);
        }
    }

    return results;
}


// RUN THIS TO SYNC THE IMMICH ALBUM
async function sync_album_covers(immichUrl, immichCoverAlbumId) {

    const cover_albums_db_text =
    document.getElementById("coverPhotoOriginalPaths").textContent;

    const cover_albums_db = JSON.parse(cover_albums_db_text);

    const cover_albums_response = await get_cover_album_list(
        immichUrl,
        immichCoverAlbumId
    );

    const existingOriginalPaths = new Set(
        cover_albums_response.assets.map(a => a.originalPath)
    );

    // Filter CoverPhoto entries that do NOT exist in the album assets
    const missingCoverPhotos = cover_albums_db.filter(item => {
        return !existingOriginalPaths.has(item.CoverPhoto);
    });

    console.log("Missing cover photos:", missingCoverPhotos);
    document.getElementById('count_missing_photos').textContent = missingCoverPhotos.length;

    const searchResults = await searchMissingCoverPhotos(
        immichUrl,
        missingCoverPhotos
    );

    const assetIds = searchResults.map(r => r.assetId).filter(id => id != null);

    const addPhotos = await add_photo_to_album(immichUrl, immichCoverAlbumId, assetIds);

}

// RUN THIS TO SAVE IMMICH ALBUM TO OPFS
async function save_album_covers_ids2OPFS(immichUrl, immichCoverAlbumId) {

    const cover_albums_db_text =
    document.getElementById("coverPhotoOriginalPaths").textContent;

    const cover_albums_db = JSON.parse(cover_albums_db_text);

    const cover_albums_response = await get_cover_album_list(
        immichUrl,
        immichCoverAlbumId
    );

    const outerIdToAssetId = Object.fromEntries(
        cover_albums_db
        .map(dbItem => {
            const asset = cover_albums_response.assets.find(
                a => a.originalPath === dbItem.CoverPhoto
            );
            return asset ? [dbItem.OuterId, asset.id] : null;
        })
        .filter(Boolean)
    );

    await (await (await navigator.storage.getDirectory())
    .getFileHandle("cover_photos.json", { create: true }))
    .createWritable()
    .then(w => (w.write(JSON.stringify(outerIdToAssetId, null, 2)), w.close())).then(() => {
        document.getElementById("cover2opfs").textContent = "OK";
    }).then(()=>{location.reload()});


}

/* IMMICH ALBUMS ----------------------------------------------------------------------- */
async function get_album_id_from_name(immichUrl, albumName) {
    const response = await fetch(immichUrl + "api/albums");

    if (!response.ok) {
        throw new Error("Failed to fetch albums: " + response.status + " " + response.statusText);
    }

    const albums = await response.json();

    const album = albums.find(a => a.albumName === albumName);

    if (!album) {
        alert("No album with that name found");
        return null;
    }

    return album.id;
}

async function process_album_string(immichUrl, input) {
    const regex = /\[([^\]]+)\]\(([\s\S]*?)\)/g; // allow multiline $2

    const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    let match;
    while ((match = regex.exec(input)) !== null) {
        const albumName = match[1]; // $1
        const filesPart = match[2]; // $2 (multiline)

        // Resolve album ID
        const immichAlbumId = await get_album_id_from_name(immichUrl, albumName);
        if (!immichAlbumId) {
            continue; // alert already shown
        }

        // Split + dedupe file paths
        const filenames = Array.from(
            new Set(
                filesPart
                .trim()
                .split(/\s+/)
                .filter(Boolean)
            )
        );

        const assetIds = [];

        for (const filename of filenames) {
            try {
                const result = await searchByOriginalPath(immichUrl, filename);

                if (result.assets?.total === 0) {
                    console.warn("No asset found for path:", filename);
                    continue;
                }

                // Normalize possible return shapes from searchByOriginalPath
                let assetId = null;

                if (typeof result === "string") {
                    assetId = result;
                }
                else if (Array.isArray(result) && result.length > 0) {
                    assetId = result[0]?.id ?? result[0];
                }
                else if (result && typeof result === "object") {
                    // Immich search response shape
                    if (result.assets?.items?.length > 0) {
                        assetId = result.assets.items[0].id;
                    }
                    // Fallback: generic object with id
                    else if (result.id) {
                        assetId = result.id;
                    }
                }

                if (!assetId || !UUID_REGEX.test(assetId)) {
                    console.warn(
                        "Rejected non-UUID assetId for path:",
                        filename,
                        "→",
                        result
                    );
                    continue;
                }

                assetIds.push(assetId);

            } catch (err) {
                console.error("Failed to resolve asset for:", filename, err);
            }
        }

        if (assetIds.length === 0) {
            console.warn("No valid assets found for album:", albumName);
            continue;
        }

        // Add assets to album
        await add_photo_to_album(immichUrl, immichAlbumId, assetIds);
    }
}
