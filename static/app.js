const map = L.map("map").setView([48.9226, 24.7111], 15);
// Основний шар - OpenStreetMap. Якщо плитки не завантажуються (403, блокування) -
// автоматично вмикаємо Esri (без API-ключа).
const osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors",
});
const esri = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 19, attribution: "Tiles &copy; Esri" });

osm.addTo(map);
let tileErrors = 0;
osm.on("tileerror", () => {
  if (++tileErrors >= 3 && map.hasLayer(osm)) {
    map.removeLayer(osm);
    esri.addTo(map);
  }
});
L.control.layers({ OpenStreetMap: osm, Esri: esri }).addTo(map);

const $ = (id) => document.getElementById(id);
const dlg = $("dlg"), form = $("form");
let places = [], markers = new Map(), activeId = null;
let editingId = null, picked = null, pickMarker = null;

async function api(url, method = "GET", body) {
  const res = await fetch(url, {
    method, headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.status === 204 ? null : res.json();
}

async function load() {
  places = await api("/api/places");
  render();
}

function visible() {
  const q = $("search").value.trim().toLowerCase();
  const cat = $("filter").value;
  return places.filter((p) =>
    (!cat || p.category === cat) &&
    (!q || (p.name + " " + p.description).toLowerCase().includes(q)));
}

function esc(s) {
  const d = document.createElement("div"); d.textContent = s; return d.innerHTML;
}

function render() {
  const items = visible();
  $("count").textContent = `${items.length} of ${places.length} places`;
  const list = $("list");
  list.innerHTML = items.length ? "" : '<li class="empty">No places found. Try another search or add one.</li>';
  markers.forEach((m) => m.remove()); markers.clear();

  items.forEach((p) => {
    const m = L.marker([p.lat, p.lng]).addTo(map).bindPopup(`<b>${esc(p.name)}</b><br>${esc(p.category)}`);
    m.on("click", () => select(p.id, false));
    markers.set(p.id, m);

    const li = document.createElement("li");
    li.dataset.id = p.id;
    if (p.id === activeId) li.classList.add("active");
    li.innerHTML = `<div class="head"><strong>${esc(p.name)}</strong><span class="badge">${esc(p.category)}</span></div>
      <p>${esc(p.description)}</p>
      <div class="actions"><button class="edit">Edit</button><button class="del">Delete</button></div>`;
    li.addEventListener("click", () => select(p.id, true));
    li.querySelector(".edit").addEventListener("click", (e) => { e.stopPropagation(); openForm(p); });
    li.querySelector(".del").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm(`Delete "${p.name}"?`)) return;
      await api(`/api/places/${p.id}`, "DELETE");
      if (activeId === p.id) activeId = null;
      load();
    });
    list.appendChild(li);
  });
}

function select(id, fly) {
  activeId = id;
  const p = places.find((x) => x.id === id);
  if (fly && p) map.flyTo([p.lat, p.lng], 17);
  markers.get(id)?.openPopup();
  document.querySelectorAll("#list li").forEach((li) =>
    li.classList.toggle("active", Number(li.dataset.id) === id));
}

/* ---- add / edit ---- */
function setPicked(latlng) {
  picked = latlng;
  if (pickMarker) pickMarker.setLatLng(latlng);
  else pickMarker = L.marker(latlng, { opacity: 0.6 }).addTo(map);
  $("coordHint").textContent = `Location: ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;
}

function clearPick() {
  if (pickMarker) { pickMarker.remove(); pickMarker = null; }
}

function openForm(place = null) {
  editingId = place ? place.id : null;
  $("dlgTitle").textContent = place ? "Edit place" : "Add place";
  form.reset();
  if (place) {
    form.name.value = place.name;
    form.category.value = place.category;
    form.description.value = place.description;
    setPicked(L.latLng(place.lat, place.lng));
  } else {
    picked = null;
    $("coordHint").textContent = "Click \"Pick on map\" to choose a location.";
  }
  dlg.showModal();
}

// "Pick on map": ховаємо форму, чекаємо клік по карті, повертаємо форму
$("pickBtn").addEventListener("click", () => {
  dlg.close();
  $("map").classList.add("picking");
  map.once("click", (ev) => {
    $("map").classList.remove("picking");
    setPicked(ev.latlng);
    dlg.showModal();
  });
});

$("addBtn").addEventListener("click", () => openForm());
$("cancel").addEventListener("click", () => { dlg.close(); clearPick(); });

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!picked) { alert("Choose a location first: click \"Pick on map\"."); return; }
  const body = {
    name: form.name.value, category: form.category.value,
    description: form.description.value, lat: picked.lat, lng: picked.lng,
  };
  try {
    if (editingId) await api(`/api/places/${editingId}`, "PUT", body);
    else await api("/api/places", "POST", body);
    dlg.close(); clearPick();
    load();
  } catch (err) { alert(err.message); }
});

$("search").addEventListener("input", render);
$("filter").addEventListener("change", render);
load();
