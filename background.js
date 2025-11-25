// background.js
chrome.action.onClicked.addListener((tab) => {
  // send message to toggle sidebar in the active tab
  chrome.tabs.sendMessage(tab.id, { type: "toggle-sidebar" });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "fetch-css") {
    const path = msg.path;
    const url = path.startsWith("http") ? path : chrome.runtime.getURL(path);
    fetch(url)
      .then(resp => {
        if (!resp.ok) throw new Error(`Failed to fetch ${path}: ${resp.status}`);
        return resp.text();
      })
      .then(text => sendResponse({ ok: true, text }))
      .catch(err => {
        console.log("Error fetching CSS:", err);
        sendResponse({ ok: false, error: String(err) });
      });
    // Tell Chrome we will respond asynchronously
    return true;
  }
});

