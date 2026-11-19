/* Dorm Dash — single-page app
   Everything is stored in localStorage so the box, plan, and dasher progress survive a refresh. */

(() => {
  "use strict";

  // ---------------- State ----------------
  const KEY = "dormdash:v1";
  const defaults = () => ({
    box: {},
    plan: "weekly",
    editing: false,
    delivery: { method: "dash", payment: "account", name: "", email: "", hall: "", room: "", slot: "sun" },
    subscription: null,
    orders: [],
    dasher: null,
    lastOrderId: null,
    user: null,
  });
  let state;
  try { state = Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
  catch { state = defaults(); }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  // Drop any meals saved from an older version of the menu
  const knownIds = new Set(MEALS.map((m) => m.id));
  const cleanItems = (items) => Object.fromEntries(Object.entries(items || {}).filter(([id]) => knownIds.has(id)));
  state.box = cleanItems(state.box);
  if (state.subscription) {
    state.subscription.items = cleanItems(state.subscription.items);
    if (!Object.keys(state.subscription.items).length) state.subscription = null;
  }
  state.orders = (state.orders || []).map((o) => ({ ...o, items: cleanItems(o.items) }));
  save();

  const ui = { category: "all", diet: new Set(), sort: "popular", redirect: "" };

  // Prototype login: one test account, checked in the browser only (no real authentication).
  const TEST_ACCOUNT = { studentId: "D000000000", passwords: ["password", "pasword"] };
  const PROTECTED = ["plan", "dash"];

  // ---------------- Helpers ----------------
  const $ = (s, el = document) => el.querySelector(s);
  const money = (n) => "$" + n.toFixed(2);
  const mealById = (id) => MEALS.find((m) => m.id === id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const countOf = (items) => Object.values(items).reduce((a, b) => a + b, 0);
  const totalOf = (items) => Object.entries(items).reduce((s, [id, q]) => s + (mealById(id)?.price || 0) * q, 0);
  const boxCount = () => countOf(state.box);
  const fmtDate = (d, opts = { weekday: "short", month: "short", day: "numeric" }) => d.toLocaleDateString("en-US", opts);

  // Next delivery: Sunday evening or Monday morning. Orders close Friday 11:59pm.
  const WINDOWS = {
    dash: { sun: "5–9 PM", mon: "7–10 AM" },
    pickup: { sun: "12–8 PM", mon: "8 AM–6 PM" },
  };
  const PAYMENTS = {
    account: { label: "Charge to student account", short: "Student account", note: "Added to your Utah Tech student account bill." },
    bison: { label: "Use Bison Bucks", short: "Bison Bucks", note: "Paid from your Bison Bucks balance." },
    card: { label: "Pay with card", short: "Card", note: "Debit or credit card." },
  };
  const payLabel = (x) => (x?.payment === "card" ? `Card •••• ${x.cardLast4 || ""}` : PAYMENTS[x?.payment || "account"].short);
  const paidWith = (o) => o.payment === "bison" ? "Paid with Bison Bucks" : o.payment === "card" ? `Charged to card ending ${o.cardLast4}` : "Charged to your student account";
  // Card details live in memory only (never saved to the browser), and only the last 4 digits are kept on the order.
  const card = { number: "", exp: "", cvc: "", zip: "" };
  const digits = (v) => (v || "").replace(/\D/g, "");
  const luhn = (num) => { let sum = 0; [...num].reverse().forEach((c, i) => { let n = +c; if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }); return sum % 10 === 0; };
  const fmtCard = (v) => digits(v).slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const fmtExp = (v) => { const d = digits(v).slice(0, 4); return d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d; };
  const isPickup = (x) => (x?.method || "dash") === "pickup";
  const windowLabel = (method, slot) => `${slot === "mon" ? "Monday" : "Sunday"} ${WINDOWS[method || "dash"][slot || "sun"]}`;

  function nextDrop(slot = "sun", method = "dash") {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let add = (7 - d.getDay()) % 7 || 7;          // days to next Sunday
    if (d.getDay() === 6) add += 7;                 // Saturday: this week's cutoff has passed
    const sunday = new Date(d); sunday.setDate(d.getDate() + add);
    const drop = new Date(sunday); if (slot === "mon") drop.setDate(sunday.getDate() + 1);
    const cutoff = new Date(sunday); cutoff.setDate(sunday.getDate() - 2);
    return { drop, cutoff, window: WINDOWS[method || "dash"][slot === "mon" ? "mon" : "sun"] };
  }

  function imgTag(meal, cls = "") {
    return `<div class="img ${cls}" data-label="${esc(meal.name)}">
      <img src="${meal.img}" alt="${esc(meal.name)}" loading="lazy" onerror="this.parentElement.classList.add('fallback')">
    </div>`;
  }

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("show"), 2400);
  }

  function updateBoxCount(bump) {
    const el = $("#boxCount");
    el.textContent = boxCount();
    if (bump) { el.classList.add("bump"); setTimeout(() => el.classList.remove("bump"), 200); }
  }

  function setQty(id, qty) {
    const current = state.box[id] || 0;
    const delta = qty - current;
    if (delta > 0 && boxCount() + delta > MAX_MEALS) {
      toast(`Your box holds up to ${MAX_MEALS} meals a week.`);
      return false;
    }
    if (qty <= 0) delete state.box[id]; else state.box[id] = qty;
    save();
    updateBoxCount(true);
    return true;
  }

  // ---------------- Shared components ----------------
  function tagBadges(meal) {
    return meal.tags.map((t) => `<span class="badge ${t === "Vegetarian" ? "veg" : t === "High protein" ? "pro" : ""}">${t}</span>`).join("");
  }

  function qtyControl(meal) {
    const q = state.box[meal.id] || 0;
    if (!q) return `<button class="add-btn" data-action="inc" data-id="${meal.id}" aria-label="Add ${esc(meal.name)} to box">+</button>`;
    return `<div class="stepper" aria-label="Quantity of ${esc(meal.name)}">
      <button data-action="dec" data-id="${meal.id}" aria-label="Remove one">−</button>
      <span>${q}</span>
      <button class="plus" data-action="inc" data-id="${meal.id}" aria-label="Add one">+</button>
    </div>`;
  }

  function methodLabel(meal) {
    return METHODS[meal.method].label;
  }
  const prepLabel = (meal) => (meal.minutes ? `${meal.minutes} min prep` : "Ready to eat");
  const categoryLabel = (meal) => CATEGORIES[meal.category];
  const STORAGE_TEXT = {
    fridge: (m) => `Keep in the fridge. Best within ${m.keepsDays} days.`,
    freezer: () => "Keep in the freezer. Good for 30 days.",
    pantry: (m) => `No fridge needed. Keep on your shelf${m.keepsDays >= 30 ? "." : `, best within ${m.keepsDays} days.`}`,
  };

  function mealCard(meal) {
    return `<article class="meal-card" data-meal="${meal.id}">
      <div style="position:relative" data-action="open-meal" data-id="${meal.id}">
        <div class="badges">${tagBadges(meal)}</div>
        ${imgTag(meal)}
      </div>
      <div class="meal-body">
        <div class="meal-top">
          <div>
            <div class="meal-meta">${categoryLabel(meal)} · ${prepLabel(meal)}</div>
            <h3 class="meal-name" data-action="open-meal" data-id="${meal.id}">${esc(meal.name)}</h3>
          </div>
          <div class="meal-price">${money(meal.price)}</div>
        </div>
        <p class="meal-desc">${esc(meal.desc)}</p>
        <div class="meal-foot">
          <span class="info">${methodLabel(meal)} · ${meal.nutrition.protein}g protein</span>
          <span class="qty-slot" data-id="${meal.id}">${qtyControl(meal)}</span>
        </div>
      </div>
    </article>`;
  }

  function refreshQtySlots() {
    document.querySelectorAll(".qty-slot").forEach((slot) => {
      slot.innerHTML = qtyControl(mealById(slot.dataset.id));
    });
    renderBoxBar();
  }

  function boxBarHTML() {
    const n = boxCount();
    return `<div class="box-bar ${n ? "show" : ""}" id="boxBar">
      <div class="meter">
        <strong>${n} of ${MAX_MEALS} meals · ${money(totalOf(state.box))}</strong>
        <small>${n ? `Avg ${money(totalOf(state.box) / n)} per meal · free dorm delivery` : "Add meals to start your box"}</small>
        <div class="track"><div class="fill" style="width:${(n / MAX_MEALS) * 100}%"></div></div>
      </div>
      <a href="#/box" class="btn btn-primary btn-sm">${state.editing ? "Review changes" : "Review box"} →</a>
    </div>`;
  }
  function renderBoxBar() {
    const bar = $("#boxBar");
    if (bar) bar.outerHTML = boxBarHTML();
  }

  function stepPhoto(id, alt) {
    return `<div class="img step-img" data-label="${esc(alt)}">
      <img src="https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=800" alt="${esc(alt)}" loading="lazy" onerror="this.parentElement.classList.add('fallback')">
    </div>`;
  }

  // ---------------- Views ----------------
  function viewHome() {
    const hero = mealById("chicken-rice-bowl");
    const list = ["overnight-oats", "chicken-wrap", "caesar-salad", "chicken-rice-bowl", "fajita-bowl", "apple-pb"].map(mealById);
    const { drop, cutoff } = nextDrop();
    return `
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <span class="sticker">CAMPUS FUEL, UPGRADED</span>
          <h1 class="display">Eat well.<span class="accent">Dash less.</span></h1>
          <p class="hero-sub">Healthy breakfast, lunch, dinner and snack kits from $3, made for tiny fridges, busy schedules, and zero grocery runs. Pick up to 14. We deliver the week.</p>
          <div class="hero-ctas">
            <a href="#/menu" class="btn btn-primary">Build my box →</a>
            <a href="#/how" class="btn btn-ghost">See how it works</a>
          </div>
          <div class="checks"><span>No subscription lock-in</span><span>Nutrition-forward</span><span>Student delivered</span></div>
        </div>
        <div class="hero-art">
          <div class="blob lime"></div><div class="blob sky"></div>
          <div class="hero-card" data-action="open-meal" data-id="${hero.id}" style="cursor:pointer">
            ${imgTag(hero)}
            <span class="pill">${hero.minutes} min prep</span>
            <div class="label">
              <div><small>This week's favorite</small><strong>${hero.name}</strong></div>
              <span class="price">${money(hero.price)}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="band-dark" id="how">
      <div class="wrap">
        <p class="eyebrow">How it works</p>
        <h2>Your week of food, sorted by Sunday.</h2>
        <div class="steps">
          <div class="step">
            ${stepPhoto("4008586", "Hands using a phone to order food")}
            <div class="num">01</div>
            <h3>Pick your meals</h3>
            <p>Choose up to 14 breakfast, lunch, dinner and snack kits in the app. No stove or oven needed. Order by Friday night.</p>
            <a href="#/menu" class="btn btn-primary btn-sm" style="margin-top:18px">Plan my meals →</a>
          </div>
          <div class="step">
            <div class="img step-img sticker-img" data-label="Dorm Dash box sticker">
              <img src="images/box-sticker.png" alt="The Dorm Dash sticker that goes on every box" loading="lazy" onerror="this.parentElement.classList.add('fallback')">
            </div>
            <div class="num">02</div>
            <h3>It arrives packed</h3>
            <p>Every kit comes pre-portioned in sealed, labeled bags inside a box with the Dorm Dash sticker on it, ready to drop straight into your mini fridge.</p>
          </div>
          <div class="step">
            ${stepPhoto("4604599", "Student courier biking with a delivery bag")}
            <div class="num">03</div>
            <h3>Pick it up or get it dashed</h3>
            <p>Grab your box yourself at the campus store, or have a verified student dasher bring it right to your dorm at the start of the week. Both are free.</p>
          </div>
          <div class="step">
            ${stepPhoto("5749087", "Student heating a meal in the microwave")}
            <div class="num">04</div>
            <h3>Make it yourself, easily</h3>
            <p>Each bag has a simple step card on the back. Every kit is no-cook or microwave-only, and ready in 10 minutes or less.</p>
          </div>
        </div>
        <p style="margin-top:48px;color:rgba(255,255,255,.75);font-weight:600">Next drop: <strong style="color:#fff">${fmtDate(drop, { weekday: "long", month: "long", day: "numeric" })}</strong> · order by ${fmtDate(cutoff, { weekday: "long" })} 11:59 PM</p>
      </div>
    </section>

    <section class="section">
      <div class="wrap">
        <div class="section-head">
          <div><p class="eyebrow">This week's drop</p><h2 class="display">Good food. Tiny price.</h2></div>
          <p>Pre-portioned, nutrient-dense, and made for dorm rooms. Meals start at $3, and every kit is under $6.</p>
        </div>
        <div class="meal-grid">${list.map(mealCard).join("")}</div>
        <div style="text-align:center;margin-top:48px"><a href="#/menu" class="btn btn-dark">See the full menu (${MEALS.length} meals) →</a></div>
      </div>
    </section>

    ${dasherBand()}
    ${boxBarHTML()}`;
  }

  function dasherBand() {
    return `<section class="dasher-band">
      <div>
        <p class="eyebrow">For students, by students</p>
        <h2 class="display">Make cash between classes.</h2>
        <p>Pick up boxes from the campus store, deliver to nearby dorms, and earn on a schedule that fits your week. No car required.</p>
        <a href="#/dash" class="btn btn-dark">${state.dasher ? "Open dasher dashboard" : "Apply to dash"} →</a>
      </div>
      <div class="stat-stack">
        <div class="stat"><span>Typical hourly earnings</span><strong>$18–24</strong></div>
        <div class="stat"><span>Average weekly shift</span><strong>2–3 hrs</strong></div>
        <div class="stat"><span>On-campus routes</span><strong>100%</strong></div>
      </div>
    </section>`;
  }

  function viewMenu() {
    let list = MEALS.filter((m) => ui.category === "all" || m.category === ui.category);
    if (ui.diet.has("veg")) list = list.filter((m) => m.tags.includes("Vegetarian"));
    if (ui.diet.has("protein")) list = list.filter((m) => m.nutrition.protein >= 20);
    if (ui.diet.has("budget")) list = list.filter((m) => m.price < 4);
    if (ui.diet.has("nocook")) list = list.filter((m) => m.method !== "microwave");
    if (ui.sort === "low") list = [...list].sort((a, b) => a.price - b.price);
    if (ui.sort === "protein") list = [...list].sort((a, b) => b.nutrition.protein - a.nutrition.protein);
    if (ui.sort === "fast") list = [...list].sort((a, b) => a.minutes - b.minutes);
    if (ui.sort === "popular") list = [...list].sort((a, b) => b.tags.includes("Popular") - a.tags.includes("Popular"));
    const cats = [["all", "All kits"], ...Object.entries(CATEGORIES)];
    const diet = (k, l) => `<button class="chip small ${ui.diet.has(k) ? "active" : ""}" data-action="diet" data-value="${k}" aria-pressed="${ui.diet.has(k)}">${l}</button>`;
    return `
    <section class="page-head wrap">
      <p class="eyebrow">${state.editing ? "Editing your weekly plan" : "Full menu"}</p>
      <h1 class="display">Pick up to ${MAX_MEALS} kits.</h1>
      <p>Breakfast, lunch, dinner and snack kits. Every one is no-cook or microwave-only, comes with step-by-step instructions, and is ready in 10 minutes or less.</p>
      <p class="muted" style="font-size:13px;font-weight:600;margin-top:10px">Concept menu: prices are suggestions, not verified costs. Nutrition is estimated.</p>
    </section>
    <section class="wrap" style="padding-bottom:140px">
      <div class="filters" role="group" aria-label="Filter by meal type">
        ${cats.map(([v, l]) => `<button class="chip ${ui.category === v ? "active" : ""}" data-action="category" data-value="${v}" aria-pressed="${ui.category === v}">${l}</button>`).join("")}
      </div>
      <div class="filters" role="group" aria-label="Filter meals" style="margin-top:-24px">
        ${diet("veg", "Vegetarian")}${diet("protein", "20g+ protein")}${diet("budget", "Under $4")}${diet("nocook", "No microwave needed")}
        <span class="spacer"></span>
        <label class="muted" style="font-weight:600;font-size:14px">Sort
          <select data-action="sort" aria-label="Sort meals">
            <option value="popular" ${ui.sort === "popular" ? "selected" : ""}>Popular</option>
            <option value="low" ${ui.sort === "low" ? "selected" : ""}>Price: low to high</option>
            <option value="protein" ${ui.sort === "protein" ? "selected" : ""}>Most protein</option>
            <option value="fast" ${ui.sort === "fast" ? "selected" : ""}>Fastest</option>
          </select>
        </label>
      </div>
      <div class="meal-grid">${list.length ? list.map(mealCard).join("") : `<div class="empty"><h3>No meals match those filters.</h3><button class="link-btn" data-action="clear-diet">Clear filters</button></div>`}</div>
    </section>
    ${boxBarHTML()}`;
  }

  function viewBox() {
    const items = Object.entries(state.box);
    const n = boxCount();
    if (!n) {
      return `<section class="confirm wrap">
        <div class="tick" style="background:var(--yellow)">0</div>
        <h1 class="display">Your box is empty.</h1>
        <p class="muted" style="font-size:19px">Add between 1 and ${MAX_MEALS} meals for the week. Most students start with 5–7.</p>
        <div class="actions" style="justify-content:center"><a class="btn btn-primary" href="#/menu">Browse the menu →</a>
        ${state.editing ? `<button class="btn btn-ghost" data-action="cancel-edit">Cancel editing</button>` : ""}</div>
      </section>`;
    }
    const subtotal = totalOf(state.box);
    const fridge = countMeals(state.box, "fridge");
    const freezer = countMeals(state.box, "freezer");
    const pantry = countMeals(state.box, "pantry");
    const d = state.delivery;
    const pickup = isPickup(d);
    const { drop, cutoff, window } = nextDrop(d.slot, d.method);
    const hallOpts = DORMS.map((h) => `<option ${d.hall === h ? "selected" : ""}>${h}</option>`).join("");

    return `
    <section class="page-head wrap">
      <p class="eyebrow">${state.editing ? "Edit weekly plan" : "My box"}</p>
      <h1 class="display">${n} meal${n > 1 ? "s" : ""} for the week.</h1>
      <p>${pickup ? "Ready for pickup" : "Arrives"} ${fmtDate(drop, { weekday: "long", month: "short", day: "numeric" })}, ${window}. Order by ${fmtDate(cutoff, { weekday: "long" })} 11:59 PM.</p>
    </section>
    <section class="wrap split">
      <div>
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <h2 style="margin:0">Meals</h2>
            <a href="#/menu" class="link-btn">+ Add more (${MAX_MEALS - n} left)</a>
          </div>
          ${items.map(([id, q]) => {
            const m = mealById(id);
            return `<div class="line-item">
              ${imgTag(m)}
              <div><h4>${esc(m.name)}</h4><small>${categoryLabel(m)} · ${prepLabel(m)} · ${m.storage === "fridge" ? `Fridge, eat within ${m.keepsDays} days` : m.storage === "freezer" ? "Freezer" : "Shelf"}</small></div>
              <div class="right"><strong>${money(m.price * q)}</strong>
                <div class="stepper"><button data-action="dec" data-id="${id}" aria-label="Remove one">−</button><span>${q}</span><button class="plus" data-action="inc" data-id="${id}" aria-label="Add one">+</button></div>
              </div>
            </div>`;
          }).join("")}
        </div>

        <div class="panel">
          <h2>Storage plan</h2>
          <p class="muted" style="margin-top:-8px">Here's where everything goes when your box lands.</p>
          <div class="storage">
            ${fridge ? `<div class="fr"><strong>${fridge}</strong><small>in the fridge. Eat sandwiches and salads first.</small></div>` : ""}
            ${freezer ? `<div class="fz"><strong>${freezer}</strong><small>in the freezer. Good for 30 days.</small></div>` : ""}
            ${pantry ? `<div class="pt"><strong>${pantry}</strong><small>on your shelf. No fridge needed.</small></div>` : ""}
          </div>
        </div>
      </div>

      <form class="sticky" id="checkoutForm" novalidate>
        <div class="panel">
          <h2>Ordering</h2>
          ${state.editing ? `<p class="note">You're editing your weekly subscription. Changes apply starting with the next drop.</p>` : `
          <div class="plan-toggle" role="radiogroup" aria-label="Order type">
            <button type="button" class="plan-opt ${state.plan === "weekly" ? "active" : ""}" data-action="plan" data-value="weekly" role="radio" aria-checked="${state.plan === "weekly"}"><strong>Every week</strong><small>Same box weekly. Edit, skip, or pause any time.</small></button>
            <button type="button" class="plan-opt ${state.plan === "once" ? "active" : ""}" data-action="plan" data-value="once" role="radio" aria-checked="${state.plan === "once"}"><strong>Just this week</strong><small>One-time box, no subscription.</small></button>
          </div>`}
        </div>

        <div class="panel">
          <h2>How do you want it?</h2>
          <div class="plan-toggle" role="radiogroup" aria-label="Pickup or delivery">
            <button type="button" class="plan-opt ${!pickup ? "active" : ""}" data-action="method" data-value="dash" role="radio" aria-checked="${!pickup}"><strong>Get it dashed</strong><small>A student dasher brings it to your dorm room.</small></button>
            <button type="button" class="plan-opt ${pickup ? "active" : ""}" data-action="method" data-value="pickup" role="radio" aria-checked="${pickup}"><strong>Pick it up</strong><small>Grab it at the campus store counter.</small></button>
          </div>
          <div class="form-grid" style="margin-top:20px">
            <div class="field"><label for="f-name">Full name</label><input id="f-name" name="name" value="${esc(d.name)}" autocomplete="name" required><span class="err"></span></div>
            <div class="field"><label for="f-email">School email</label><input id="f-email" name="email" type="email" value="${esc(d.email)}" placeholder="you@school.edu" autocomplete="email" required><span class="err"></span></div>
            ${pickup ? `
            <div class="field full"><p class="note" style="margin:0">📍 Campus Store, pickup counter (main floor). Show your order code and grab your labeled bag. Bring a tote — fridge items should go cold within 2 hours.</p></div>` : `
            <div class="field"><label for="f-hall">Residence hall</label><select id="f-hall" name="hall" required><option value="">Choose your dorm</option>${hallOpts}</select><span class="err"></span></div>
            <div class="field"><label for="f-room">Room number</label><input id="f-room" name="room" value="${esc(d.room)}" placeholder="e.g. 214B" required><span class="err"></span></div>`}
            <div class="field full"><span class="label">${pickup ? "Pickup window" : "Delivery window"}</span>
              <div class="check-row">
                <label class="check-pill"><input type="radio" name="slot" value="sun" ${d.slot === "sun" ? "checked" : ""}><span>${windowLabel(d.method, "sun")}</span></label>
                <label class="check-pill"><input type="radio" name="slot" value="mon" ${d.slot === "mon" ? "checked" : ""}><span>${windowLabel(d.method, "mon")}</span></label>
              </div>
            </div>
          </div>
        </div>

        <div class="panel">
          <h2>Summary</h2>
          <div class="summary-row"><span>${n} meals</span><span>${money(subtotal)}</span></div>
          <div class="summary-row"><span>${pickup ? "Campus store pickup" : "Dorm delivery"}</span><span class="free">FREE</span></div>
          <div class="summary-row"><span>Avg per meal</span><span>${money(subtotal / n)}</span></div>
          <div class="summary-row total"><span>${state.editing || state.plan === "weekly" ? "Weekly total" : "Total"}</span><span>${money(subtotal)}</span></div>
          <h3 class="pay-title">Payment</h3>
          <div class="plan-toggle pay-toggle" role="radiogroup" aria-label="Payment method">
            ${Object.entries(PAYMENTS).map(([k, p]) => `<button type="button" class="plan-opt ${(d.payment || "account") === k ? "active" : ""}" data-action="payment" data-value="${k}" role="radio" aria-checked="${(d.payment || "account") === k}"><strong>${p.label}</strong><small>${p.note}</small></button>`).join("")}
          </div>
          ${(d.payment || "account") === "card" ? `
          <div class="card-fields form-grid">
            <div class="field full"><label for="c-num">Card number</label><input id="c-num" name="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="1234 5678 9012 3456" value="${esc(card.number)}" data-format="card"><span class="err"></span></div>
            <div class="field"><label for="c-exp">Expiry</label><input id="c-exp" name="cardExp" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" value="${esc(card.exp)}" data-format="exp"><span class="err"></span></div>
            <div class="field"><label for="c-cvc">CVC</label><input id="c-cvc" name="cardCvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" maxlength="4" value="${esc(card.cvc)}"><span class="err"></span></div>
            <div class="field full"><label for="c-zip">Billing ZIP</label><input id="c-zip" name="cardZip" inputmode="numeric" autocomplete="postal-code" placeholder="84770" maxlength="5" value="${esc(card.zip)}"><span class="err"></span></div>
            <div class="field full"><p class="note" style="margin:0">Demo only: don't enter a real card. Use test card <code>4242 4242 4242 4242</code>, any future date, any CVC. <button type="button" class="link-btn" data-action="test-card">Fill test card</button></p></div>
          </div>` : ""}
          <p class="muted" style="font-size:13px;font-weight:600">${state.editing || state.plan === "weekly" ? "Charged each week before your drop. " : ""}Demo app: no real payment is taken.</p>
          <button class="btn btn-primary btn-block" type="submit">${state.editing ? "Update my plan" : state.plan === "weekly" ? "Start weekly plan" : "Place order"} · ${money(subtotal)}</button>
          ${state.editing ? `<div style="text-align:center;margin-top:14px"><button type="button" class="link-btn" data-action="cancel-edit">Cancel editing</button></div>` : ""}
        </div>
      </form>
    </section>`;
  }

  function viewConfirmed() {
    const o = state.orders.find((x) => x.id === state.lastOrderId);
    if (!o) return viewPlan();
    const drop = new Date(o.deliveryDate);
    return `<section class="confirm wrap">
      <div class="tick">✓</div>
      <p class="eyebrow">Order ${o.id}</p>
      <h1 class="display">${o.type === "update" ? "Plan updated." : "You're set for the week."}</h1>
      <p class="paid-with">${money(o.total)} · ${paidWith(o)}</p>
      ${isPickup(o) ? `
      <p class="muted" style="font-size:19px">${o.count} ${o.count === 1 ? "kit" : "kits"} will be ready at the <strong style="color:var(--ink)">Campus Store pickup counter</strong> on ${fmtDate(drop, { weekday: "long", month: "long", day: "numeric" })}, ${o.window}. Show this code at the counter:</p>
      <div class="pickup-code">${o.code}</div>` : `
      <p class="muted" style="font-size:19px">${o.count} ${o.count === 1 ? "kit" : "kits"} heading to <strong style="color:var(--ink)">${esc(o.hall)}, room ${esc(o.room)}</strong> on ${fmtDate(drop, { weekday: "long", month: "long", day: "numeric" })}, ${o.window}. We'll text you when your dasher is on the way.</p>`}
      <figure class="sticker-preview">
        <img src="images/box-sticker.png" alt="The Dorm Dash sticker on your box">
        <figcaption>Look for this sticker on your box. Order ${o.id} is written on the "Meal Kit" line.</figcaption>
      </figure>
      <div class="actions" style="justify-content:center">
        <a class="btn btn-dark" href="#/plan">${o.type === "once" ? "Track my order" : "Manage my plan"} →</a>
        <a class="btn btn-ghost" href="#/menu">Back to menu</a>
      </div>
    </section>`;
  }

  const STAGES = {
    dash: [["Confirmed", "Order locked Fri"], ["Packed", "At the campus store"], ["Out with dasher", "Heading to your dorm"], ["Delivered", "Fridge it!"]],
    pickup: [["Confirmed", "Order locked Fri"], ["Packed", "Sealed + labeled"], ["Ready for pickup", "At the store counter"], ["Picked up", "Fridge it!"]],
  };

  function tracker(stage, method = "dash") {
    return `<div class="tracker">${STAGES[method || "dash"].map(([t, s], i) => `
      <div class="track-step ${i < stage ? "done" : i === stage ? "current" : ""}">
        <div class="dot">${i < stage ? "✓" : i + 1}</div><strong>${t}</strong><small>${s}</small>
      </div>`).join("")}</div>`;
  }

  function viewPlan() {
    const sub = state.subscription;
    const lastOnce = state.orders.find((o) => o.type === "once");
    if (!sub && !state.orders.length) {
      return `<section class="confirm wrap">
        <div class="tick" style="background:var(--sky)">◷</div>
        <h1 class="display">No plan yet.</h1>
        <p class="muted" style="font-size:19px">Build a box of 1–${MAX_MEALS} meals and choose weekly delivery or a one-time order.</p>
        <a class="btn btn-primary" href="#/menu">Build my box →</a>
      </section>`;
    }

    let main = "";
    if (sub) {
      const { drop, cutoff, window } = nextDrop(sub.slot, sub.method);
      const where = isPickup(sub) ? `Campus store pickup (code ${sub.code})` : `${esc(sub.hall)}, room ${esc(sub.room)}`;
      const status = sub.status === "paused" ? "paused" : sub.skipNext ? "skipped" : "active";
      const statusText = { active: "Active", paused: "Paused", skipped: "Skipping next week" }[status];
      const n = countOf(sub.items);
      main = `
      <div class="panel">
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center">
          <h2 style="margin:0">Weekly plan</h2><span class="pill-status ${status}">${statusText}</span>
        </div>
        <p class="muted" style="font-weight:600">${n} meals · ${money(totalOf(sub.items))}/week · ${payLabel(sub)} · ${where} · ${windowLabel(sub.method, sub.slot)}</p>
        ${status === "active" ? `
          <h3 style="margin:24px 0 0;font-size:20px">${isPickup(sub) ? "Next pickup" : "Next drop"}: ${fmtDate(drop, { weekday: "long", month: "short", day: "numeric" })}, ${window}</h3>
          <p class="muted" style="margin:4px 0 0;font-weight:600">Changes lock ${fmtDate(cutoff, { weekday: "long" })} at 11:59 PM.</p>
          ${tracker(sub.stage || 0, sub.method)}
          ${(sub.stage || 0) === 3 ? `<p class="note">${isPickup(sub) ? "Picked up" : "Delivered"}! Put ${countMeals(sub.items, "fridge")} kits in the fridge${countMeals(sub.items, "freezer") ? ` and ${countMeals(sub.items, "freezer")} in the freezer` : ""}. Each bag has its instructions on the back.</p>` : ""}
          <button class="link-btn" data-action="advance" data-target="sub" style="font-size:13px">${(sub.stage || 0) < 3 ? "Demo: simulate next delivery step" : "Demo: reset tracker"}</button>
        ` : status === "skipped" ? `<p class="note">You're skipping the ${fmtDate(drop)} drop. You won't be charged that week.</p>` : `<p class="note">Your plan is paused. No boxes or charges until you resume.</p>`}
        <div class="actions">
          <button class="btn btn-dark btn-sm" data-action="edit-plan">Edit meals</button>
          ${sub.status !== "paused" ? `<button class="btn btn-light btn-sm" data-action="skip">${sub.skipNext ? "Unskip next week" : "Skip next week"}</button>` : ""}
          <button class="btn btn-light btn-sm" data-action="pause">${sub.status === "paused" ? "Resume plan" : "Pause plan"}</button>
          <button class="link-btn danger" data-action="cancel-sub" style="margin-left:auto">Cancel plan</button>
        </div>
      </div>
      <div class="panel">
        <h2>In your weekly box</h2>
        ${Object.entries(sub.items).map(([id, q]) => {
          const m = mealById(id);
          return `<div class="line-item">${imgTag(m)}<div><h4>${esc(m.name)}</h4><small>${categoryLabel(m)} · ${prepLabel(m)}</small></div>
            <div class="right"><strong>×${q}</strong><button class="link-btn" data-action="open-meal" data-id="${id}" style="font-size:13px">Instructions</button></div></div>`;
        }).join("")}
      </div>`;
    } else if (lastOnce) {
      main = `<div class="panel">
        <h2>Order ${lastOnce.id}</h2>
        <p class="muted" style="font-weight:600">${lastOnce.count} meals · ${isPickup(lastOnce) ? `Campus store pickup (code ${lastOnce.code})` : `${esc(lastOnce.hall)}, room ${esc(lastOnce.room)}`} · ${fmtDate(new Date(lastOnce.deliveryDate), { weekday: "long", month: "short", day: "numeric" })}, ${lastOnce.window}</p>
        ${tracker(lastOnce.stage || 0, lastOnce.method)}
        ${(lastOnce.stage || 0) < 3 ? `<button class="link-btn" data-action="advance" data-target="${lastOnce.id}" style="font-size:13px">Demo: simulate next delivery step</button>` : `<p class="note">${isPickup(lastOnce) ? "Picked up" : "Delivered"}! Fridge kits first. Each bag has its instructions on the back.</p>`}
        <div class="actions"><a class="btn btn-primary btn-sm" href="#/menu">Make it weekly →</a></div>
      </div>`;
    } else {
      main = `<div class="panel"><h2>No active plan</h2><p class="muted">Your past orders are on the right.</p><a class="btn btn-primary btn-sm" href="#/menu">Build a new box →</a></div>`;
    }

    return `
    <section class="page-head wrap">
      <p class="eyebrow">My plan</p>
      <h1 class="display">${state.delivery.name ? `Hey, ${esc(state.delivery.name.split(" ")[0])}.` : "Your meals."}</h1>
      <p>Edit, skip, or pause before Friday night. No lock-in, ever.</p>
    </section>
    <section class="wrap split">
      <div>${main}</div>
      <aside class="panel sticky">
        <h2>Order history</h2>
        ${state.orders.length ? state.orders.map((o) => `<div class="history-row"><div>${o.id}<small>${fmtDate(new Date(o.placedAt))} · ${o.count} ${o.count === 1 ? "kit" : "kits"} · ${o.type === "once" ? "One-time" : o.type === "update" ? "Plan update" : "Weekly plan"} · ${payLabel(o)}</small></div><span>${money(o.total)}</span></div>`).join("") : `<p class="muted">No orders yet.</p>`}
      </aside>
    </section>`;
  }

  const countMeals = (items, storage) => Object.entries(items).filter(([id]) => mealById(id).storage === storage).reduce((s, [, q]) => s + q, 0);

  // ---------- Dasher ----------
  function buildRoutes() {
    // Deterministic demo routes for the upcoming drop
    const firsts = ["A.", "J.", "M.", "S.", "K.", "R.", "T.", "L.", "D.", "E.", "N.", "P."];
    const lasts = ["Kim", "Patel", "Nguyen", "Lopez", "Brooks", "Okafor", "Chen", "Rivera", "Haddad", "Silva", "Ward", "Jensen"];
    const areas = [
      { id: "R1", name: "North Quad", halls: ["Maple Hall", "Cedar Hall"], mins: 40 },
      { id: "R2", name: "Hilltop", halls: ["Aspen Hall", "Juniper Hall"], mins: 50 },
      { id: "R3", name: "Central", halls: ["Birch Tower", "Willow Commons"], mins: 35 },
      { id: "R4", name: "South Campus", halls: ["Summit Village", "Riverside Apartments"], mins: 60 },
    ];
    let seed = 7;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    return areas.map((a, ai) => {
      const count = 6 + Math.floor(rnd() * 5);
      const stops = Array.from({ length: count }, (_, i) => ({
        hall: a.halls[i % 2],
        room: `${1 + Math.floor(rnd() * 4)}${String(Math.floor(rnd() * 30) + 1).padStart(2, "0")}${rnd() > 0.7 ? "B" : ""}`,
        who: `${firsts[(i + ai * 3) % firsts.length]} ${lasts[(i * 5 + ai) % lasts.length]}`,
        meals: 3 + Math.floor(rnd() * 12),
      })).sort((x, y) => x.hall.localeCompare(y.hall) || x.room.localeCompare(y.room));
      const pay = DASHER_PAY.routeBase + DASHER_PAY.perBox * count;
      return { ...a, stops, pay, boxes: count };
    });
  }

  function viewDash() {
    return state.dasher ? viewDasherDashboard() : viewDasherApply();
  }

  function viewDasherApply() {
    const boxesPerHr = 10;
    return `
    <section class="page-head wrap">
      <p class="eyebrow">Become a dasher</p>
      <h1 class="display">Get paid to walk your campus.</h1>
      <p>Dashers pick up packed boxes at the campus store and deliver them to dorms on Sunday evening or Monday morning. Flexible, on foot or bike, and you meet people in every hall.</p>
    </section>
    <section class="wrap split">
      <form class="panel" id="dasherForm" novalidate>
        <h2>Apply in 2 minutes</h2>
        <div class="form-grid">
          <div class="field"><label for="d-name">Full name</label><input id="d-name" name="name" autocomplete="name" value="${esc(state.delivery.name)}"><span class="err"></span></div>
          <div class="field"><label for="d-email">School email (.edu)</label><input id="d-email" name="email" type="email" placeholder="you@school.edu" value="${esc(state.delivery.email)}"><span class="err"></span></div>
          <div class="field"><label for="d-year">Year</label><select id="d-year" name="year"><option value="">Select</option><option>First-year</option><option>Sophomore</option><option>Junior</option><option>Senior</option><option>Grad student</option></select><span class="err"></span></div>
          <div class="field"><label for="d-dorm">Where you live</label><select id="d-dorm" name="dorm"><option value="">Select</option>${DORMS.map((h) => `<option ${state.delivery.hall === h ? "selected" : ""}>${h}</option>`).join("")}<option>Off campus</option></select><span class="err"></span></div>
          <div class="field full"><span class="label">When can you dash?</span>
            <div class="check-row">
              <label class="check-pill"><input type="checkbox" name="days" value="Sunday evening" checked><span>Sunday 5–9 PM</span></label>
              <label class="check-pill"><input type="checkbox" name="days" value="Monday morning"><span>Monday 7–10 AM</span></label>
            </div><span class="err" id="daysErr"></span>
          </div>
          <div class="field full"><span class="label">How will you get around?</span>
            <div class="check-row">
              ${["On foot", "Bike", "Scooter", "Skateboard"].map((t, i) => `<label class="check-pill"><input type="radio" name="transport" value="${t}" ${i === 0 ? "checked" : ""}><span>${t}</span></label>`).join("")}
            </div>
          </div>
          <div class="field full">
            <label class="agree"><input type="checkbox" name="agree"> I'll complete the 15-minute food-safety and cold-chain training and keep boxes in the insulated bags provided.</label>
            <span class="err" id="agreeErr"></span>
          </div>
        </div>
        <button class="btn btn-primary btn-block" type="submit" style="margin-top:20px">Submit application →</button>
        <p class="muted" style="font-size:13px;font-weight:600;text-align:center">We verify enrollment with your school email. Demo app: approval is instant.</p>
      </form>
      <aside class="sticky">
        <div class="panel">
          <h2>Earnings estimate</h2>
          <div class="calc">
            <label for="calc" style="font-weight:700">Boxes per week: <span id="calcN">12</span></label>
            <input id="calc" type="range" min="4" max="40" value="12" data-action="calc">
            <div class="big" id="calcOut">${money(DASHER_PAY.routeBase + DASHER_PAY.perBox * 12)}</div>
            <small class="muted" style="font-weight:600" id="calcSub">per week · about ${Math.round((12 / boxesPerHr) * 60)} min of dashing</small>
          </div>
        </div>
        <div class="panel">
          <h2>How dashing works</h2>
          <ul class="perk-list">
            <li><span class="ico">1</span><div><strong>Claim a route</strong><span>Routes cover 2 nearby halls, 6–10 boxes each.</span></div></li>
            <li><span class="ico">2</span><div><strong>Pick up at the campus store</strong><span>Boxes are packed, labeled by room, and waiting in insulated bags.</span></div></li>
            <li><span class="ico">3</span><div><strong>Drop at each door</strong><span>Tap "Delivered" per stop. Get paid ${money(DASHER_PAY.perBox)} a box plus ${money(DASHER_PAY.routeBase)} per route.</span></div></li>
          </ul>
        </div>
      </aside>
    </section>`;
  }

  function viewDasherDashboard() {
    const ds = state.dasher;
    const routes = buildRoutes();
    const active = ds.active ? routes.find((r) => r.id === ds.active.routeId) : null;
    const { drop, window } = nextDrop(ds.days.includes("Sunday evening") ? "sun" : "mon");
    const hourly = ds.minutes ? (ds.earnings / (ds.minutes / 60)) : 0;

    let activeHTML = "";
    if (active) {
      const done = ds.active.delivered;
      const picked = ds.active.picked;
      activeHTML = `<div class="panel">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <h2 style="margin:0">Route ${active.id} · ${active.name}</h2><strong class="meal-price">${money(active.pay)}</strong>
        </div>
        <p class="muted" style="font-weight:600">${active.halls.join(" + ")} · ${active.boxes} boxes · ~${active.mins} min</p>
        ${!picked ? `
          <div class="note" style="margin:16px 0">Head to the <strong>Campus Store pickup counter</strong>. Show your dasher code <strong>${ds.code}</strong> and grab ${active.boxes} boxes in insulated bags for route ${active.id}.</div>
          <button class="btn btn-dark" data-action="picked">I've picked up all ${active.boxes} boxes</button>
          <button class="link-btn danger" data-action="drop-route" style="margin-left:16px">Release route</button>
        ` : `
          <div class="progress" aria-label="Route progress"><div style="width:${(done.length / active.boxes) * 100}%"></div></div>
          <p style="font-weight:700;margin-top:-8px">${done.length} of ${active.boxes} delivered</p>
          ${active.stops.map((s, i) => `<div class="stop ${done.includes(i) ? "done" : ""}">
            <span class="n">${done.includes(i) ? "✓" : i + 1}</span>
            <div><h5>${esc(s.hall)} · Room ${esc(s.room)}</h5><small>${esc(s.who)} · ${s.meals} meals</small></div>
            ${done.includes(i) ? `<small style="color:#2c8a4b;font-weight:800">Delivered</small>` : `<button class="btn btn-dark btn-sm" data-action="deliver" data-i="${i}">Delivered</button>`}
          </div>`).join("")}
        `}
      </div>`;
    }

    const available = routes.filter((r) => !ds.completed.includes(r.id) && (!active || r.id !== active.id));
    return `
    <section class="page-head wrap">
      <p class="eyebrow">Dasher dashboard · Code ${ds.code}</p>
      <h1 class="display">Nice to see you, ${esc(ds.name.split(" ")[0])}.</h1>
      <p>Next shift: ${fmtDate(drop, { weekday: "long", month: "short", day: "numeric" })}, ${window}. Claim a route below. Boxes are first come, first served.</p>
    </section>
    <section class="wrap" style="padding-bottom:100px">
      <div class="kpis">
        <div class="kpi"><small>Earned</small><strong>${money(ds.earnings)}</strong></div>
        <div class="kpi"><small>Boxes delivered</small><strong>${ds.delivered}</strong></div>
        <div class="kpi"><small>Routes done</small><strong>${ds.completed.length}</strong></div>
        <div class="kpi"><small>Effective hourly</small><strong>${hourly ? money(hourly) : "—"}</strong></div>
      </div>
      <div class="split" style="padding-bottom:0">
        <div>
          ${activeHTML}
          <div class="panel">
            <h2>Open routes this week</h2>
            ${available.length ? available.map((r) => `<div class="route">
              <div><h4>Route ${r.id} · ${r.name}</h4><div class="meta">${r.halls.join(" + ")} · ${r.boxes} boxes · ~${r.mins} min</div></div>
              <div><div class="pay">${money(r.pay)}</div>
                <button class="btn ${active ? "btn-light" : "btn-primary"} btn-sm" data-action="claim" data-id="${r.id}" ${active ? "disabled" : ""}>${active ? "Finish current route first" : "Claim route"}</button></div>
            </div>`).join("") : `<p class="muted">You've cleared every route this week. Legend.</p>`}
          </div>
        </div>
        <aside class="panel sticky">
          <h2>Your profile</h2>
          <div class="history-row"><span>Year</span><span>${esc(ds.year)}</span></div>
          <div class="history-row"><span>Home hall</span><span>${esc(ds.dorm)}</span></div>
          <div class="history-row"><span>Shifts</span><span style="text-align:right">${ds.days.map(esc).join("<br>")}</span></div>
          <div class="history-row"><span>Getting around</span><span>${esc(ds.transport)}</span></div>
          <div class="history-row"><span>Status</span><span class="pill-status">Verified</span></div>
          <div class="actions"><button class="link-btn danger" data-action="leave-dasher">Stop dashing</button></div>
        </aside>
      </div>
    </section>`;
  }

  // ---------------- Meal detail modal ----------------
  function openMeal(id) {
    const m = mealById(id);
    const q = state.box[id] || 0;
    $("#modalBody").innerHTML = `<div class="detail">
      <div style="position:relative">${imgTag(m)}<div class="badges" style="position:absolute;top:18px;left:18px;display:flex;gap:8px">${tagBadges(m)}</div></div>
      <div class="detail-body">
        <div class="meal-meta">${categoryLabel(m)} · ${methodLabel(m)} · ${prepLabel(m)}</div>
        <h2 id="modalTitle">${esc(m.name)}</h2>
        <p class="muted" style="margin:0">${esc(m.desc)}</p>
        <h4 style="margin-top:22px">Estimated nutrition</h4>
        <div class="nutri" style="margin-top:0">
          <div><strong>${m.nutrition.cal}</strong><small>calories</small></div>
          <div><strong>${m.nutrition.protein}g</strong><small>protein</small></div>
          <div><strong>${m.nutrition.carbs}g</strong><small>carbs</small></div>
          <div><strong>${m.nutrition.fat}g</strong><small>fat</small></div>
        </div>
        <p class="note">${STORAGE_TEXT[m.storage](m)}</p>
        <h4>In the kit (pre-portioned)</h4>
        <ul>${m.ingredients.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>
        <h4>${m.minutes ? "Instructions" : "How to eat it"}</h4>
        <ol>${m.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>
        <div class="detail-actions">
          <span class="meal-price">${money(m.price)}</span>
          <button class="btn btn-primary" data-action="modal-add" data-id="${id}">${q ? `In box (${q}) · Add another` : "Add to box"}</button>
        </div>
      </div>
    </div>`;
    const modal = $("#modal");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    $(".modal-close").focus();
  }
  function closeModal() {
    $("#modal").hidden = true;
    document.body.style.overflow = "";
  }

  // ---------------- Login ----------------
  function viewLogin() {
    const why = { plan: "to see your plan", dash: "to open the dasher dashboard", box: "to place your order" }[ui.redirect];
    return `
    <section class="wrap login-wrap">
      <div class="login-card">
        <aside class="login-side">
          <p class="eyebrow">Utah Tech · Dorm meal kits</p>
          <h2 class="display">Eat better,<br>spend less.</h2>
          <img src="images/box-sticker.png" alt="Dorm Dash box sticker" class="login-sticker">
        </aside>
        <form class="login-form" id="loginForm" novalidate>
          <h1>Log in</h1>
          <p class="muted" style="margin:0 0 24px">${why ? `Log in with your student ID ${why}.` : "Use your student ID and password."}</p>
          <div class="field">
            <label for="l-id">Student ID</label>
            <input id="l-id" name="studentId" placeholder="D000000000" autocomplete="username" autocapitalize="characters" spellcheck="false" maxlength="10">
            <span class="err"></span>
          </div>
          <div class="field" style="margin-top:16px">
            <label for="l-pw">Password</label>
            <div class="pw-row">
              <input id="l-pw" name="password" type="password" autocomplete="current-password">
              <button type="button" class="link-btn" data-action="toggle-pw" aria-controls="l-pw">Show</button>
            </div>
            <span class="err"></span>
          </div>
          <p class="err login-err" id="loginErr" role="alert"></p>
          <button class="btn btn-primary btn-block" type="submit" style="margin-top:8px">Log in →</button>
          <div class="note demo-login">
            <strong>Test login</strong>
            <span>Student ID <code>D000000000</code> · Password <code>password</code></span>
            <button type="button" class="link-btn" data-action="fill-test">Fill it in for me</button>
          </div>
        </form>
      </div>
    </section>`;
  }

  function updateAuth() {
    const a = $("#authLink");
    if (!a) return;
    if (state.user) {
      a.textContent = "Log out";
      a.title = `Logged in as ${state.user.studentId}`;
      a.dataset.action = "logout";
      a.setAttribute("href", "#/");
    } else {
      a.textContent = "Log in";
      a.title = "";
      delete a.dataset.action;
      a.setAttribute("href", "#/login");
    }
  }

  // ---------------- Router ----------------
  const routes = { "": viewHome, how: viewHome, menu: viewMenu, box: viewBox, confirmed: viewConfirmed, plan: viewPlan, dash: viewDash, login: viewLogin };

  function render() {
    const path = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "";
    let view = routes[path] || viewHome;
    if (PROTECTED.includes(path) && !state.user) { ui.redirect = path; view = viewLogin; }
    if (path === "login" && state.user) view = viewHome;
    $("#app").innerHTML = view();
    updateAuth();
    document.querySelectorAll(".main-nav a").forEach((a) => a.classList.toggle("active", a.dataset.nav === path));
    updateBoxCount();
    if (path === "how") {
      requestAnimationFrame(() => $("#how")?.scrollIntoView({ behavior: "smooth" }));
    }
  }

  function navigate(path) {
    if (location.hash === "#/" + path) { render(); window.scrollTo(0, 0); }
    else location.hash = "/" + path;
  }

  window.addEventListener("hashchange", () => { closeModal(); render(); if (!location.hash.includes("how")) window.scrollTo(0, 0); });
  window.addEventListener("scroll", () => $(".site-header").classList.toggle("scrolled", window.scrollY > 10), { passive: true });

  // ---------------- Events ----------------
  document.addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (e.target.id === "modal") { closeModal(); return; }
    if (!el) return;
    const { action, id, value } = el.dataset;
    const path = location.hash.replace(/^#\/?/, "");

    switch (action) {
      case "logout":
        e.preventDefault();
        state.user = null; save(); navigate(""); toast("You're logged out.");
        break;
      case "fill-test":
        $("#l-id").value = TEST_ACCOUNT.studentId; $("#l-pw").value = "password"; $("#l-pw").focus();
        break;
      case "toggle-pw": {
        const pw = $("#l-pw"); const show = pw.type === "password";
        pw.type = show ? "text" : "password"; el.textContent = show ? "Hide" : "Show";
        break;
      }
      case "inc": {
        if (setQty(id, (state.box[id] || 0) + 1)) {
          if (path === "box") render(); else refreshQtySlots();
          if ((state.box[id] || 0) === 1) toast(`Added ${mealById(id).name}`);
        }
        break;
      }
      case "dec": {
        setQty(id, (state.box[id] || 0) - 1);
        if (path === "box") render(); else refreshQtySlots();
        break;
      }
      case "open-meal": openMeal(id); break;
      case "close-modal": closeModal(); break;
      case "modal-add": {
        if (setQty(id, (state.box[id] || 0) + 1)) { toast(`Added ${mealById(id).name}`); closeModal(); if (path === "box") render(); else refreshQtySlots(); }
        break;
      }
      case "diet": ui.diet.has(value) ? ui.diet.delete(value) : ui.diet.add(value); render(); break;
      case "clear-diet": ui.diet.clear(); ui.category = "all"; render(); break;
      case "category": ui.category = value; render(); break;
      case "method": captureCheckout(); state.delivery.method = value; save(); render(); break;
      case "payment": captureCheckout(); state.delivery.payment = value; save(); render(); if (value === "card") $("#c-num")?.focus(); break;
      case "test-card": {
        const y = String((new Date().getFullYear() + 2) % 100).padStart(2, "0");
        const t = { "#c-num": "4242 4242 4242 4242", "#c-exp": "12/" + y, "#c-cvc": "123", "#c-zip": "84770" };
        Object.entries(t).forEach(([sel, v]) => { const i = $(sel); if (i) { i.value = v; i.closest(".field")?.classList.remove("invalid"); const er = i.closest(".field")?.querySelector(".err"); if (er) er.textContent = ""; } });
        captureCheckout();
        break;
      }
      case "plan": captureCheckout(); state.plan = value; save(); render(); break;

      case "edit-plan":
        state.box = { ...state.subscription.items };
        state.editing = true; save(); navigate("menu");
        toast("Editing your plan. Change meals, then review.");
        break;
      case "cancel-edit": state.editing = false; state.box = {}; save(); navigate("plan"); break;
      case "skip": state.subscription.skipNext = !state.subscription.skipNext; save(); render(); toast(state.subscription.skipNext ? "Next week skipped. No charge." : "Next week is back on."); break;
      case "pause": state.subscription.status = state.subscription.status === "paused" ? "active" : "paused"; save(); render(); toast(state.subscription.status === "paused" ? "Plan paused." : "Welcome back! Plan resumed."); break;
      case "cancel-sub":
        if (confirm("Cancel your weekly plan? You can start a new one any time.")) { state.subscription = null; save(); render(); toast("Plan cancelled."); }
        break;
      case "advance": {
        const target = el.dataset.target === "sub" ? state.subscription : state.orders.find((o) => o.id === el.dataset.target);
        const cur = target.stage || 0;
        target.stage = el.dataset.target === "sub" ? (cur + 1) % 4 : Math.min(cur + 1, 3);
        if (target.stage === 3) toast("Delivered! Time to stock the fridge.");
        save(); render();
        break;
      }

      // dasher
      case "claim": {
        state.dasher.active = { routeId: id, picked: false, delivered: [], startedAt: Date.now() };
        save(); render(); window.scrollTo({ top: 0, behavior: "smooth" }); toast(`Route ${id} is yours.`);
        break;
      }
      case "drop-route": state.dasher.active = null; save(); render(); break;
      case "picked": state.dasher.active.picked = true; save(); render(); break;
      case "deliver": {
        const ds = state.dasher; const i = +el.dataset.i;
        if (!ds.active.delivered.includes(i)) ds.active.delivered.push(i);
        const route = buildRoutes().find((r) => r.id === ds.active.routeId);
        if (ds.active.delivered.length === route.boxes) {
          ds.earnings += route.pay; ds.delivered += route.boxes; ds.minutes += route.mins;
          ds.completed.push(route.id); ds.active = null;
          toast(`Route done! +${money(route.pay)}`);
        }
        save(); render();
        break;
      }
      case "leave-dasher":
        if (confirm("Stop dashing? Your earnings history will be cleared in this demo.")) { state.dasher = null; save(); render(); }
        break;
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.dataset.action === "sort") { ui.sort = e.target.value; render(); }
  });
  document.addEventListener("input", (e) => {
    const fmt = e.target.dataset?.format;
    if (fmt === "card") e.target.value = fmtCard(e.target.value);
    if (fmt === "exp") e.target.value = fmtExp(e.target.value);
    if (e.target.dataset.action === "calc") {
      const n = +e.target.value;
      $("#calcN").textContent = n;
      const routesNeeded = Math.max(1, Math.ceil(n / 8));
      $("#calcOut").textContent = money(DASHER_PAY.perBox * n + DASHER_PAY.routeBase * routesNeeded);
      $("#calcSub").textContent = `per week · about ${Math.round((n / 10) * 60)} min of dashing`;
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

  // ---------------- Forms ----------------
  function setErr(form, name, msg) {
    const input = form.querySelector(`[name="${name}"]`);
    const field = input?.closest(".field");
    if (!field) return;
    field.classList.toggle("invalid", !!msg);
    const err = field.querySelector(".err");
    if (err) err.textContent = msg || "";
  }

  function captureCheckout() {
    const f = $("#checkoutForm");
    if (!f) return;
    const fd = new FormData(f);
    Object.assign(state.delivery, {
      name: (fd.get("name") || "").trim(), email: (fd.get("email") || "").trim(), slot: fd.get("slot") || "sun",
    });
    if (fd.has("hall")) state.delivery.hall = fd.get("hall") || "";
    if (fd.has("room")) state.delivery.room = (fd.get("room") || "").trim();
    if (fd.has("cardNumber")) Object.assign(card, { number: fd.get("cardNumber") || "", exp: fd.get("cardExp") || "", cvc: fd.get("cardCvc") || "", zip: fd.get("cardZip") || "" });
  }

  document.addEventListener("submit", (e) => {
    const f = e.target;
    e.preventDefault();

    if (f.id === "checkoutForm" && !state.user) {
      captureCheckout(); save();
      ui.redirect = "box"; navigate("login");
      toast("Log in with your student ID to place your order.");
      return;
    }

    if (f.id === "loginForm") {
      const id = (f.studentId.value || "").trim().toUpperCase();
      const pw = f.password.value || "";
      let ok = true;
      const formatOk = /^D\d{8,9}$/.test(id);
      setErr(f, "studentId", !id ? "Enter your student ID." : formatOk ? "" : "Student IDs start with D followed by your ID number.");
      setErr(f, "password", pw ? "" : "Enter your password.");
      $("#loginErr").textContent = "";
      if (!id || !formatOk || !pw) ok = false;
      if (ok && !(id === TEST_ACCOUNT.studentId && TEST_ACCOUNT.passwords.includes(pw))) {
        $("#loginErr").textContent = "That student ID and password don't match. Check them and try again.";
        ok = false;
      }
      if (!ok) { f.querySelector(".invalid input")?.focus(); return; }
      state.user = { studentId: id, loggedInAt: Date.now() };
      save();
      const to = ui.redirect || ""; ui.redirect = "";
      navigate(to);
      toast(`Welcome back, ${id}!`);
      return;
    }

    if (f.id === "checkoutForm") {
      captureCheckout();
      const d = state.delivery;
      let ok = true;
      const check = (name, cond, msg) => { setErr(f, name, cond ? "" : msg); if (!cond) ok = false; };
      check("name", d.name.length > 1, "Add your name for the label.");
      check("email", /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email), "Enter a valid email.");
      if (!isPickup(d)) {
        check("hall", !!d.hall, "Pick your residence hall.");
        check("room", d.room.length > 0, "Add your room number.");
      }
      if (d.payment === "card") {
        const num = digits(card.number), [mm, yy] = card.exp.split("/").map((x) => +x);
        const now = new Date(), expOk = mm >= 1 && mm <= 12 && yy >= 0 && new Date(2000 + yy, mm, 1) > now;
        check("cardNumber", num.length >= 15 && num.length <= 16 && luhn(num), "Enter a valid card number.");
        check("cardExp", /^\d{2}\/\d{2}$/.test(card.exp) && expOk, "Enter a future date as MM/YY.");
        check("cardCvc", /^\d{3,4}$/.test(card.cvc), "Enter the 3 or 4 digit code.");
        check("cardZip", /^\d{5}$/.test(card.zip), "Enter a 5-digit ZIP.");
      }
      save();
      if (!ok) { f.querySelector(".invalid input, .invalid select")?.focus(); return; }

      const method = d.method || "dash";
      const { drop, window } = nextDrop(d.slot, method);
      const code = state.subscription?.code || "P-" + Math.random().toString(36).slice(2, 6).toUpperCase();
      const items = { ...state.box };
      const type = state.editing ? "update" : state.plan;
      const order = {
        id: "DD-" + Math.floor(1000 + Math.random() * 9000),
        placedAt: Date.now(), items, count: countOf(items), total: totalOf(items),
        deliveryDate: drop.toISOString(), window, hall: d.hall, room: d.room, type, stage: 0, method, code, payment: d.payment || "account", cardLast4: d.payment === "card" ? digits(card.number).slice(-4) : undefined,
      };
      state.orders.unshift(order);
      if (type === "weekly" || type === "update") {
        state.subscription = {
          ...(state.subscription || { status: "active", skipNext: false, startedAt: Date.now(), stage: 0 }),
          items, hall: d.hall, room: d.room, slot: d.slot, method, code, payment: d.payment || "account", cardLast4: d.payment === "card" ? digits(card.number).slice(-4) : undefined,
        };
      }
      state.box = {}; state.editing = false; state.lastOrderId = order.id;
      Object.assign(card, { number: "", exp: "", cvc: "", zip: "" });
      save(); navigate("confirmed");
      return;
    }

    if (f.id === "dasherForm") {
      const fd = new FormData(f);
      const v = {
        name: (fd.get("name") || "").trim(), email: (fd.get("email") || "").trim(),
        year: fd.get("year") || "", dorm: fd.get("dorm") || "", days: fd.getAll("days"),
        transport: fd.get("transport") || "On foot", agree: !!fd.get("agree"),
      };
      let ok = true;
      const check = (name, cond, msg) => { setErr(f, name, cond ? "" : msg); if (!cond) ok = false; };
      check("name", v.name.length > 1, "Add your full name.");
      check("email", /^[^\s@]+@[^\s@]+\.edu$/i.test(v.email), "Use your school email ending in .edu.");
      check("year", !!v.year, "Select your year.");
      check("dorm", !!v.dorm, "Tell us where you live.");
      $("#daysErr").textContent = v.days.length ? "" : "Pick at least one shift.";
      $("#agreeErr").textContent = v.agree ? "" : "Please agree to the food-safety training.";
      if (!v.days.length || !v.agree) ok = false;
      if (!ok) { f.querySelector(".invalid input, .invalid select")?.focus(); return; }

      state.dasher = {
        ...v, code: "D" + Math.floor(100 + Math.random() * 900),
        approvedAt: Date.now(), earnings: 0, delivered: 0, minutes: 0, completed: [], active: null,
      };
      save(); render(); window.scrollTo(0, 0);
      toast("You're approved! Claim your first route.");
    }
  });

  // ---------------- Boot ----------------
  render();
})();
