// functions.js

(function() {
    /**
     * Displays a message using Workflowy's messaging system or falls back to alert.
     * @param {string} message - The message to display.
     */
    function showMessage(message) {
        if (typeof WF !== "undefined" && WF.showMessage) {
            WF.showMessage(message);
            setTimeout(WF.hideMessage, 2000);
        } else {
            alert(message);
        }
    }

    /**
     * Parses a tag to extract property and value.
     * @param {string} tag - The tag string to parse.
     * @returns {Array|null} - An array with property and value or null if not a property tag.
     */
    function parseTag(tag) {
        const cleanedTag = tag.replace(/^#/, "");
        if (/^[pP]\d+$/.test(cleanedTag)) {
            return ["P", cleanedTag.replace(/^[pP]/, "")];
        }
        if (/^[^-\s]+-[^-\s]+$/.test(cleanedTag)) {
            const parts = cleanedTag.split("-");
            return [parts[0], parts.slice(1).join("-")];
        }
        return null;
    }

    /**
     * Removes all tags from a text string.
     * @param {string} text - The text containing tags.
     * @returns {string} - The text without tags.
     */
    function removeTags(text) {
        return text.replace(/#[^\s]+/g, "").trim();
    }

    /**
     * Creates a table cell (`<td>`) with specified content.
     * @param {string|HTMLElement} content - The content to insert into the cell.
     * @returns {HTMLElement} - The created `<td>` element.
     */
    function createTableCell(content) {
        const td = document.createElement("td");
        td.style.border = "1px solid #ccc";
        td.style.padding = "6px";
        if (typeof content === "string") {
            content = document.createTextNode(content);
        }
        td.appendChild(content);
        return td;
    }

    /**
     * Automatically scrolls to the bottom of the page to load all bullets.
     * @param {Function} callback - The function to call after scrolling is complete.
     */
    function autoScroll(callback) {
        let lastHeight = 0;
        let attempts = 0;
        window.scrollTo(0, document.body.scrollHeight);
        const interval = setInterval(() => {
            window.scrollTo(0, document.body.scrollHeight);
            const currentHeight = document.body.scrollHeight;
            if (currentHeight === lastHeight) {
                attempts++;
                if (attempts >= 3) {
                    clearInterval(interval);
                    callback();
                }
            } else {
                attempts = 0;
                lastHeight = currentHeight;
            }
        }, 800);
    }

    /**
     * Builds the interactive table by scanning Workflowy's bullets.
     */
    function buildTable() {
        showMessage("Starting to build the table.");

        // Select the currently selected root bullet
        const selectedBullet = document.querySelector("div[projectid].project.root.selected");
        if (!selectedBullet) {
            showMessage("No root bullet found!");
            return;
        }

        // Extract the table name from the selected bullet
        const tableName = removeTags(selectedBullet.querySelector(".innerContentContainer").textContent.trim());
        console.log("Table Name:", tableName);

        // Select all bullets
        const bullets = document.querySelectorAll(".innerContentContainer");
        const tableData = [];
        const propertySet = new Set();

        if (!bullets.length) {
            showMessage("No bullets found!");
            return;
        }

        // Process each bullet to extract relevant data
        bullets.forEach(bullet => {
            const clonedBullet = bullet.cloneNode(true);
            // Remove elements that should not be processed
            clonedBullet.querySelectorAll("time.monolith-pill, span.contentTag[data-val^='@']").forEach(el => el.remove());

            // Extract text and tags
            let text = clonedBullet.textContent.trim();
            const tags = text.match(/#[^\s]+/g) || [];
            tags.forEach(tag => {
                text = text.replace(tag, "").trim();
            });
            const bulletText = text || "(no text)";
            const bulletContent = bullet.textContent.trim();
            const bulletTags = bulletContent.match(/#[^\s]+/g) || [];
            const parsedTags = bulletTags.filter(tag => parseTag(tag));

            if (!parsedTags.length) return;

            const properties = {};
            const unformattedTags = [];

            bulletTags.forEach(tag => {
                const parsed = parseTag(tag);
                if (parsed) {
                    properties[parsed[0]] = parsed[1];
                    propertySet.add(parsed[0]);
                } else {
                    unformattedTags.push(tag);
                }
            });

            // Extract parent information
            const project = bullet.closest(".project");
            let parentName = "(no parent)";
            let parentHref = "";
            if (project) {
                const parent = project.querySelector(".name .innerContentContainer");
                if (parent) {
                    parentName = removeTags(parent.textContent.trim());
                }
                const parentLink = project.querySelector(".name a.bullet");
                if (parentLink) {
                    parentHref = parentLink.getAttribute("href") || "";
                }
            }

            // Extract bullet link
            const bulletLink = bullet.querySelector("a.bullet");
            const bulletHref = bulletLink ? bulletLink.getAttribute("href") : "";

            // Extract date
            const dateElement = bullet.querySelector("time.monolith-pill");
            const date = dateElement ? dateElement.textContent.trim() : "";

            // Extract mentions
            const mentionsElements = bullet.querySelectorAll('span.contentTag[data-val^="@"]');
            const mentions = Array.from(mentionsElements).map(el => el.textContent.trim()).join(", ");

            // Extract backlinks
            const backlinksElements = bullet.querySelectorAll("a.contentLink");
            const backlinks = Array.from(backlinksElements).map(link => ({
                text: link.textContent.trim(),
                url: link.getAttribute("href") || ""
            }));

            // Push the processed data into tableData array
            tableData.push({
                parentName: parentName || "(no parent)",
                parentHref: parentHref,
                bulletText: bulletText,
                bulletHref: bulletHref,
                tags: unformattedTags,
                properties: properties,
                date: date,
                mentions: mentions,
                backlinks: backlinks
            });
        });

        console.log("Processed tableData:", tableData);

        if (!tableData.length) {
            showMessage("No bullets with special tags found!");
            return;
        }

        // Create table container
        const container = document.createElement("div");
        container.className = "customTableContainer";
        container.style.margin = "10px";
        container.style.display = "flex";
        container.style.flexDirection = "column";

        // Create table controls (collapse, refresh, add, etc.)
        const controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "10px";

        // Collapse/Expand button
        const collapseBtn = document.createElement("button");
        collapseBtn.innerHTML = '<i data-lucide="chevrons-down-up" size="16" stroke-width="1"></i>';
        collapseBtn.style.cursor = "pointer";
        collapseBtn.onclick = function() {
            const table = container.querySelector("table");
            if (table) {
                table.style.display = table.style.display === "none" ? "" : "none";
            }
        };

        // Refresh button
        const refreshBtn = document.createElement("button");
        refreshBtn.innerHTML = '<i data-lucide="refresh-cw" size="16" stroke-width="1"></i>';
        refreshBtn.style.cursor = "pointer";
        refreshBtn.onclick = function() {
            container.remove();
            autoScroll(buildTable);
        };

        // Add Table button
        const addBtn = document.createElement("button");
        addBtn.innerHTML = '<i data-lucide="plus" size="16" stroke-width="1"></i>';
        addBtn.style.cursor = "pointer";
        addBtn.onclick = function() {
            autoScroll(buildTable);
            document.querySelectorAll(".customTableContainer").forEach(tbl => {
                tbl.style.display = "flex";
            });
        };

        // Table name display
        const tableNameEl = document.createElement("span");
        tableNameEl.textContent = tableName;
        tableNameEl.style.fontWeight = "bold";
        tableNameEl.style.marginLeft = "10px";

        // Global filter input
        const globalFilter = document.createElement("input");
        globalFilter.placeholder = "Filter ALL columns...";
        globalFilter.style.flex = "1";
        globalFilter.style.padding = "4px";

        // Close button
        const closeBtn = document.createElement("button");
        closeBtn.innerHTML = '<i data-lucide="x" size="16" stroke-width="1"></i>';
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = function() {
            container.remove();
        };

        // Append controls to the controls container
        controls.appendChild(collapseBtn);
        controls.appendChild(refreshBtn);
        controls.appendChild(tableNameEl);
        controls.appendChild(globalFilter);
        controls.appendChild(closeBtn);
        controls.appendChild(addBtn);
        container.appendChild(controls);

        // Create the table element
        const table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.fontFamily = "Arial, sans-serif";
        table.style.fontSize = "14px";
        table.style.margin = "20px 0";

        // Create table header
        const thead = document.createElement("thead");
        const headerRow = document.createElement("tr");
        const filterRow = document.createElement("tr");
        const defaultHeaders = ["Parent", "Bullet", "Tags", "Date", "@s", "Backlinks"];
        const propertyHeaders = Array.from(propertySet);
        const allHeaders = defaultHeaders.concat(propertyHeaders);

        const filterInputs = [];

        allHeaders.forEach(header => {
            // Create header cells
            const th = document.createElement("th");
            th.textContent = header;
            th.style.border = "1px solid #ccc";
            th.style.padding = "6px";
            th.style.cursor = "pointer";
            headerRow.appendChild(th);

            // Create filter input cells
            const td = document.createElement("td");
            td.style.border = "1px solid #ccc";
            td.style.padding = "3px";
            const input = document.createElement("input");
            input.style.width = "95%";
            input.placeholder = "Filter...";
            input.style.padding = "2px";
            td.appendChild(input);
            filterRow.appendChild(td);
            filterInputs.push(input);
        });

        thead.appendChild(headerRow);
        thead.appendChild(filterRow);
        table.appendChild(thead);

        // Create table body
        const tbody = document.createElement("tbody");

        tableData.forEach(rowData => {
            const tr = document.createElement("tr");

            // Parent
            const parentLink = document.createElement("a");
            parentLink.href = rowData.parentHref;
            parentLink.textContent = rowData.parentName;
            parentLink.style.color = "blue";
            parentLink.style.textDecoration = "underline";
            tr.appendChild(createTableCell(parentLink));

            // Bullet
            const bulletLink = document.createElement("a");
            bulletLink.href = rowData.bulletHref;
            bulletLink.textContent = rowData.bulletText;
            bulletLink.style.color = "blue";
            bulletLink.style.textDecoration = "underline";
            tr.appendChild(createTableCell(bulletLink));

            // Tags
            const tagsDiv = document.createElement("div");
            rowData.tags.forEach(tag => {
                const tagSpan = document.createElement("span");
                tagSpan.className = "contentTag explosive";
                tagSpan.title = `Filter #${tag}`;
                tagSpan.dataset.val = `#${tag}`;
                tagSpan.style.color = "#666";
                tagSpan.style.textDecoration = "underline";
                tagSpan.style.cursor = "pointer";
                tagSpan.style.margin = "2px 4px 2px 0";

                const textSpan = document.createElement("span");
                textSpan.className = "contentTagText";
                textSpan.textContent = tag;

                const nub = document.createElement("span");
                nub.className = "contentTagNub";

                tagSpan.appendChild(textSpan);
                tagSpan.appendChild(nub);

                // Click event to add to filter
                tagSpan.addEventListener("click", function(event) {
                    const currentFilter = globalFilter.value.trim();
                    const filterTerm = event.ctrlKey ? `!#${tag}` : `#${tag}`;
                    globalFilter.value = currentFilter ? `${currentFilter}, ${filterTerm}` : filterTerm;
                    globalFilter.dispatchEvent(new Event("input", { bubbles: true }));
                }, false);

                tagsDiv.appendChild(tagSpan);
            });
            tr.appendChild(createTableCell(tagsDiv));

            // Date
            const dateDiv = document.createElement("div");
            if (rowData.date) {
                const dateElement = document.createElement("time");
                dateElement.className = "monolith-pill";
                dateElement.textContent = rowData.date;
                dateElement.style.color = "#666";
                dateElement.style.cursor = "pointer";

                // Click event to add date to filter
                dateElement.addEventListener("click", function() {
                    const currentFilter = globalFilter.value.trim();
                    const filterTerm = rowData.date.includes('-') ? `date:${rowData.date}` : rowData.date;
                    globalFilter.value = currentFilter ? `${currentFilter}, ${filterTerm}` : filterTerm;
                    globalFilter.dispatchEvent(new Event("input", { bubbles: true }));
                }, false);

                dateDiv.appendChild(dateElement);
            }
            tr.appendChild(createTableCell(dateDiv));

            // Mentions
            const mentionsDiv = document.createElement("div");
            rowData.mentions.split(", ").forEach(mention => {
                if (mention) {
                    const mentionSpan = document.createElement("span");
                    mentionSpan.className = "contentTag explosive";
                    mentionSpan.title = `Filter @${mention}`;
                    mentionSpan.dataset.val = `@${mention}`;
                    mentionSpan.style.color = "#666";
                    mentionSpan.style.textDecoration = "underline";
                    mentionSpan.style.cursor = "pointer";
                    mentionSpan.style.margin = "2px 4px 2px 0";

                    const textSpan = document.createElement("span");
                    textSpan.className = "contentTagText";
                    textSpan.textContent = mention;

                    const nub = document.createElement("span");
                    nub.className = "contentTagNub";

                    mentionSpan.appendChild(textSpan);
                    mentionSpan.appendChild(nub);

                    // Click event to add to filter
                    mentionSpan.addEventListener("click", function(event) {
                        const currentFilter = globalFilter.value.trim();
                        const filterTerm = event.ctrlKey ? `!@${mention}` : `@${mention}`;
                        globalFilter.value = currentFilter ? `${currentFilter}, ${filterTerm}` : filterTerm;
                        globalFilter.dispatchEvent(new Event("input", { bubbles: true }));
                    }, false);

                    mentionsDiv.appendChild(mentionSpan);
                }
            });
            tr.appendChild(createTableCell(mentionsDiv));

            // Backlinks
            const backlinksDiv = document.createElement("div");
            rowData.backlinks.forEach(link => {
                const linkElement = document.createElement("a");
                linkElement.href = link.url;
                linkElement.textContent = link.text;
                linkElement.style.display = "block";
                linkElement.style.margin = "2px 0";
                linkElement.style.color = "blue";
                linkElement.style.textDecoration = "underline";
                backlinksDiv.appendChild(linkElement);
            });
            tr.appendChild(createTableCell(backlinksDiv));

            // Special Properties
            propertyHeaders.forEach(prop => {
                const propValue = rowData.properties[prop] || "";
                tr.appendChild(createTableCell(propValue));
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        // Hide empty columns
        allHeaders.forEach((header, index) => {
            const hasData = tableData.some(row => row[header.toLowerCase()] || row.properties[header]);
            if (!hasData) {
                if (headerRow.children[index]) {
                    headerRow.children[index].style.display = "none";
                }
                if (filterRow.children[index]) {
                    filterRow.children[index].style.display = "none";
                }
                tbody.querySelectorAll("tr").forEach(tr => {
                    if (tr.children[index]) {
                        tr.children[index].style.display = "none";
                    }
                });
            }
        });

        // Insert the table before the selected bullet
        selectedBullet.parentNode.insertBefore(container, selectedBullet);

        // Sorting functionality
        headerRow.querySelectorAll("th").forEach((th, index) => {
            let ascending = true;
            th.onclick = function() {
                const rows = Array.from(tbody.querySelectorAll("tr"));
                rows.sort((a, b) => {
                    const aText = a.children[index].textContent.trim().toLowerCase();
                    const bText = b.children[index].textContent.trim().toLowerCase();
                    const aNum = parseFloat(aText);
                    const bNum = parseFloat(bText);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return ascending ? aNum - bNum : bNum - aNum;
                    }
                    return ascending ? aText.localeCompare(bText) : bText.localeCompare(aText);
                });
                rows.forEach(row => tbody.appendChild(row));
                ascending = !ascending;
            };
        });

        /**
         * Applies filters to the table based on input values.
         */
        function applyFilters() {
            const globalFilterValue = globalFilter.value.trim().toLowerCase();
            tableData.forEach((row, rowIndex) => {
                const tr = tbody.children[rowIndex];
                let show = true;

                // Global filter
                if (globalFilterValue) {
                    let includes = false;
                    let excludes = false;
                    globalFilterValue.split(",").forEach(term => {
                        term = term.trim();
                        if (term.startsWith("!")) {
                            if (tr.textContent.toLowerCase().includes(term.slice(1))) {
                                excludes = true;
                            }
                        } else {
                            if (tr.textContent.toLowerCase().includes(term)) {
                                includes = true;
                            }
                        }
                    });
                    if (excludes || (!includes && globalFilterValue !== "")) {
                        show = false;
                    }
                }

                // Per-column filters
                filterInputs.forEach((input, idx) => {
                    const filterValue = input.value.trim().toLowerCase();
                    if (filterValue) {
                        let includes = false;
                        let excludes = false;
                        filterValue.split(",").forEach(term => {
                            term = term.trim();
                            if (term.startsWith("!")) {
                                if (tr.children[idx].textContent.toLowerCase().includes(term.slice(1))) {
                                    excludes = true;
                                }
                            } else {
                                if (tr.children[idx].textContent.toLowerCase().includes(term)) {
                                    includes = true;
                                }
                            }
                        });
                        if (excludes || (!includes && filterValue !== "")) {
                            show = false;
                        }
                    }
                });

                tr.style.display = show ? "" : "none";
            });
        }

        globalFilter.oninput = applyFilters;
        filterInputs.forEach(input => { input.oninput = applyFilters; });

        // Initialize Lucide Icons
        if (window.lucide) {
            lucide.createIcons();
        } else {
            const lucideScript = document.createElement("script");
            lucideScript.src = "https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js";
            lucideScript.onload = function() {
                if (window.lucide) {
                    lucide.createIcons();
                }
            };
            lucideScript.onerror = function() {
                console.error("Failed to load Lucide icons.");
            };
            document.head.appendChild(lucideScript);
        }

        showMessage("Done! Table built at top.");
        window.scrollTo(0, 0);
    }

    /**
     * Injects the table button into Workflowy's interface.
     */
    function injectTableButton() {
        // Remove existing table button if present to prevent duplicates
        const existingButton = document.querySelector(".headerTableButton");
        if (existingButton) {
            existingButton.remove();
        }

        // Find the share button to position the table button next to it
        const shareButton = document.querySelector('.headerShareButton._3hmsj.iconButton.lg.shape-circle[data-handbook="sharing.share"]');
        if (!shareButton) {
            showMessage("Share button not found - cannot insert table icon.");
            return;
        }

        // Create the table button
        const tableBtn = document.createElement("div");
        tableBtn.className = "headerTableButton _3hmsj iconButton lg shape-circle";
        tableBtn.style.cursor = "pointer";
        tableBtn.innerHTML = '<i data-lucide="table-properties" size="16" stroke-width="1"></i>';

        // Click event to toggle table visibility or create a new table
        tableBtn.onclick = function() {
            const tables = document.querySelectorAll(".customTableContainer");
            if (tables.length > 0) {
                // Toggle visibility of all tables
                tables.forEach(tbl => {
                    tbl.style.display = tbl.style.display === "none" ? "flex" : "none";
                });
                showMessage(tables[0].style.display !== "none" ? "All tables shown" : "All tables hidden");
            } else {
                // If no tables, build one
                autoScroll(buildTable);
            }
        };

        // Append the table button next to the share button
        shareButton.parentNode.insertBefore(tableBtn, shareButton.nextSibling);

        // Initialize Lucide Icons if not already present
        if (window.lucide) {
            lucide.createIcons();
        } else {
            const lucideScript = document.createElement("script");
            lucideScript.src = "https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js";
            lucideScript.onload = function() {
                if (window.lucide) {
                    lucide.createIcons();
                }
            };
            lucideScript.onerror = function() {
                console.error("Failed to load Lucide icons.");
            };
            document.head.appendChild(lucideScript);
        }
    }

    // Initialize the bookmarklet by injecting the table button after DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        injectTableButton();
    });

    // Expose the initialization function globally (optional)
    window.initWorkflowyTableView = injectTableButton;

})();
