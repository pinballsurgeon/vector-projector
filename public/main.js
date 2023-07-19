//CLIENT
import {updateSidebar, initializeModels, initializeModelParams, initializePrompts, appendLog} from './sidebar.js';
import { differentiatingTopicsGenerator } from './attributeGenerator.js';
import { listPerpetuator } from './listPerpetuator.js';
import { generateRatings, generateRange } from './ratingGenerator.js';


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
    initializeModelParams();            // Fetch model parameters on page load
    initializePrompts();                // Fetch prompts on page load

});

// TOPIC HANDLER
document.getElementById('askButton').addEventListener('click', async () => {
    const rootList = await listPerpetuator();
});

// DIFFERENTIATING ATTRIBUTES
document.getElementById('listButton').addEventListener('click', differentiatingTopicsGenerator);

// Event listener for 'vectorizeButton'
document.getElementById('vectorizeButton').addEventListener('click', async () => {
    const ratings = await generateRatings();

    // Display the ratings in 'llmRatings' div
    document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);

    // Show the 'PCA' button
    document.getElementById('pcaButton').style.display = 'block';
});


// Event listener for 'PCA' button
document.getElementById('pcaButton').addEventListener('click', async () => {
    // Get the ratings from 'llmRatings' div
    let ratings = JSON.parse(document.getElementById('llmRatings').innerText);

    appendLog(`PCA json - ${JSON.stringify(ratings)}`);

    // Send ratings data to server for PCA
    const response = await fetch('/performPCA', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(ratings)
    });

    const pcaResult = await response.json();

    // Replace the content in 'llmRatings' div with the PCA result
    document.getElementById('llmRatings').innerText = JSON.stringify(pcaResult, null, 2);

});

