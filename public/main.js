import { getModelAndParams, updateSidebar, initializeModels, initializeModelParams, initializePrompts, appendLog } from './sidebar.js';
import { updateSpheres } from './sphereManager.js';
import { listPerpetuator } from './listPerpetuator.js';
import { createOrUpdateCube, updateVectorMetricsContent } from './cubeManager.js';
// import { updateVectorMetricsContent } from './ratingGenerator.js'; // Import the function

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
document.getElementById('askButton').addEventListener('click', async () => {
  const userInputValue = document.getElementById('userInput').value;
  const { model } = getModelAndParams();

  const queryParams = new URLSearchParams({ userInputValue, model }).toString();
  appendLog(`Fetch history payload: ${queryParams}`);

  const response = await fetch(`/check_query?${queryParams}`);
  const data = await response.json();

  appendLog(`Fethced history response: ${JSON.stringify(data)}`);
  // if (data.exists && data.pcaResult) {
  if (data.exists) {
      // Query exists, use saved PCA results
      await createOrUpdateCube(data.pcaResult);
      updateVectorMetricsContent();
  } else {
      // Query does not exist, proceed with generating new results
      const rootList = await listPerpetuator();
  }
});


// Assuming svg is your d3.js canvas
let svg = d3.select("#my_dataviz").append("svg");

// Function to resize the canvas
function resize() {
    let width = document.getElementById('canvas-container').offsetWidth - 40;  // subtracting padding
    let height = (window.innerHeight * 0.75) - 40;  // 75% of the view height, subtracting padding
    if (width < 0){
      width = 0;
    };
    svg.attr("width", width)
        .attr("height", height);
}

// Call the resize function on window resize
window.addEventListener('resize', resize);

// Initial call to set up the canvas size properly
resize();

// Event listener for the sliders
document.getElementById('sphereThreshold').addEventListener('input', function() {
  const thresholdValue = parseFloat(this.value);
  const minCubesValue = parseInt(document.getElementById('minCubesSlider').value);
  const overlapValue = parseFloat(document.getElementById('overlapSlider').value);
  
  updateSpheres(thresholdValue, minCubesValue, overlapValue);
});

document.getElementById('minCubesSlider').addEventListener('input', function() {
  const thresholdValue = parseFloat(document.getElementById('sphereThreshold').value);
  const minCubesValue = parseInt(this.value);
  const overlapValue = parseFloat(document.getElementById('overlapSlider').value);
  
  updateSpheres(thresholdValue, minCubesValue, overlapValue);
});

document.getElementById('overlapSlider').addEventListener('input', function() {
  const thresholdValue = parseFloat(document.getElementById('sphereThreshold').value);
  const minCubesValue = parseInt(document.getElementById('minCubesSlider').value);
  const overlapValue = parseFloat(this.value);
  
  updateSpheres(thresholdValue, minCubesValue, overlapValue);
});


async function openModelTab(evt, modelName) {
    // Declare all variables
    let i, tabcontent, tablinks;

    // Get all elements with class="tabcontent" and hide them
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // Show the current tab, and add an "active" class to the button that opened the tab
    document.getElementById(modelName).style.display = "block";
    evt.currentTarget.className += " active";

    // // Load or update the canvas for the selected model
    // updateCanvasForModel(modelName);

    const userInputValue = document.getElementById('userInput').value;
    const { model } = getModelAndParams();

    const queryParams = new URLSearchParams({ userInputValue, model }).toString();
    appendLog(`Fetch history payload: ${queryParams}`);

    const response = await fetch(`/check_query?${queryParams}`);
    const data = await response.json();

    appendLog(`Fethced history response: ${JSON.stringify(data)}`);
    // if (data.exists && data.pcaResult) {
    if (data.exists) {
        // Query exists, use saved PCA results
        await createOrUpdateCube(data.pcaResult);
        updateVectorMetricsContent();
    } else {
        // Query does not exist, proceed with generating new results
        const rootList = await listPerpetuator();
    }

  }

  document.getElementById('tab-gpt3').addEventListener('click', (event) => openModelTab(event, 'GPT-3'));
  document.getElementById('tab-gpt3-turbo').addEventListener('click', (event) => openModelTab(event, 'GPT-3-Turbo'));
  document.getElementById('tab-gpt4').addEventListener('click', (event) => openModelTab(event, 'GPT-4'));
  