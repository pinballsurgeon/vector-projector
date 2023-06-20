//CLIENT
import {updateSidebar, appendLog, appendModelSelection, getSelectedModel, initializeModels} from './sidebar.js';
import {getPrompt, listPerpetuator} from './sequence.js';

d3.select("#my_dataviz")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500)
  .append("circle")
  .attr("cx", 250)
  .attr("cy", 250)
  .attr("r", 50)
  .attr("fill", "blue");

  // SIDE BAR HANDLER
  document.addEventListener("DOMContentLoaded", function(){
    const sidebarSelector = document.getElementById("sidebarSelector");
    const toggleSidebarButton = document.getElementById("toggleSidebarButton");
    const sidebar = document.getElementById("sidebar");

    sidebarSelector.addEventListener("change", updateSidebar);

    toggleSidebarButton.addEventListener("click", function() {
        sidebar.classList.toggle("open");
    });

    updateSidebar();                    // Update sidebar on page load
    initializeModels();                 // Fetch models on page load
});

// TOPIC HANDLER
document.getElementById('askButton').addEventListener('click', async () => {
    const rootList = await listPerpetuator();
});
