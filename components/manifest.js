// Create the <link rel="manifest"> tag dynamically
const manifestLink = document.createElement("link");
manifestLink.rel = "manifest";
document.head.appendChild(manifestLink);

// Get the base path dynamically
const basePath = (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/')).replace(/\/+$/, '/') ); // Remove trailing slash

// Define the manifest object dynamically
const manifest = {
  name: "Immer in Bewegung",
  short_name: "IIB",
  start_url: basePath + "/", // Ensure it's a proper relative path
  display: "standalone",
  background_color: "#6f757e",
  icons: [
    { src: `${basePath}/favicon.webp`, sizes: "64x64", type: "image/png" }, // Correct relative path
    { src: `${basePath}/img/frog_g_150.webp`, sizes: "150x150", type: "image/png" } // Correct relative path
  ]
};

// Convert the manifest object to a JSON Blob URL
const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
manifestLink.href = URL.createObjectURL(blob);
