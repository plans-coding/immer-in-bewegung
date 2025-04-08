// Create the <link rel="manifest"> tag dynamically
const manifestLink = document.createElement("link");
manifestLink.rel = "manifest";
document.head.appendChild(manifestLink);

// Get the base path dynamically
const basePath = (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/')).replace(/\/+$/, '/');

// Define the manifest object dynamically
const manifest = {
  name: "Immer in Bewegung",
  short_name: "IIB",
  start_url: basePath, // Ensure it's a proper relative path
  display: "standalone",
  background_color: "#1d655e",
  theme_color: "#6f757e",
  "icons": [
    {
      "src": basePath + "img/frog.svg",
      "sizes": "any",
      "type": "image/svg+xml"
    }
  ]
};

// Convert the manifest object to a JSON Blob URL
const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
manifestLink.href = URL.createObjectURL(blob);
