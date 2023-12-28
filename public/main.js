import { getModelAndParams, updateSidebar, initializeModels, initializeModelParams, initializePrompts, appendLog } from './sidebar.js';
import { updateSpheres } from './sphereManager.js';
import { listPerpetuator } from './listPerpetuator.js';
import { createOrUpdateCube, updateVectorMetricsContent, clearCanvas } from './cubeManager.js';
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

    // Hide the compare container and show the canvas container
    document.getElementById('compare-container').style.display = 'none';
    document.getElementById('canvas-container').style.display = 'block';


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

document.getElementById('compareTab').addEventListener('click', compareModels);

async function compareModels() {
    const userInputValue = document.getElementById('userInput').value;
    if (!userInputValue) {
        alert("Please enter a query to compare.");
        return;
    }

    // Hide and clear the canvas
    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.style.display = 'none';
    clearCanvas(); // Make sure this function is imported or accessible

    try {
        const response = await fetch(`/compare_vectors?query=${encodeURIComponent(userInputValue)}`);
        const compareData = await response.json();
        
        // Clear existing data in the compare container
        const compareContainer = document.getElementById('compare-container');
        compareContainer.innerHTML = '';
        compareContainer.style.display = 'flex'; // use flexbox to align items neatly
        compareContainer.classList.add('compare-results-grid'); // add a class for grid styling
        
        // Iterate over models and create a summary for each
        compareData.forEach(modelResult => {
            // Create a container for the model
            const modelDiv = document.createElement('div');
            modelDiv.classList.add('model-result-container', 'model-card'); // added 'model-card' for styling
            
            appendLog(`Model Result - ${JSON.stringify(modelResult)}`);

            // Create a title for the model
            const modelTitle = document.createElement('h3');
            modelTitle.textContent = `Model: ${modelResult.model}`;
            modelDiv.appendChild(modelTitle);

            // Append 3D visualization
            append3DVisualization(modelDiv, modelResult);

            // Create a paragraph for the item count
            const itemCountParagraph = document.createElement('p');
            itemCountParagraph.textContent = `Number of items: ${modelResult.numberOfCubes}`;
            modelDiv.appendChild(itemCountParagraph);

            // Create a paragraph for the average pairwise distance
            const avgDistanceParagraph = document.createElement('p');
            avgDistanceParagraph.textContent = `Average pairwise distance: ${modelResult.pairwiseAvgDistance.toFixed(2)}`;
            modelDiv.appendChild(avgDistanceParagraph);

            // Create a paragraph for the bounding box volume
            const boundingBoxVolumeParagraph = document.createElement('p');
            boundingBoxVolumeParagraph.textContent = `Bounding Box Volume: ${modelResult.boundingBoxVolume.toFixed(2)}`;
            modelDiv.appendChild(boundingBoxVolumeParagraph);

            // Append histogram canvases for pairwise distances and density
            appendHistogramCanvas(modelDiv, modelResult.pairwiseHistogramData, 'Pairwise Distances');
            appendHistogramCanvas(modelDiv, modelResult.densityHistogramData, 'Density of Neighbors');

            // Append the model container to the compare container
            compareContainer.appendChild(modelDiv);
        });
    } catch (error) {
        console.error(`Error during comparison: ${error}`);
    }
}

 function appendHistogramCanvas(modelDiv, histogramData, chartLabel) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  modelDiv.appendChild(canvas);

  // Prepare histogram data for chart
  const { bins, binEdges } = histogramData;
  const histogramLabels = binEdges.map((edge, index) => {
      if (index === bins.length) return;
      return `${edge.toFixed(2)}-${binEdges[index + 1].toFixed(2)}`;
  }).slice(0, -1);

  new Chart(ctx, {
      type: 'bar',
      data: {
          labels: histogramLabels,
          datasets: [{
              label: chartLabel,
              data: bins,
              backgroundColor: 'rgba(54, 162, 235, 0.5)',
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 1
          }]
      },
      options: {
          scales: {
              y: {
                  beginAtZero: true,
                  ticks: {
                      stepSize: 1 // Ensure that density is always a whole number
                  }
              }
          }
      }
  });
}

// main.js

function append3DVisualization(modelDiv, modelResult) {
  const vizContainer = document.createElement('div');
  vizContainer.classList.add('model-viz-container');
  modelDiv.appendChild(vizContainer);

  // Set up the scene, camera, and renderer
  const width = vizContainer.offsetWidth;
  const height = 300; // Set a fixed height or make it responsive
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  vizContainer.appendChild(renderer.domElement);

  // Add lights to the scene
  const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
  scene.add(directionalLight);

  // Create a geometry with a light blue transparent material
  const geometry = new THREE.BoxGeometry(); // Example: Box geometry
  const material = new THREE.MeshBasicMaterial({
      color: 'lightblue', // Set the color to light blue
      transparent: true,  // Ensure the material supports transparency
      opacity: 0.5        // Set opacity to 50%
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Set the camera position
  camera.position.z = 5;

  // Animation loop to rotate the cube and render the scene
  function animate() {
      requestAnimationFrame(animate);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
  }
  animate();
}
