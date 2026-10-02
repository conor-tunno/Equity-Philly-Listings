(function () {
  const config = window.LISTINGS_CONFIG || {};
  const colors = config.typeColors || {};

  // Spreadsheet column headers we recognize. Matching ignores case, spaces and
  // punctuation, so "Property Name", "property_name" and "PROPERTY NAME" all work.
  const FIELDS = {
    name: ["propertyname", "name", "property", "listingname", "title"],
    address: ["address", "streetaddress", "street"],
    city: ["city"],
    state: ["state"],
    zip: ["zip", "zipcode", "postalcode"],
    lat: ["latitude", "lat"],
    lng: ["longitude", "lng", "lon", "long"],
    type: ["propertytype", "type", "assettype"],
    status: ["status", "listingtype", "saleorlease", "forsaleforlease"],
    price: ["price", "askingprice", "rate", "rent", "leaserate"],
    size: ["sizesf", "size", "sf", "squarefeet", "sqft", "buildingsize"],
    description: ["description", "details", "notes"],
    image: ["imageurl", "image", "photo", "photourl", "picture"],
    link: ["brochureurl", "brochure", "link", "url", "listingurl", "flyer", "omurl"],
    broker: ["broker", "agent", "contact", "brokername"],
    phone: ["brokerphone", "phone"],
    email: ["brokeremail", "email"]
  };

  const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
  const safeUrl = (u) => /^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "";
  const colorFor = (type) => colors[type] || colors.default || "#475569";

  // ---------- Map ----------
  const map = L.map("map", { zoomControl: true }).setView(config.mapCenter || [39.9526, -75.1652], config.mapZoom || 12);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20
  }).addTo(map);
  const cluster = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 40 });
  map.addLayer(cluster);

  const pinIcon = (color) => L.divIcon({
    className: "pin-icon",
    html: `<div class="pin" style="background:${esc(color)}"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -26]
  });

  // ---------- Elements ----------
  const el = (id) => document.getElementById(id);
  const listEl = el("list");
  const searchEl = el("search");
  const typeEl = el("filter-type");
  const statusEl = el("filter-status");
  const sidebar = el("sidebar");

  if (config.companyName) {
    el("company-name").textContent = config.companyName + " Listings";
    document.title = config.companyName + " Listings";
  }
  el("toggle-list").addEventListener("click", () => sidebar.classList.toggle("open"));

  function showMessage(text) {
    const m = el("message");
    m.textContent = text;
    m.hidden = !text;
  }

  // ---------- Load spreadsheet ----------
  const source = config.sheetCsvUrl && config.sheetCsvUrl.trim() ? config.sheetCsvUrl.trim() : "sample-listings.csv";
  // Add a cache-buster so edits to the sheet show up on refresh.
  const url = source + (source.includes("?") ? "&" : "?") + "_=" + Date.now();

  Papa.parse(url, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: (results) => init(results.data, results.meta.fields || []),
    error: () => showMessage("Couldn't load the listings spreadsheet. Check the sheetCsvUrl in config.js.")
  });

  let listings = [];

  async function init(rows, headers) {
    // Map each recognized field to the actual column header in the sheet.
    const colFor = {};
    const used = new Set();
    for (const [field, aliases] of Object.entries(FIELDS)) {
      const header = headers.find((h) => aliases.includes(norm(h)) && !used.has(h));
      if (header) { colFor[field] = header; used.add(header); }
    }
    // Any other filled-in column is shown in the popup automatically.
    const extraCols = headers.filter((h) => h && !used.has(h));

    listings = rows.map((row, i) => {
      const get = (f) => (colFor[f] ? String(row[colFor[f]] ?? "").trim() : "");
      return {
        id: i,
        name: get("name") || get("address") || "Listing " + (i + 1),
        address: get("address"),
        city: get("city"),
        state: get("state"),
        zip: get("zip"),
        lat: parseFloat(get("lat")),
        lng: parseFloat(get("lng")),
        type: get("type"),
        status: get("status"),
        price: get("price"),
        size: get("size"),
        description: get("description"),
        image: safeUrl(get("image")),
        link: safeUrl(get("link")),
        broker: get("broker"),
        phone: get("phone"),
        email: get("email"),
        extras: extraCols.map((h) => [h, String(row[h] ?? "").trim()]).filter(([, v]) => v)
      };
    }).filter((l) => l.name || l.address);

    fillSelect(typeEl, listings.map((l) => l.type));
    fillSelect(statusEl, listings.map((l) => l.status));

    // Rows without coordinates get looked up from their address.
    const missing = listings.filter((l) => !hasCoords(l) && fullAddress(l));
    if (missing.length) await geocodeAll(missing);

    listings.forEach((l) => {
      if (!hasCoords(l)) return;
      l.marker = L.marker([l.lat, l.lng], { icon: pinIcon(colorFor(l.type)), title: l.name })
        .bindPopup(popupHtml(l), { maxWidth: 300, minWidth: 280 });
      l.marker.on("popupopen", () => highlight(l.id));
    });

    const unplaced = listings.filter((l) => !hasCoords(l)).length;
    if (unplaced) showMessage(`${unplaced} listing(s) couldn't be placed on the map — add Latitude/Longitude or check the address.`);

    render(true);
  }

  function fillSelect(select, values) {
    [...new Set(values.filter(Boolean))].sort().forEach((v) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      select.appendChild(o);
    });
  }

  const hasCoords = (l) => Number.isFinite(l.lat) && Number.isFinite(l.lng);
  const fullAddress = (l) => [l.address, l.city, [l.state, l.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  // ---------- Geocoding (free OpenStreetMap lookup, cached in the browser) ----------
  async function geocodeAll(items) {
    let cache = {};
    try { cache = JSON.parse(localStorage.getItem("geocache") || "{}"); } catch (e) { /* ignore */ }
    let fetched = 0;
    for (const l of items) {
      const q = fullAddress(l);
      if (cache[q]) { [l.lat, l.lng] = cache[q]; continue; }
      showMessage(`Locating addresses… (${++fetched})`);
      // Nominatim's usage policy allows ~1 request per second.
      if (fetched > 1) await new Promise((r) => setTimeout(r, 1100));
      try {
        const res = await fetch("https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q));
        const data = await res.json();
        if (data[0]) {
          l.lat = parseFloat(data[0].lat);
          l.lng = parseFloat(data[0].lon);
          cache[q] = [l.lat, l.lng];
        }
      } catch (e) { /* leave unplaced */ }
    }
    try { localStorage.setItem("geocache", JSON.stringify(cache)); } catch (e) { /* ignore */ }
    showMessage("");
  }

  // ---------- Popup ----------
  function popupHtml(l) {
    const details = [];
    if (l.price) details.push(["Price", l.price]);
    if (l.size) details.push(["Size", /sf|acre|ft/i.test(l.size) ? l.size : l.size + " SF"]);
    l.extras.forEach((e) => details.push(e));

    const tags = [];
    if (l.type) tags.push(`<span class="tag" style="background:${esc(colorFor(l.type))}">${esc(l.type)}</span>`);
    if (l.status) tags.push(`<span class="tag status">${esc(l.status)}</span>`);

    const contact = [];
    if (l.broker) contact.push(`<strong>${esc(l.broker)}</strong>`);
    if (l.phone) contact.push(`<a href="tel:${esc(l.phone.replace(/[^0-9+]/g, ""))}">${esc(l.phone)}</a>`);
    if (l.email) contact.push(`<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>`);

    return `<div class="popup">
      ${l.image ? `<img src="${esc(l.image)}" alt="" loading="lazy">` : ""}
      <div class="body">
        <h3>${esc(l.name)}</h3>
        ${fullAddress(l) && fullAddress(l) !== l.name ? `<div class="addr">${esc(fullAddress(l))}</div>` : ""}
        ${tags.length ? `<div class="tags">${tags.join("")}</div>` : ""}
        ${details.length ? `<dl>${details.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>` : ""}
        ${l.description ? `<p>${esc(l.description)}</p>` : ""}
        ${contact.length ? `<div class="broker">${contact.join("<br>")}</div>` : ""}
        ${l.link ? `<a class="btn" href="${esc(l.link)}" target="_blank" rel="noopener">View brochure</a>` : ""}
      </div>
    </div>`;
  }

  // ---------- List + filters ----------
  function visible() {
    const q = searchEl.value.trim().toLowerCase();
    return listings.filter((l) =>
      (!typeEl.value || l.type === typeEl.value) &&
      (!statusEl.value || l.status === statusEl.value) &&
      (!q || [l.name, fullAddress(l), l.description, l.broker].join(" ").toLowerCase().includes(q))
    );
  }

  function render(fit) {
    const shown = visible();
    cluster.clearLayers();
    cluster.addLayers(shown.filter((l) => l.marker).map((l) => l.marker));

    el("count").textContent = `${shown.length} of ${listings.length} listings`;
    listEl.innerHTML = shown.length ? "" : '<li class="empty">No listings match your filters.</li>';
    shown.forEach((l) => {
      const li = document.createElement("li");
      li.dataset.id = l.id;
      li.innerHTML = `<span class="dot" style="background:${esc(colorFor(l.type))}"></span>
        <div><div class="name">${esc(l.name)}</div>
        <div class="sub">${esc([l.type, l.status, l.price].filter(Boolean).join(" · "))}</div>
        <div class="sub">${esc(fullAddress(l))}</div></div>`;
      li.addEventListener("click", () => openListing(l));
      listEl.appendChild(li);
    });

    const pts = shown.filter(hasCoords).map((l) => [l.lat, l.lng]);
    if (fit && pts.length) map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
  }

  function openListing(l) {
    if (!l.marker) return;
    sidebar.classList.remove("open");
    cluster.zoomToShowLayer(l.marker, () => l.marker.openPopup());
  }

  function highlight(id) {
    listEl.querySelectorAll("li").forEach((li) => {
      const on = li.dataset.id === String(id);
      li.classList.toggle("active", on);
      if (on) li.scrollIntoView({ block: "nearest" });
    });
  }

  searchEl.addEventListener("input", () => render(false));
  typeEl.addEventListener("change", () => render(true));
  statusEl.addEventListener("change", () => render(true));
})();
