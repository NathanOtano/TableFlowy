// functions.js

(function(){
    /**
     * Displays a message using Workflowy's messaging system or falls back to alert.
     * @param {string} msg - The message to display.
     */
    function showMessage(msg){
        if(typeof WF !== "undefined" && WF.showMessage){
            WF.showMessage(msg);
            setTimeout(WF.hideMessage, 2000);
        } else {
            alert(msg);
        }
    }

    /**
     * Parses a tag to extract property and value.
     * @param {string} tag - The tag string to parse.
     * @returns {Array|null} - An array with property and value or null if not a property tag.
     */
    function parseTag(tag){
        let cleanTag = tag.replace(/^#/,"");
        if(/^[pP]\d+$/.test(cleanTag)){
            return ["P", cleanTag.replace(/^[pP]/,"")];
        }
        if(/^[^-\s]+-[^-\s]+$/.test(cleanTag)){
            let parts = cleanTag.split("-");
            return [parts[0], parts.slice(1).join("-")];
        }
        return null;
    }

    /**
     * Removes all tags from a text string.
     * @param {string} text - The text containing tags.
     * @returns {string} - The text without tags.
     */
    function getTextWithoutTags(text){
        return text.replace(/#[^\s]+/g,"").trim();
    }

    /**
     * Creates a table cell (`<td>`) with specified content.
     * @param {string|HTMLElement} content - The content to insert into the cell.
     * @returns {HTMLElement} - The created `<td>` element.
     */
    function createTableCell(content){
        let td = document.createElement("td");
        td.style.border = "1px solid #ccc";
        td.style.padding = "6px";
        if(typeof content === "string"){
            content = document.createTextNode(content);
        }
        td.appendChild(content);
        return td;
    }

    /**
     * Automatically scrolls to the bottom of the page to load all bullets.
     * @param {Function} callback - The function to call after scrolling is complete.
     */
    function autoScroll(callback){
        let lastHeight = 0;
        let attempts = 0;
        window.scrollTo(0, document.body.scrollHeight);
        let interval = setInterval(()=>{
            window.scrollTo(0, document.body.scrollHeight);
            let currentHeight = document.body.scrollHeight;
            if(currentHeight === lastHeight){
                attempts++;
                if(attempts >=3){
                    clearInterval(interval);
                    callback();
                }
            } else {
                attempts = 0;
                lastHeight = currentHeight;
            }
        },800);
    }

    /**
     * Creates a clickable filter element (tag or mention) that updates the corresponding filter input.
     * @param {string} text - The display text of the tag/mention.
     * @param {string} fullText - The full text to be added to the filter (including `#` or `@`).
     * @param {number} columnIndex - The index of the filter input to update.
     * @returns {HTMLElement} - The created clickable span element.
     */
    function createFilterElement(text, fullText, columnIndex){
        let span = document.createElement("span");
        span.className = "contentTag explosive";
        span.title = `Filter ${fullText}`;
        span.dataset.val = fullText;
        span.style.color = "#666";
        span.style.textDecoration = "underline";
        span.style.cursor = "pointer";
        span.style.margin = "2px 4px 2px 0";

        let textSpan = document.createElement("span");
        textSpan.className = "contentTagText";
        textSpan.textContent = text.replace(/^[@#]/,"");

        let nub = document.createElement("span");
        nub.className = "contentTagNub";

        span.appendChild(textSpan);
        span.appendChild(nub);

        // Click event to add to filter
        span.addEventListener("click", function(event){
            let input = filterInputs[columnIndex];
            if(input){
                let current = input.value.trim();
                let term = event.ctrlKey ? `!${fullText}` : `${fullText}`;
                if(current){
                    input.value = `${current}, ${term}`;
                } else {
                    input.value = term;
                }
                input.dispatchEvent(new Event("input", {bubbles: true}));
            }
        }, false);

        return span;
    }

    /**
     * Creates a clickable date element that updates the global filter input.
     * @param {string} dateText - The date text to display and filter by.
     * @returns {HTMLElement} - The created `<time>` element.
     */
    function createDateElement(dateText){
        let time = document.createElement("time");
        time.className = "monolith-pill";
        time.textContent = dateText;
        time.style.color = "#666";
        time.style.cursor = "pointer";

        let filterTerm = dateText.match(/\d{4}-\d{2}-\d{2}/) ? `date:${dateText}` : dateText;
        time.addEventListener("click", function(){
            let input = document.querySelector(".searchBox > input");
            if(input){
                let current = input.value.trim();
                if(current){
                    input.value = `${current}, ${filterTerm}`;
                } else {
                    input.value = filterTerm;
                }
                input.dispatchEvent(new Event("input", {bubbles: true}));
            }
        }, false);
        return time;
    }

    /**
     * Builds the interactive table by scanning Workflowy's bullets.
     */
    function buildTable(){
        // Select the currently selected root bullet
        let selectedBullet = document.querySelector("div[projectid].project.root.selected");
        if(!selectedBullet){
            showMessage("No root bullet found!");
            return;
        }

        // Extract the table name from the selected bullet
        let tableName = getTextWithoutTags(selectedBullet.querySelector(".innerContentContainer").textContent.trim());

        // Select all bullets
        let bullets = document.querySelectorAll(".innerContentContainer");
        let tableData = [];
        let propertiesSet = new Set();

        if(!bullets.length){
            showMessage("No bullets found!");
            return;
        }

        // Process each bullet to extract relevant data
        bullets.forEach(bullet=>{
            let clone = bullet.cloneNode(true);
            // Remove elements that should not be processed
            clone.querySelectorAll("time.monolith-pill, span.contentTag[data-val^='@']").forEach(el=>el.remove());

            // Extract text and tags
            let text = clone.textContent.trim();
            let tags = text.match(/#[^\s]+/g) || [];
            tags.forEach(tag=>{
                text = text.replace(tag,"").trim();
            });
            let bulletText = text || "(no text)";
            let bulletContent = bullet.textContent.trim();
            let bulletTags = bulletContent.match(/#[^\s]+/g) || [];
            let parsedTags = bulletTags.filter(tag=>parseTag(tag));

            if(!parsedTags.length) return;

            let properties = {};
            let unformattedTags = [];

            bulletTags.forEach(tag=>{
                let parsed = parseTag(tag);
                if(parsed){
                    properties[parsed[0]] = parsed[1];
                    propertiesSet.add(parsed[0]);
                } else {
                    unformattedTags.push(tag);
                }
            });

            // Extract parent information
            let project = bullet.closest(".project");
            let parentName = "(no parent)";
            let parentHref = "";
            if(project){
                let parent = project.querySelector(".name .innerContentContainer");
                if(parent){
                    parentName = getTextWithoutTags(parent.textContent.trim());
                }
                let parentLink = project.querySelector(".name a.bullet");
                if(parentLink){
                    parentHref = parentLink.getAttribute("href") || "";
                }
            }

            // Extract bullet link
            let bulletLink = bullet.querySelector("a.bullet");
            let bulletHref = bulletLink ? bulletLink.getAttribute("href") : "";

            // Extract date
            let dateEl = bullet.querySelector("time.monolith-pill");
            let date = dateEl ? dateEl.textContent.trim() : "";

            // Extract mentions
            let mentions = Array.from(bullet.querySelectorAll('span.contentTag[data-val^="@"]')).map(el=>el.textContent.trim()).join(", ");

            // Extract backlinks
            let backlinks = Array.from(bullet.querySelectorAll("a.contentLink")).map(link=>{
                return {text: link.textContent.trim(), url: link.getAttribute("href") || ""};
            });

            // Push the processed data into tableData array
            tableData.push({
                parentName: parentName,
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

        if(!tableData.length){
            showMessage("No bullets with special tags found!");
            return;
        }

        // Create table container
        let container = document.createElement("div");
        container.className = "customTableContainer";
        container.style.margin = "10px";
        container.style.display = "flex";
        container.style.flexDirection = "column";

        // Create table controls (collapse, refresh, add, etc.)
        let controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "10px";

        // Collapse/Expand button
        let collapseBtn = document.createElement("button");
        collapseBtn.innerHTML = '<i data-lucide="chevrons-down-up" size="16" stroke-width="1"></i>';
        collapseBtn.style.cursor = "pointer";
        collapseBtn.onclick = function(){
            let table = container.querySelector("table");
            if(table){
                table.style.display = table.style.display === "none" ? "" : "none";
            }
        };

        // Refresh button
        let refreshBtn = document.createElement("button");
        refreshBtn.innerHTML = '<i data-lucide="refresh-cw" size="16" stroke-width="1"></i>';
        refreshBtn.style.cursor = "pointer";
        refreshBtn.onclick = function(){
            container.remove();
            autoScroll(buildTable);
        };

        // Add Table button
        let addBtn = document.createElement("button");
        addBtn.innerHTML = '<i data-lucide="plus" size="16" stroke-width="1"></i>';
        addBtn.style.cursor = "pointer";
        addBtn.onclick = function(){
            autoScroll(buildTable);
            document.querySelectorAll(".customTableContainer").forEach(tbl=>{
                tbl.style.display = "flex";
            });
        };

        // Table name display
        let tableNameEl = document.createElement("span");
        tableNameEl.textContent = tableName;
        tableNameEl.style.fontWeight = "bold";
        tableNameEl.style.marginLeft = "10px";

        // Global filter input
        let globalFilter = document.createElement("input");
        globalFilter.placeholder = "Filter ALL columns...";
        globalFilter.style.flex = "1";
        globalFilter.style.padding = "4px";

        // Close button
        let closeBtn = document.createElement("button");
        closeBtn.innerHTML = '<i data-lucide="x" size="16" stroke-width="1"></i>';
        closeBtn.style.cursor = "pointer";
        closeBtn.onclick = function(){
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
        let table = document.createElement("table");
        table.style.width = "100%";
        table.style.borderCollapse = "collapse";
        table.style.fontFamily = "Arial,sans-serif";
        table.style.fontSize = "14px";
        table.style.margin = "20px 0";

        // Create table header
        let thead = document.createElement("thead");
        let headerRow = document.createElement("tr");
        let filterRow = document.createElement("tr");
        let headers = ["Parent","Bullet","Tags","Date","@s","Backlinks"];
        let columnIndexes = Array.from(propertiesSet);
        headers = headers.concat(columnIndexes);

        let filterInputs = [];

        headers.forEach((header, index)=>{
            // Create header cells
            let th = document.createElement("th");
            th.textContent = header;
            th.style.border = "1px solid #ccc";
            th.style.padding = "6px";
            th.style.cursor = "pointer";
            headerRow.appendChild(th);

            // Create filter input cells
            let td = document.createElement("td");
            td.style.border = "1px solid #ccc";
            td.style.padding = "3px";
            let input = document.createElement("input");
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
        let tbody = document.createElement("tbody");

        tableData.forEach(rowData=>{
            let tr = document.createElement("tr");

            // Parent
            let parentLink = document.createElement("a");
            parentLink.href = rowData.parentHref;
            parentLink.textContent = rowData.parentName;
            parentLink.style.color = "blue";
            parentLink.style.textDecoration = "underline";
            tr.appendChild(createTableCell(parentLink));

            // Bullet
            let bulletLink = document.createElement("a");
            bulletLink.href = rowData.bulletHref;
            bulletLink.textContent = rowData.bulletText;
            bulletLink.style.color = "blue";
            bulletLink.style.textDecoration = "underline";
            tr.appendChild(createTableCell(bulletLink));

            // Tags
            let tagsDiv = document.createElement("div");
            rowData.tags.forEach(tag=>{
                let tagEl = createFilterElement(tag, `#${tag}`, 2); // 'Tags' column index
                tagsDiv.appendChild(tagEl);
            });
            tr.appendChild(createTableCell(tagsDiv));

            // Date
            let dateDiv = document.createElement("div");
            if(rowData.date){
                let dateEl = createDateElement(rowData.date);
                dateDiv.appendChild(dateEl);
            }
            tr.appendChild(createTableCell(dateDiv));

            // Mentions
            let mentionsDiv = document.createElement("div");
            rowData.mentions.split(", ").forEach(mention=>{
                let mentionEl = createFilterElement(mention, `@${mention}`, 4); // '@s' column index
                mentionsDiv.appendChild(mentionEl);
            });
            tr.appendChild(createTableCell(mentionsDiv));

            // Backlinks
            let backlinksDiv = document.createElement("div");
            rowData.backlinks.forEach(link=>{
                let linkEl = document.createElement("a");
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
            columnIndexes.forEach((prop, idx)=>{
                let propValue = rowData.properties[prop] || "";
                tr.appendChild(createTableCell(propValue));
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        container.appendChild(table);

        // Hide empty columns
        headers.forEach((header, idx)=>{
            let hasData = tableData.some(row=>row[header.toLowerCase()] || row.properties[header]);
            if(!hasData){
                headerRow.children[idx].style.display = "none";
                filterRow.children[idx].style.display = "none";
                tbody.querySelectorAll("tr").forEach(tr=>{ tr.children[idx].style.display = "none"; });
            }
        });

        // Append table to container
        container.appendChild(table);

        // Append container to the top of the page
        document.body.insertBefore(container, document.body.firstChild);

        // Sorting functionality
        headerRow.querySelectorAll("th").forEach((th, idx)=>{
            let asc = true;
            th.onclick = function(){
                let rows = Array.from(tbody.querySelectorAll("tr"));
                rows.sort((a,b)=>{
                    let aText = a.children[idx].textContent.trim().toLowerCase();
                    let bText = b.children[idx].textContent.trim().toLowerCase();
                    let aNum = parseFloat(aText);
                    let bNum = parseFloat(bText);
                    if(!isNaN(aNum) && !isNaN(bNum)){
                        return asc ? aNum - bNum : bNum - aNum;
                    }
                    return asc ? aText.localeCompare(bText) : bText.localeCompare(aText);
                });
                rows.forEach(row=>tbody.appendChild(row));
                asc = !asc;
            };
        });

        // Filtering functionality
        function applyFilters(){
            let filterText = globalFilter.value.trim().toLowerCase();
            tableData.forEach((row, rowIdx)=>{
                let tr = tbody.children[rowIdx];
                let show = true;
                if(filterText){
                    let includes = false;
                    let excludes = false;
                    filterText.split(",").forEach(term=>{
                        term = term.trim();
                        if(term.startsWith("!")){
                            if(tr.textContent.toLowerCase().includes(term.slice(1))){
                                excludes = true;
                            }
                        } else {
                            if(tr.textContent.toLowerCase().includes(term)){
                                includes = true;
                            }
                        }
                    });
                    if(excludes || (!includes && filterText !== "")){
                        show = false;
                    }
                }
                // Per-column filters
                filterInputs.forEach((input, idx)=>{
                    let val = input.value.trim().toLowerCase();
                    if(val){
                        let includes = false;
                        let excludes = false;
                        val.split(",").forEach(term=>{
                            term = term.trim();
                            if(term.startsWith("!")){
                                if(tr.children[idx].textContent.toLowerCase().includes(term.slice(1))){
                                    excludes = true;
                                }
                            } else {
                                if(tr.children[idx].textContent.toLowerCase().includes(term)){
                                    includes = true;
                                }
                            }
                        });
                        if(excludes || (!includes && val !== "")){
                            show = false;
                        }
                    }
                });
                tr.style.display = show ? "" : "none";
            });
        }

        globalFilter.oninput = applyFilters;
        filterInputs.forEach(input=>{ input.oninput = applyFilters; });

        // Initialize Lucide Icons
        if(window.lucide){
            lucide.createIcons();
        } else {
            let script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js";
            script.onload = function(){
                if(window.lucide){
                    lucide.createIcons();
                }
            };
            document.head.appendChild(script);
        }

        showMessage("Done! Table built at top.");
        window.scrollTo(0,0);
    }

    /**
     * Injects the table button into Workflowy's interface.
     */
    function injectTableButton(){
        // Remove existing table button if present to prevent duplicates
        let existingButton = document.querySelector(".headerTableButton");
        if(existingButton){
            existingButton.remove();
        }

        // Find the share button to position the table button next to it
        let shareButton = document.querySelector('.headerShareButton._3hmsj.iconButton.lg.shape-circle[data-handbook="sharing.share"]');
        if(!shareButton){
            showMessage("Share button not found - cannot insert table icon.");
            return;
        }

        // Create the table button
        let tableBtn = document.createElement("div");
        tableBtn.className = "headerTableButton _3hmsj iconButton lg shape-circle";
        tableBtn.style.cursor = "pointer";
        tableBtn.innerHTML = '<i data-lucide="table-properties" size="16" stroke-width="1"></i>';

        // Click event to toggle table visibility or create a new table
        tableBtn.onclick = function(){
            let tables = document.querySelectorAll(".customTableContainer");
            if(tables.length > 0){
                // Toggle visibility of all tables
                tables.forEach(tbl=>{
                    tbl.style.display = tbl.style.display === "none" ? "flex" : "none";
                });
                showMessage(tables[0].style.display !== "none" ? "All tables shown" : "All tables hidden");
            } else {
                // If no tables, build one
                autoScroll(buildTable);
            }
        };

        // Append the table button next to the share button
        shareButton.parentNode.insertBefore(tableBtn, shareButton);

        // Initialize Lucide Icons if not already present
        if(window.lucide){
            lucide.createIcons();
        } else {
            let script = document.createElement("script");
            script.src = "https://cdn.jsdelivr.net/npm/lucide@latest/dist/umd/lucide.js";
            script.onload = function(){
                if(window.lucide){
                    lucide.createIcons();
                }
            };
            document.head.appendChild(script);
        }
    }

    /**
     * Initializes the bookmarklet by injecting the table button.
     */
    function initializeBookmarklet(){
        injectTableButton();
    }

    // Automatically inject the table button when the script loads
    (function(){
        initializeBookmarklet();
    })();

    // Expose the initialization function globally (optional)
    window.initWorkflowyTableView = initializeBookmarklet;

})();
