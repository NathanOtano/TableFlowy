// workflowy-table-view.js

(function(){
    function showMessage(msg){
        if(typeof WF !== "undefined" && WF.showMessage){
            WF.showMessage(msg);
            setTimeout(WF.hideMessage,2000);
        } else {
            alert(msg);
        }
    }

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

    function getTextWithoutTags(text){
        return text.replace(/#[^\s]+/g,"").trim();
    }

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

    function buildTable(){
        let selectedBullet = document.querySelector("div[projectid].project.root.selected");
        if(!selectedBullet){
            showMessage("No root bullet found!");
            return;
        }
        let tableName = getTextWithoutTags(selectedBullet.querySelector(".innerContentContainer").textContent.trim());
        let bullets = document.querySelectorAll(".innerContentContainer");
        let tableData = [];
        let propertiesSet = new Set();
        if(!bullets.length){
            showMessage("No bullets found!");
            return;
        }

        bullets.forEach(bullet=>{
            let clone = bullet.cloneNode(true);
            clone.querySelectorAll("time.monolith-pill, span.contentTag[data-val^='@']").forEach(el=>el.remove());
            let text = clone.textContent.trim();
            let tags = text.match(/#[^\s]+/g) || [];
            tags.forEach(tag=>{ text = text.replace(tag,"").trim(); });
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
            let bulletLink = bullet.querySelector("a.bullet");
            let bulletHref = bulletLink ? bulletLink.getAttribute("href") : "";
            let dateEl = bullet.querySelector("time.monolith-pill");
            let date = dateEl ? dateEl.textContent.trim() : "";
            let mentions = Array.from(bullet.querySelectorAll('span.contentTag[data-val^="@"]')).map(el=>el.textContent.trim()).join(", ");
            let backlinks = Array.from(bullet.querySelectorAll("a.contentLink")).map(link=>{
                return {text: link.textContent.trim(), url: link.getAttribute("href") || ""};
            });
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

        // Create table controls
        let controls = document.createElement("div");
        controls.style.display = "flex";
        controls.style.alignItems = "center";
        controls.style.gap = "10px";

        // Collapse button
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

        // Add table button
        let addBtn = document.createElement("button");
        addBtn.innerHTML = '<i data-lucide="plus" size="16" stroke-width="1"></i>';
        addBtn.style.cursor = "pointer";
        addBtn.onclick = function(){
            autoScroll(buildTable);
            document.querySelectorAll(".customTableContainer").forEach(tbl=>{
                tbl.style.display = "flex";
            });
        };

        // Table name
        let tableNameEl = document.createElement("span");
        tableNameEl.textContent = tableName;
        tableNameEl.style.fontWeight = "bold";
        tableNameEl.style.marginLeft = "10px";

        // Global filter
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

        // Append controls
        controls.appendChild(collapseBtn);
        controls.appendChild(refreshBtn);
        controls.appendChild(tableNameEl);
        controls.appendChild(globalFilter);
        controls.appendChild(closeBtn);
        controls.appendChild(addBtn);
        container.appendChild(controls);

        // Create table
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
            let th = document.createElement("th");
            th.textContent = header;
            th.style.border = "1px solid #ccc";
            th.style.padding = "6px";
            th.style.cursor = "pointer";
            headerRow.appendChild(th);

            // Create filter input
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
                let tagEl = createFilterElement(tag, `#${tag}`, 2); // Assuming 'Tags' is at index 2
                tagEl.style.margin = "2px 4px 2px 0";
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
                let mentionEl = createFilterElement(mention, `@${mention}`, 4); // Assuming '@s' is at index 4
                mentionEl.style.margin = "2px 4px 2px 0";
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

        // Append container to page
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
                S.forEach((input, idx)=>{
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
        S.forEach(input=>{ input.oninput = applyFilters; });

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

    function createFilterElement(text, fullText, columnIndex){
        let span = document.createElement("span");
        span.className = "contentTag explosive";
        span.title = `Filter ${fullText}`;
        span.dataset.val = fullText;
        span.style.color = "#666";
        span.style.textDecoration = "underline";

        let textSpan = document.createElement("span");
        textSpan.className = "contentTagText";
        textSpan.textContent = text.replace(/^[@#]/,"");

        let nub = document.createElement("span");
        nub.className = "contentTagNub";

        span.appendChild(textSpan);
        span.appendChild(nub);

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

    function createDateElement(dateText){
        let time = document.createElement("time");
        time.className = "monolith-pill";
        time.textContent = dateText;
        time.style.color = "#666";
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

    // Initialize the script after loading all bullets
    (function(){
        autoScroll(buildTable);
    })();

    // Function to initialize the bookmarklet
    function initBookmarklet(){
        autoScroll(buildTable);
    }

    // Expose init function
    window.initWorkflowyTableView = initBookmarklet;
})();
