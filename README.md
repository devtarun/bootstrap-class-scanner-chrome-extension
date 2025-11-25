# Bootstrap Class Scanner Chrome Extension

A Chrome extension to scan any webpage and identify which Bootstrap classes are being used.

## Features

*   **Scans for Bootstrap Classes:** Analyzes the active tab to find all CSS classes from the Bootstrap v4 Alpha stylesheet that are present in the page's HTML.
*   **Interactive Sidebar:** Displays the list of found Bootstrap classes in a convenient sidebar.
*   **Usage Count:** Shows how many times each Bootstrap class is used on the page.
*   **Sorting:** Allows sorting the found classes by name or by usage count (ascending or descending).
*   **Element Highlighting:** Hovering over a class in the sidebar highlights all corresponding elements on the page with a red outline.
*   **Scroll to Element:** Clicking on a class in the sidebar scrolls the page to the first element using that class.

## How to Use

1.  Clone this repository or download the source code.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable "Developer mode" in the top right corner.
4.  Click on "Load unpacked" and select the directory where you saved the code.
5.  Navigate to any website you want to analyze.
6.  Click the Bootstrap Class Scanner icon in your Chrome toolbar to open the sidebar.
7.  The sidebar will automatically scan the page and display the results.
8.  Use the dropdown menus to select the Bootstrap version (currently only v4 Alpha is supported) and sorting preferences, then click "Scan".

## How It Works

The extension consists of a content script that is injected into the active tab and a background service worker.

1.  When the user clicks the extension icon, the `background.js` script sends a message to the `contentScript.js` to create and inject a sidebar into the page.
2.  The content script fetches the `bootstrap-v4alpha.css` file (via the background script).
3.  It parses the CSS file to extract a list of all available Bootstrap class names.
4.  It then traverses the page's DOM to find all class names used in the HTML.
5.  Finally, it compares the two lists to find exact matches and displays them in the sidebar, along with their usage counts.

## Development

This is a simple extension with no external build dependencies.

*   `manifest.json`: Defines the extension's properties, permissions, and scripts.
*   `background.js`: The service worker that handles the browser action click and fetches the CSS file.
*   `contentScript.js`: The script that creates the sidebar, scans the page for classes, and handles all the UI interactions within the sidebar.
*   `bootstrap-v4alpha.css`: The Bootstrap stylesheet used for class comparison.