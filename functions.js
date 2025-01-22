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
        const cleanTag = tag.replace(/^#/, "");
        if (/^[pP]\d+$/.test(cleanTag)) {
            return ["P", cleanTag.replace(/^[pP]/, "")];
        }
        if (/^[^-\s]+-[^-\s]+$/.test(cleanTag)) {
            const parts = cleanTag.split("-");
            return [parts[0], parts.slice(1).join("-")];
        }
        return null;
    }

    /**
     * Removes all tags from a text string.
     * @param {string} text - The text containing tags.
     * @returns {string} - The text without tags.
     */
    function getTextWithoutTags(text) {
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
        const tableName = getTextWithoutTags(selectedBullet.querySelector(".innerContentContainer").textContent.trim());
        console.log("Table Name:", tableName);

        // Select all bullets
        const bullets = document.querySelectorAll(".innerContentContainer");
        const tableData = [];
        const propertiesSet = new Set();

        if (!bullets.length) {
            showMessage("No bullets found!");
            return;
        }

        // Process each bullet to extract relevant data
        bullets.forEach(bullet => {
            const clone = bullet.cloneNode(true);
            // Remove elements that should not be processed
            clone.querySelectorAll("time.monolith-pill, span.contentTag[data-val^='@']").forEach(el => el.remove());

            // Extract text and tags
            let text = clone.textContent.trim();
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
                    propertiesSet.add(parsed[0]);
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
                    parentName = getTextWithoutTags(parent.textContent.trim());
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
            const dateEl = bullet.querySelector("time.monolith-pill");
            const date = dateEl ? dateEl.textContent.trim() : "";

            // Extract mentions
            const mentions = Array.from(bullet.querySelectorAll('span.contentTag[data-val^="@"]')).map(el => el.textContent.trim()).join(", ");

            // Extract backlinks
            const backlinks = Array.from(bullet.querySelectorAll("a.contentLink")).map(link => {
                return { text: link.textContent.trim(), url: link.getAttribute("href") || "" };
            });

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
        const headers = ["Parent", "Bullet", "Tags", "Date", "@s", "Backlinks"];
        const propertyHeaders = Array.from(propertiesSet);
        const allHeaders = headers.concat(propertyHeaders);

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
                const tagEl = createFilterElement(tag, `#${tag}`, 2); // 'Tags' column index
                tagsDiv.appendChild(tagEl);
            });
            tr.appendChild(createTableCell(tagsDiv));

            // Date
            const dateDiv = document.createElement("div");
            if (rowData.date) {
                const dateEl = createDateElement(rowData.date);
                dateDiv.appendChild(dateEl);
            }
            tr.appendChild(createTableCell(dateDiv));

            // Mentions
            const mentionsDiv = document.createElement("div");
            rowData.mentions.split(", ").forEach(mention => {
                const mentionEl = createFilterElement(mention, `@${mention}`, 4); // '@s' column index
                mentionsDiv.appendChild(mentionEl);
            });
            tr.appendChild(createTableCell(mentionsDiv));

            // Backlinks
            const backlinksDiv = document.createElement("div");
            rowData.backlinks.forEach(link => {
                const linkEl = document.createElement("a");
                linkEl.href = link.url;
                linkEl.textContent = link.text;
                linkEl.style.display = "block";
                linkEl.style.margin = "2px 0";
                linkEl.style.color = "blue";
                linkEl.style.textDecoration = "underline";
                backlinksDiv.appendChild(linkEl);
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
        allHeaders.forEach((header, idx) => {
            let hasData = tableData.some(row => {
                // Check both header data and properties
                return row[header.toLowerCase()] || row.properties[header];
            });
            if (!hasData) {
                if (headerRow.children[idx]) {
                    headerRow.children[idx].style.display = "none";
                }
                if (filterRow.children[idx]) {
                    filterRow.children[idx].style.display = "none";
                }
                tbody.querySelectorAll("tr").forEach(tr => {
                    if (tr.children[idx]) {
                        tr.children[idx].style.display = "none";
                    }
                });
            }
        });

        // Append container to the top of the page
        document.body.insertBefore(container, document.body.firstChild);

        // Sorting functionality
        headerRow.querySelectorAll("th").forEach((th, idx) => {
            let ascending = true;
            th.onclick = function() {
                const rows = Array.from(tbody.querySelectorAll("tr"));
                rows.sort((a, b) => {
                    const aText = a.children[idx].textContent.trim().toLowerCase();
                    const bText = b.children[idx].textContent.trim().toLowerCase();
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

        // Filtering functionality
        function applyFilters() {
            const filterText = globalFilter.value.trim().toLowerCase();
            tableData.forEach((row, rowIdx) => {
                const tr = tbody.children[rowIdx];
                let show = true;
                if (filterText) {
                    let includes = false;
                    let excludes = false;
                    filterText.split(",").forEach(term => {
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
                    if (excludes || (!includes && filterText !== "")) {
                        show = false;
                    }
                }
                // Per-column filters
                filterInputs.forEach((input, idx) => {
                    const val = input.value.trim().toLowerCase();
                    if (val) {
                        let includes = false;
                        let excludes = false;
                        val.split(",").forEach(term => {
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
                        if (excludes || (!includes && val !== "")) {
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

    /**
     * Initializes the bookmarklet by injecting the table button.
     */
    function initializeBookmarklet() {
        injectTableButton();
    }

    // Automatically inject the table button when the script loads
    (function(){
        initializeBookmarklet();
    })();

    // Expose the initialization function globally (optional)
    window.initWorkflowyTableView = initializeBookmarklet;

})();
