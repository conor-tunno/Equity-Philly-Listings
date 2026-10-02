// ============================================================
//  SITE SETTINGS — this is the only file you need to edit.
// ============================================================
window.LISTINGS_CONFIG = {
  // Company name shown in the header.
  companyName: "Equity Philly",

  // Link to your Google Sheet published as CSV.
  //   In Google Sheets: File > Share > Publish to web >
  //   pick the listings tab > "Comma-separated values (.csv)" > Publish,
  //   then paste the link it gives you between the quotes below.
  // Leave it empty ("") to show the sample listings in sample-listings.csv.
  sheetCsvUrl: "",

  // Where the map starts before the pins load (Philadelphia).
  mapCenter: [39.9526, -75.1652],
  mapZoom: 12,

  // Pin color for each property type. Types not listed get "default".
  typeColors: {
    "Office": "#2563eb",
    "Retail": "#db2777",
    "Industrial": "#d97706",
    "Multifamily": "#059669",
    "Land": "#65a30d",
    "Mixed-Use": "#7c3aed",
    "default": "#475569"
  }
};
