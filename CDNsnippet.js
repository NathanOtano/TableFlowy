javascript:(function(){var s=document.createElement('script');s.src='https://nathanotano.github.io/TableFlowy/functions.js';s.onload=function(){if(typeof initWorkflowyTableView==='function'){initWorkflowyTableView();console.log("Bookmarklet: Script loaded and initWorkflowyTableView called.");} else {console.error("Bookmarklet: initWorkflowyTableView function not found.");alert('Failed to initialize Workflowy Table View. Function not found.');}};s.onerror=function(){console.error("Bookmarklet: Failed to load the Workflowy Table View script.");alert('Failed to load the Workflowy Table View script. Please check the GitHub Pages URL.');};document.head.appendChild(s);})();
