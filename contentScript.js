// content_script.js

// list of bootstrap CSS files packaged in the extension
const bootstrapFiles = [
  { name: "Bootstrap v4-alpha", path: "bootstrap-v4alpha.css" }
];

// global sidebar id
const SIDEBAR_ID = "bs-class-scanner-sidebar";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "toggle-sidebar") {
    toggleSidebar();
  }
});

function toggleSidebar() {
  const existing = document.getElementById(SIDEBAR_ID);
  if (existing) {
    existing.remove();
    // optionally remove the overlay hide body scrollbar
    document.documentElement.style.marginRight = "";
    return;
  }
  createSidebar();
}

function createSidebar() {
  const sidebar = document.createElement("div");
  sidebar.id = SIDEBAR_ID;
  sidebar.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 380px;
    height: 100vh;
    background: #fff;
    box-shadow: -6px 0 18px rgba(0,0,0,0.2);
    z-index: 2147483647;
    font-family: Arial, sans-serif;
    display: flex;
    flex-direction: column;
    padding: 12px;
    box-sizing: border-box;
  `;

  // Add a style tag for the highlight class
  const style = document.createElement("style");
  style.textContent = ".bootstrap-class-scanner-highlight { outline: 3px solid red; }";
  sidebar.appendChild(style);

  // header
  const header = document.createElement("div");
  header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;";
  header.innerHTML = `<strong>Bootstrap Class Scanner</strong>`;
  const closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.title = "Close";
  closeBtn.style.cssText = "border:none;background:none;font-size:18px;cursor:pointer";
  closeBtn.addEventListener("click", () => sidebar.remove());
  header.appendChild(closeBtn);
  sidebar.appendChild(header);

  // controls: dropdown for versions, refresh button
  const controls = document.createElement("div");
  controls.style.cssText = "margin-bottom:8px;display:flex;gap:4px;align-items:center;flex-wrap:wrap;";
  const select = document.createElement("select");
  select.style.cssText = "flex:1;padding:6px";
  bootstrapFiles.forEach(f => {
    const opt = document.createElement("option");
    opt.value = f.path;
    opt.textContent = f.name;
    select.appendChild(opt);
  });
  controls.appendChild(select);

  const refreshBtn = document.createElement("button");
  refreshBtn.textContent = "Scan";
  refreshBtn.style.cssText = "padding:4px 8px;cursor:pointer";
  controls.appendChild(refreshBtn);

  const wrapperDiv = document.createElement("div");
  wrapperDiv.style.cssText = "display: flex;gap:10px;";

  const sortBy = document.createElement("select");
  sortBy.style.cssText = "padding:6px;";
  sortBy.innerHTML = `<option value="count">Sort by Count</option><option value="name">Sort by Name</option>`;
  wrapperDiv.appendChild(sortBy);

  const sortDir = document.createElement("select");
  sortDir.style.cssText = "padding:6px;";
  sortDir.innerHTML = `<option value="desc">Desc</option><option value="asc">Asc</option>`;
  wrapperDiv.appendChild(sortDir);

  controls.appendChild(wrapperDiv);
  sidebar.appendChild(controls);

  // stats / info
  const info = document.createElement("div");
  info.style.cssText = "font-size:12px;color:#444;margin-bottom:6px";
  info.textContent = "Select Bootstrap version and click Scan.";
  sidebar.appendChild(info);

  // results container
  const results = document.createElement("div");
  results.style.cssText = "flex:1;overflow:auto;border-top:1px solid #eee;padding-top:8px";
  sidebar.appendChild(results);

  // Add sidebar to document
  document.documentElement.appendChild(sidebar);

  // make body margin to avoid horizontal scroll overlap (optional)
  // document.documentElement.style.marginRight = "380px";

  // event handlers
  const scanAndRender = () => {
    info.textContent = "Scanning…";
    fetchCssAndScan(select.value)
      .then(list => {
        renderResults(list, results, info, sortBy.value, sortDir.value);
      })
      .catch(err => {
        info.textContent = "Error: " + String(err);
      });
  };

  refreshBtn.addEventListener("click", scanAndRender);
  sortBy.addEventListener("change", scanAndRender);
  sortDir.addEventListener("change", scanAndRender);

  // initial automatic scan
  scanAndRender();
}

function fetchCssAndScan(cssPath) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "fetch-css", path: cssPath }, (resp) => {
      if (!resp) {
        reject("No response from background (maybe extension not allowed).");
        return;
      }
      if (!resp.ok) {
        reject(resp.error || "Failed to fetch CSS");
        return;
      }
      try {
        const cssText = resp.text;
        const cssClasses = extractClassesFromCss(cssText);
        const classCounts = extractClassesFromPage();
        // exact matches intersection
        const matches = Array.from(cssClasses)
          .filter(c => classCounts.has(c))
          .map(c => ({ name: c, count: classCounts.get(c) }));
        resolve({ matches, cssCount: cssClasses.size, pageCount: classCounts.size });
      } catch (e) {
        reject(e);
      }
    });
  });
}

// extract class tokens from CSS text
function extractClassesFromCss(cssText) {
  // Regex: find .className in selectors. This will catch .btn, .nav-item, etc.
  // We avoid capturing stuff like ".123" by limiting to letters, underscore, hyphen, digits.
  const re = /\.([A-Za-z0-9_-]+)(?=[^A-Za-z0-9_-]|$)/g;
  const set = new Set();
  let m;
  while ((m = re.exec(cssText)) !== null) {
    set.add(m[1]);
  }
  return set;
}

// extract classes actually used on page (exact tokens)
function extractClassesFromPage() {
  const classCounts = new Map();
  // find all elements with class attribute
  const nodes = document.querySelectorAll("[class]");
  nodes.forEach(el => {
    // el.classList is live DOMTokenList
    el.classList.forEach(cls => {
      if (cls && cls.trim()) {
        const trimmedCls = cls.trim();
        classCounts.set(trimmedCls, (classCounts.get(trimmedCls) || 0) + 1);
      }
    });
  });
  return classCounts;
}

function renderResults(resultObj, resultsEl, infoEl, sortBy = "name", sortDir = "asc") {
  const { matches, cssCount, pageCount } = resultObj;

  // sort matches
  matches.sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name);
    } else { // count
      comparison = a.count - b.count;
    }
    return sortDir === 'asc' ? comparison : -comparison;
  });

  resultsEl.innerHTML = "";
  infoEl.textContent = `Found ${cssCount} classes in CSS, ${pageCount} unique classes on page. ${matches.length} exact matches.`;

  if (matches.length === 0) {
    const n = document.createElement("div");
    n.style.cssText = "padding:8px;color:#666";
    n.textContent = "No exact matches found.";
    resultsEl.appendChild(n);
    return;
  }

  // alphabetical list
  const ul = document.createElement("ul");
  ul.style.cssText = "list-style:none;padding-left:10px;margin:0";
  matches.forEach(cls => {
    const li = document.createElement("li");
    li.style.cssText = "padding:6px 0;border-bottom:1px solid #f2f2f2;font-size:13px;display:flex;justify-content:space-between;";
    const badge = document.createElement("span");
    badge.textContent = cls.name;
    const count = document.createElement("span");
    count.textContent = cls.count;
    count.style.cssText = "font-weight:bold;color:#333;";
    li.appendChild(badge);
    li.appendChild(count);
    ul.appendChild(li);

    li.addEventListener("mouseenter", () => {
      document.querySelectorAll(`.${cls.name}`).forEach(el => {
        el.classList.add("bootstrap-class-scanner-highlight");
      });
    });
    li.addEventListener("mouseleave", () => {
      document.querySelectorAll(`.${cls.name}`).forEach(el => {
        el.classList.remove("bootstrap-class-scanner-highlight");
      });
    });

    li.addEventListener("click", () => {
      const firstElement = document.querySelector(`.${cls.name}`);
      if (firstElement) {
        firstElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  });
  resultsEl.appendChild(ul);
}

