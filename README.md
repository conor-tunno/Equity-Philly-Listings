# Equity Philly Listings Map

An interactive map of the company's listings. Each listing appears as a pin colored
by property type. Clicking a pin (or a listing in the side list) opens a card with the
listing's details: photo, price, size, description, broker contact and brochure link.

All listing info comes from a **Google Sheet**. Edit the sheet and the website
updates; there's no code to touch.

## 1. Set up the spreadsheet

1. Create a Google Sheet. Make the first row the column headers below. Use
   `sample-listings.csv` as a starting point: in Sheets, use **File → Import → Upload**.
2. One row per listing.

| Column | Required? | Notes |
|---|---|---|
| Property Name | yes | Title shown on the card |
| Address, City, State, Zip | yes | Used to place the pin if Latitude/Longitude are blank |
| Latitude, Longitude | recommended | Most precise pin placement. In Google Maps, right-click a building and click the numbers to copy them |
| Property Type | optional | Office, Retail, Industrial, Multifamily, Land, Mixed-Use (sets the pin color) |
| Status | optional | e.g. For Sale / For Lease |
| Price | optional | Type it exactly as it should appear, e.g. `$1,850,000` or `$32.50/SF/yr` |
| Size (SF) | optional | |
| Description | optional | |
| Image URL | optional | A direct link to a photo (must start with `https://`) |
| Brochure URL | optional | Link to a flyer/OM; adds a "View brochure" button |
| Broker, Broker Phone, Broker Email | optional | |

You can rename or reorder columns freely. Matching ignores capitalization, and common
names like "Name", "Type" and "Asking Price" also work. **Any extra column you add**
(e.g. "Zoning", "Parking", "Year Built") automatically shows up on the listing card.

## 2. Connect the sheet to the site

1. In the Google Sheet: **File → Share → Publish to web**.
2. Choose the tab with your listings, pick **Comma-separated values (.csv)**, click **Publish**.
3. Copy the link and paste it into `config.js` as `sheetCsvUrl`.

> Publishing makes that tab readable by anyone with the link, so only put
> information there that's fine to show on a public website.

Google can take up to ~5 minutes to refresh the published copy after an edit.

## 3. Put the site online (free, via GitHub Pages)

1. In this GitHub repository, go to **Settings → Pages**.
2. Under "Build and deployment", set Source to **Deploy from a branch**, choose the
   branch (e.g. `main`) and the `/ (root)` folder, and save.
3. After a minute the site is live at
   `https://<your-github-username>.github.io/<repository-name>/`.

You can also embed the map in your company website with an iframe:

```html
<iframe src="https://<your-github-username>.github.io/<repository-name>/" width="100%" height="700" style="border:0"></iframe>
```

## Customizing

Everything adjustable is in `config.js`: company name, the spreadsheet link,
the starting map location and zoom, and the pin color for each property type.

## Previewing locally

Run `python3 -m http.server` in this folder, then open http://localhost:8000.
