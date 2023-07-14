//CLIENT
import {updateSidebar, initializeModels, initializeModelParams, initializePrompts} from './sidebar.js';
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

    
    // param - TEMPERATURE
    document.getElementById('temperature').addEventListener('input', (event) => {
        selectedTemperature = event.target.value;
    });

    // param - TOP P
    document.getElementById('top_p').addEventListener('input', (event) => {
        selectedTopP = event.target.value;
    });

    // param - RETURN SEQUENCES
    document.querySelectorAll('input[name="num_return_sequences"]').forEach((element) => {
        element.addEventListener('change', (event) => {
            selectedNumSequences = event.target.value;
        });
    });

});

// TOPIC HANDLER
document.getElementById('askButton').addEventListener('click', async () => {
    const rootList = await listPerpetuator();
});

// DIFFERENTIATING ATTRIBUTES
document.getElementById('listButton').addEventListener('click', differentiatingTopicsGenerator);

// New event listener for 'vectorizeButton'
document.getElementById('vectorizeButton').addEventListener('click', async () => {
    // const ratings = await generateRatings();
    const ratings = await generateRange();

    // Display the ratings in 'llmRatings' div
    document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);
});