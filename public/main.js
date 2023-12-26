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
  // appendLog(`Fetch history payload: ${queryParams}`);

  const response = await fetch(`/check_query?${queryParams}`);
  const data = await response.json();

  // appendLog(`Fethced history response: ${JSON.stringify(data)}`);
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

    appendLog(`Open Model Tab - Started`);

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

    const userInputValue = document.getElementById('userInput').value;
    if (!userInputValue.trim()) {
        alert('Please enter a query');
        return;
    }

    // Extract the model name from the button ID if necessary
    let model = "";
    switch (modelName) {
        case "tab-text-davinci-003":
            model = "text-davinci-003";
            break;
        case "tab-gpt-3.5-turbo":
            model = "gpt-3.5-turbo";
            break;
        case "tab-gpt-4":
            model = "gpt-4";
            break;
        case "tab-gpt-4-1106-preview":
            model = "gpt-4-1106-preview";
            break;
        // Add cases for other models
    }

    const queryParams = new URLSearchParams({ userInputValue, model }).toString();
    // appendLog(`Fetch history payload: ${queryParams}`);

    try {
        const response = await fetch(`/check_query?${queryParams}`);
        const data = await response.json();

        // appendLog(`Fetched history response: ${JSON.stringify(data)}`);
        if (data.exists) {
            // Query exists, use saved PCA results
            await createOrUpdateCube(data.pcaResult);
            updateVectorMetricsContent();
        } else {
            const rootList = await listPerpetuator();
        }
    } catch (error) {
        appendLog(`Error: ${error}`);
    }
}

// Visually select the 'gpt-3.5-turbo' tab when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const gpt35TurboTab = document.getElementById("tab-gpt-3.5-turbo");
  if (gpt35TurboTab) {
    gpt35TurboTab.className += " active";
  }
});

document.getElementById('tab-text-davinci-003').addEventListener('click', (event) => openModelTab(event, 'tab-text-davinci-003'));
document.getElementById('tab-gpt-3.5-turbo').addEventListener('click', (event) => openModelTab(event, 'tab-gpt-3.5-turbo'));
document.getElementById('tab-gpt-4').addEventListener('click', (event) => openModelTab(event, 'tab-gpt-4'));
document.getElementById('tab-gpt-4-1106-preview').addEventListener('click', (event) => openModelTab(event, 'tab-gpt-4-1106-preview'));