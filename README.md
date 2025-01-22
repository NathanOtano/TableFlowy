Hey all! :)  
Here is a simple bookmarklet creating a table with sortable columns and filters on top of current view  
It lists only bullets including tags in the form of #property-value, using "-" as a divider between column name and the inline property

It looks only to visible bullets (not collapsed, not hidden) so make sure to use "expand all" on the top bullet before using it

This is a function I deeply missed in workflowy. Would be nice to have queries like that natively

https://github.com/user-attachments/assets/c61375d1-f86b-45f3-8fd9-3cebbfbbbdae

(video not up to date, I added some functionnalities described below)

# Features

1. Table Generation: Builds a table for all bullets containing special tags:
    - #p<number> or #P<number> → recognized as property “P” and the digit(s) as the value.
    - #property-value → splits on the first dash; e.g. #task-todo → property = “task,” value = “todo.”
    - All other tags remain in a “Tags” column.
2. Columns:
    - Parent: Shows the parent bullet name (tags stripped), clickable to focus that parent.
    - Bullet: The bullet’s text, clickable to focus that bullet.
    - Date: Any date values contained within the bullet
    - @s: Any @ type tags that are contained within the bullet
    - Backlinks: [[Any backlinks]] contained within the bullet
    - Tags: Any leftover #tags that aren’t in the property-value formats above.
    - One Column per Unique Property: Contains the matched value for that bullet.
3. Sorting: Click any column header to sort ascending; click again to sort descending.
4. Filtering:
    - Per-column filters: One text box under each header to filter that column.
    - Global filter box: Filters across all columns at once.

# Installation

1. Create a new bookmark in your browser (Chrome, Firefox, Edge, Safari, etc.).
2. Open the bookmark’s “Edit” or “Properties” to change its URL/location.
3. Paste the entire [JavaScript snippet](https://github.com/NathanOtano/TableFlowy/blob/main/Bookmarlet_JS_Snippet) (including `javascript:`) in place of the URL.
4. Name the bookmark something like: “TableFlowy”
5. Click this bookmark while on a Workflowy page to trigger it.

# Usage

1. Navigate to the Workflowy page that has your outline.
2. Click the bookmark.
3. The script:
    - Adds the main table button in the menu bar, if not already present.
    - Clicking on it toggles visibility of all existing tables or creates a new one if none exist.
4. Interact with the table:
    - Sort columns by clicking a header (toggles asc/desc).
    - Filter with textboxes below headers (per-column) or via the global filter (all columns).
    - Toggle visibility of all tables using the main table button.
    - Add new tables using the "+" button in each table's top bar.
    - Refresh a specific table using the refresh button to replace it.
    - Close a specific table using the "x" button to remove it entirely.

# Functions Overview

Below is a brief description of each function in the script:

1. **show(message)**
    
    - Displays a message either via Workflowy’s built-in toast (`WF.showMessage`) if available, or via a plain `alert()`.
    - Used for quick status updates (e.g., “Scrolling to load all bullets...”, “Done!”).
2. **parseSpecialTag(tag)**
    
    - Takes a string like `#task-todo` or `#p2`.
    - If it’s `#p<number>` (or `#P<number>`), returns `["P", "<number>"]`.
    - If it’s `#property-value` (any text before a dash, then a dash, then any text), splits on the first dash and returns `[property, value]`.
    - Otherwise returns `null`, meaning it’s not a recognized special tag format.
3. **stripTags(str)**
    
    - Removes any `#` tags from a string using a simple regex and trims whitespace.
    - Used to display a parent bullet’s text without any Workflowy tags.
4. **sortTableByColumn(table, columnIndex, ascending)**
    
    - Sorts the rows of the table by the text content in the specified `columnIndex`.
    - Performs numeric sort if both values are numeric; otherwise, does a case-insensitive string sort.
    - `ascending` is a boolean that determines ascending/descending order.
5. **makeCell(content)**
    
    - Creates a `<td>` element with basic styling (border, padding).
    - Appends either a text node (if content is a string) or the element provided.
6. **loadAllBullets(doneCallback)**
    
    - Scrolls the window to the bottom in intervals, checking if `document.body.scrollHeight` changes.
    - Once it stabilizes (no change for several iterations), it assumes all bullets are loaded.
    - Calls `doneCallback()` (in our snippet, this is `buildTable()`).
7. **buildTable()**
    
    - Collects bullets via the selector `.innerContentContainer`.
    - For each bullet, extracts text and tags, grouping “special” tags into property-value pairs.
    - Builds a list of bullet data (`bulletDataList`) plus a set of all unique properties (`allProps`).
    - Creates a new HTML `<div>` container with:
        - **Top Bar**: containing the “Collapse Table” button, “Refresh Table” button, “Add Table” button, “Close Table” button, table name, and a global filter `<input>`.
        - **Table**: with a `<thead>` for headers + filter row, plus a `<tbody>` for bullet rows.
    - Inserts that container above the root bullet (found via `document.querySelector('div[projectid].project.root.selected')`).
    - Binds sorting to each header (toggle ascending/descending) and sets up the filter logic for column inputs and global filter.
    - Scrolls to the top at the end to show the newly created table.
8. **injectTableButton()**
    
    - Removes any existing table buttons to prevent duplicates.
    - Finds the share button in Workflowy’s header.
    - Creates a new main table button with the `table-properties` icon and places it next to the share button.
    - Assigns functionality to toggle visibility of all tables or create a new one if none exist.
    - Ensures Lucide icons are loaded for all buttons.
9. **filterRows()**
    
    - Filters table rows based on the global filter and per-column filters.
    - Supports multiple terms and exclusions using commas and exclamation marks.
10. **Add Table Button Functionality**
    
    - Located on the right of the close (`x`) button in each table's top bar.
    - Clicking the plus (`+`) icon adds a new table on top of existing ones and ensures that all tables are visible.

# Important Notes

- **Lucide Icons**: The bookmarklet dynamically loads Lucide icons from a CDN. Ensure you have an active internet connection when using the bookmarklet.
- **Workflowy Structure**: This script assumes a specific HTML structure in Workflowy. If Workflowy updates its DOM, you might need to adjust the selectors accordingly.
- **Performance**: Auto-scrolling to load all bullets may take some time depending on the number of bullets in your Workflowy outline.
- **Permissions**: Ensure your browser allows bookmarklets to execute JavaScript on the Workflowy domain.

# Disclaimer

Use this bookmarklet at your own risk. While it has been tested for functionality, changes in Workflowy’s interface or DOM structure may affect its performance. Always back up your data before running scripts that manipulate the DOM.
