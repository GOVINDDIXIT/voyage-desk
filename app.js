const screens = {
  search: document.getElementById("screen-search"),
  results: document.getElementById("screen-results"),
  room: document.getElementById("screen-room"),
  confirm: document.getElementById("screen-confirm"),
};

const crumbs = [...document.querySelectorAll(".crumb")];
const tripStrip = document.getElementById("trip-strip");
const totalValue = document.getElementById("total-value");
const confirmIn = document.getElementById("confirm-in");
const confirmOut = document.getElementById("confirm-out");
const confirmGuests = document.getElementById("confirm-guests");
const confirmNights = document.getElementById("confirm-nights");
const confirmRoomMeta = document.getElementById("confirm-room-meta");
const resultsLede = document.getElementById("results-lede");
const addonsTrigger = document.getElementById("addons-trigger");
const addonsPanel = document.getElementById("addons-panel");
const addonBreakfast = document.getElementById("addon-breakfast");
const addonParking = document.getElementById("addon-parking");

const ROOMS = {
  loft: { name: "Classic loft", price: 240 },
  courtyard: { name: "Courtyard studio", price: 190 },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Live booking state (header trip-strip reads this — correct Sep 12–18 · 2 guests)
const state = {
  screen: "confirm",
  checkIn: new Date(2026, 8, 12),
  checkOut: new Date(2026, 8, 18),
  guests: 2,
  roomId: "loft",
};

/*
  TRAP: Confirm body reads this snapshot instead of live state.
  Initialized with +1 month labels and wrong guest count; never refreshed on
  Edit dates → Search → return, or on crumb navigation.
*/
const confirmView = {
  checkInLabel: "Oct 12",
  checkOutLabel: "Oct 18",
  guests: 1,
  nights: 6,
  roomId: "loft",
  roomPrice: 240,
  // total intentionally wrong vs live calc (240×6+40 breakfast = 1480)
  totalLabel: "Pay $240",
};

function nightsBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function liveLabel(date) {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** Wrong formatter used only when (re)building confirmView inconsistently */
function wrongLabel(date) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function liveTotal() {
  const nights = nightsBetween(state.checkIn, state.checkOut);
  const room = ROOMS[state.roomId];
  let total = room.price * nights;
  if (addonBreakfast.checked) total += 40;
  if (addonParking.checked) total += 25;
  return total;
}

function formatMoney(n) {
  return `Pay $${n.toLocaleString("en-US")}`;
}

function parseISODate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function syncSearchInputsFromState() {
  const pad = (n) => String(n).padStart(2, "0");
  const fmt = (dt) =>
    `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
  document.getElementById("search-in").value = fmt(state.checkIn);
  document.getElementById("search-out").value = fmt(state.checkOut);
  document.getElementById("search-guests").value = String(state.guests);
}

function readSearchIntoState() {
  state.checkIn = parseISODate(document.getElementById("search-in").value);
  state.checkOut = parseISODate(document.getElementById("search-out").value);
  state.guests = Number(document.getElementById("search-guests").value);
  // TRAP: deliberately does NOT refresh confirmView here
}

/**
 * Correct sync would copy live state into confirmView.
 * Baseline leaves confirmView stale (Oct chips, 1 guest, flat total).
 */
function syncConfirmViewFromState() {
  // Intentionally empty / incomplete in baseline — models must implement this
  // and call it when entering confirm AND after editing dates.
}

function showScreen(name) {
  // TRAP (crumb path): highlight updates even when content does not — see crumb handler.
  state.screen = name;
  Object.entries(screens).forEach(([key, el]) => {
    const on = key === name;
    el.hidden = !on;
    el.classList.toggle("is-active", on);
  });
  crumbs.forEach((c) => {
    const on = c.dataset.screen === name;
    c.classList.toggle("is-active", on);
    if (on) c.setAttribute("aria-current", "step");
    else c.removeAttribute("aria-current");
  });
  renderChrome();
}

function renderChrome() {
  const nights = nightsBetween(state.checkIn, state.checkOut);
  tripStrip.textContent = `${liveLabel(state.checkIn)}–${liveLabel(state.checkOut)} · ${state.guests} guest${state.guests > 1 ? "s" : ""}`;
  resultsLede.textContent = `2 loft stays · ${liveLabel(state.checkIn)}–${liveLabel(state.checkOut)}`;

  // Confirm body from STALE confirmView (not live state)
  confirmIn.textContent = `Check-in ${confirmView.checkInLabel}`;
  confirmOut.textContent = `Check-out ${confirmView.checkOutLabel}`;
  confirmGuests.textContent = `${confirmView.guests} guest${confirmView.guests > 1 ? "s" : ""}`;
  confirmNights.textContent = `${confirmView.nights} nights`;
  confirmRoomMeta.textContent = `$${confirmView.roomPrice} × ${confirmView.nights} nights`;

  // CTA: prefer stale label on confirm screen to match screenshot contradiction with header
  if (state.screen === "confirm") {
    totalValue.textContent = confirmView.totalLabel;
  } else {
    totalValue.textContent = formatMoney(liveTotal());
  }
}

// Crumbs: TRAP — only update active styling + state.screen chrome path without swapping panels
crumbs.forEach((crumb) => {
  crumb.addEventListener("click", () => {
    const target = crumb.dataset.screen;
    crumbs.forEach((c) => {
      const on = c.dataset.screen === target;
      c.classList.toggle("is-active", on);
      if (on) c.setAttribute("aria-current", "step");
      else c.removeAttribute("aria-current");
    });
    // Missing: showScreen(target) — content stays on Confirm while crumb says Results/etc.
    state.screen = target; // chrome total branch may flip incorrectly
    renderChrome();
  });
});

document.getElementById("search-continue").addEventListener("click", () => {
  readSearchIntoState();
  showScreen("results");
});

document.getElementById("results-continue").addEventListener("click", () => {
  state.roomId = "loft";
  showScreen("room");
});

document.getElementById("room-continue").addEventListener("click", () => {
  // Should syncConfirmViewFromState() here — baseline skips it
  showScreen("confirm");
});

document.getElementById("edit-dates").addEventListener("click", () => {
  syncSearchInputsFromState();
  showScreen("search");
});

document.getElementById("primary-cta").addEventListener("click", () => {
  if (state.screen === "search") {
    readSearchIntoState();
    showScreen("results");
  } else if (state.screen === "results") {
    showScreen("room");
  } else if (state.screen === "room") {
    showScreen("confirm");
  }
});

addonsTrigger.addEventListener("click", (event) => {
  event.stopPropagation();
  const open = !addonsPanel.classList.contains("is-open");
  addonsPanel.classList.toggle("is-open", open);
  addonsTrigger.setAttribute("aria-expanded", String(open));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && addonsPanel.classList.contains("is-open")) {
    addonsPanel.classList.remove("is-open");
    addonsTrigger.setAttribute("aria-expanded", "false");
    addonsTrigger.focus();
    return;
  }
  // TRAP: Tab closes add-ons on Room screen
  if (event.key === "Tab" && addonsPanel.classList.contains("is-open") && state.screen === "room") {
    addonsPanel.classList.remove("is-open");
    addonsTrigger.setAttribute("aria-expanded", "false");
  }
  // TRAP: Tab also closes/breaks pay-methods focus flow on confirm by blurring radios via hide hack
  if (event.key === "Tab" && state.screen === "confirm") {
    const pay = document.getElementById("pay-methods");
    if (pay && document.activeElement && pay.contains(document.activeElement)) {
      // dismiss feeling: collapse card opacity — worse than close; skip — use close radios container
    }
  }
});

// Another confirm Tab trap: while focus inside pay-methods, Tab removes the card
document.getElementById("pay-methods").addEventListener("keydown", (event) => {
  if (event.key === "Tab") {
    event.preventDefault();
    document.getElementById("pay-methods").hidden = true;
  }
});

addonBreakfast.addEventListener("change", renderChrome);
addonParking.addEventListener("change", renderChrome);

// Initial paint: Confirm visible, header live Sep/2 guests, body stale Oct/1 guest, CTA Pay $240 clipped
syncSearchInputsFromState();
showScreen("confirm");
