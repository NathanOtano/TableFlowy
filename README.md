Hey all! :)  
I created a simple bookmarklet creating a table with sortable columns and filters on top of current view  
It lists only bullets including tags in the form of #property-value, using "-" as a divider between column name and the inline property

It looks only to visible bullet (not collapsed, not hidden) so make sure to "expand all" before using it

This is a function I deeply missed in workflowy. Would be nice to have queries like that natively

# Features

1. Auto-Loading: Scrolls to the bottom repeatedly until no more bullets appear.
2. Table Generation: Builds a table for all bullets containing special tags:
    - #p<number> or #P<number> → recognized as property “P” and the digit(s) as the value.
    - #property-value → splits on the first dash; e.g. #task-todo → property = “task,” value = “todo.”
    - All other tags remain in a “Tags” column.
3. Columns:
    - Parent: Shows the parent bullet name (tags stripped), clickable to focus that parent.
    - Bullet: The bullet’s text, clickable to focus that bullet.
    - Tags: Any leftover tags that aren’t in the property-value formats above.
    - One Column per Unique Property: Contains the matched value for that bullet.
4. Sorting: Click any column header to sort ascending; click again to sort descending.
5. Filtering:
    - Per-column filters: One text box under each header to filter that column.
    - Global filter box: Filters across all columns at once.
6. Collapse Table button: Toggle the table’s visibility on/off.
7. Close Table button: Removes the table entirely, restoring the page to normal.
8. Scroll Back to Top: Once everything is loaded, the script scrolls you back to the top so you can see the new table immediately.

# Installation

1. Create a new bookmark in your browser (Chrome, Firefox, Edge, Safari, etc.).
2. Open the bookmark’s “Edit” or “Properties” to change its URL/location.
3. Paste the entire JavaScript snippet (including javascript:) in place of the URL.
4. Name the bookmark something like: “TableFlowy”
5. Click this bookmark while on a Workflowy page to trigger it.

# Usage

1. Navigate to the Workflowy (or derivative) page that has your outline.
2. Click the bookmark.
3. The script:
    - Automatically scrolls down in intervals, loading new bullets until none remain.
    - Builds a table of bullets that match the special-tag criteria.
    - Inserts the table above your top bullet (one that has projectid and classes project, root, selected).
    - Scrolls back to the top so you see the new table.
4. Interact with the table:
    - Sort columns by clicking a header (toggles asc/desc).
    - Filter with textboxes below headers (per-column) or via the global filter (all columns).
    - Collapse Table if you need to see the original outline.
    - Close Table to remove the table entirely.

# Functions Overview

Below is a brief description of each function in the script:

1. show(message)  
Displays a message either via Workflowy’s built-in toast (WF.showMessage) if available, or via a plain alert().  
Used for quick status updates (e.g., “Scrolling to load all bullets...”, “Done!”).  
  
2. parseSpecialTag(tag)  
Takes a string like #task-todo or #p2.  
If it’s #p<number> (or #P<number>), returns [ "P", "<number>" ].  
If it’s #property-value (any text before a dash, then a dash, then any text), splits on the first dash and returns [property, value].  
Otherwise returns null, meaning it’s not a recognized special tag format.  
  
3. stripTags(str)  
Removes any # tags from a string using a simple regex and trims whitespace.  
Used to display a parent bullet’s text without any Workflowy tags.  
  
4. sortTableByColumn(table, columnIndex, ascending)  
Sorts the rows of table by the text content in the specified columnIndex.  
Performs numeric sort if both values are numeric; otherwise, does a case-insensitive string sort.  
ascending is a boolean that determines ascending/descending order.  
  
5. makeCell(content)  
Creates a <td> element with basic styling (border, padding).  
Appends either a text node (if content is a string) or the element provided.  
  
6. loadAllBullets(doneCallback)  
Scrolls the window to the bottom in intervals, checking if document.body.scrollHeight changes.  
Once it stabilizes (no change for several iterations), it assumes all bullets are loaded.  
Calls doneCallback() (in our snippet, this is buildTable()).  
  
7. buildTable()  
Collects bullets via the selector .innerContentContainer.  
For each bullet, extracts text and tags, grouping “special” tags into property-value pairs.  
Builds a list of bullet data (bulletDataList) plus a set of all unique properties (allProps).  
Creates a new HTML <div> container with:  
Top bar: containing the “Collapse Table” button, “Close Table” button, and a global filter <input>.  
Table: with a <thead> for headers + filter row, plus a <tbody> for bullet rows.  
Inserts that container above the root bullet (found via document.querySelector('div[projectid].project.root.selected')).  
Binds sorting to each header (toggle ascending/descending) and sets up the filter logic for column inputs and global filter.  
Scrolls to the top at the end to show the newly created table.
