import { updateSidebar, initializeModels, initializeModelParams, initializePrompts, appendLog } from './sidebar.js';
import { updateSpheres } from './sphereManager.js';
import { listPerpetuator } from './listPerpetuator.js';
import { generateRatings } from './ratingGenerator.js';
import { createOrUpdateCube } from './cubeManager.js';

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

// // TOPIC HANDLER
// document.getElementById('askButton').addEventListener('click', async () => {
//   const rootList = await listPerpetuator();
// });

// TOPIC HANDLER
document.getElementById('askButton').addEventListener('click', async () => {
  const userInputValue = document.getElementById('userInput').value;

  // Check if the query has been run before
  const response = await fetch(`/check_query/${userInputValue}`);
  const data = await response.json();


  appendLog(`Fethced history: ${data}`);
  // if (data.exists && data.pcaResult) {
    if (data.exists) {
      // Query exists, use saved PCA results
      createOrUpdateCube(data.pcaResult);
  } else {
      // Query does not exist, proceed with generating new results
      const rootList = await listPerpetuator();
  }
});

// DIFFERENTIATING ATTRIBUTES
// document.getElementById('listButton').addEventListener('click', differentiatingTopicsGenerator);

// Event listener for 'vectorizeButton'
document.getElementById('vectorizeButton').addEventListener('click', async () => {
    const ratings = await generateRatings(createOrUpdateCube); // changed this line
  
    // Display the ratings in 'llmRatings' div
    // document.getElementById('llmRatings').innerText = JSON.stringify(ratings, null, 2);
});

// Assuming svg is your d3.js canvas
let svg = d3.select("#my_dataviz").append("svg");

// Function to resize the canvas
function resize() {
    let width = document.getElementById('canvas-container').offsetWidth - 40;  // subtracting padding
    let height = (window.innerHeight * 0.75) - 40;  // 75% of the view height, subtracting padding
    svg.attr("width", width)
        .attr("height", height);
}

// Call the resize function on window resize
window.addEventListener('resize', resize);

// Initial call to set up the canvas size properly
resize();

document.getElementById('sphereThreshold').addEventListener('input', function(event) {
  const thresholdValue = parseFloat(event.target.value);
  document.getElementById('thresholdValue').textContent = thresholdValue.toFixed(1); // Update the display value

  // Call the function to update the spheres with the new threshold
  // This function should be in your sphereManager.js or wherever you handle the sphere creation
  updateSpheres(thresholdValue);
});

