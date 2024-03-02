import { getModelAndParams, updateSidebarContent, initializeModels, initializeModelParams, initializePrompts, appendLog } from './sidebar.js';
import { updateSpheres, clearSpheres } from './sphereManager.js';
import { listPerpetuator } from './listPerpetuator.js';
import { createOrUpdateCube, updateVectorMetricsContent, clearCanvas } from './cubeManager.js';

document.addEventListener("DOMContentLoaded", function() {
  const newSidebarSelector = document.getElementById("newSidebarSelector");
  const defaultTab = document.getElementById("tab-claude-v2");
  if (defaultTab) {
    defaultTab.className += " active";
     }
  newSidebarSelector.addEventListener("change", function() {
      updateSidebarContent(this.value);
  });

  // Initialize default content for the sidebar
  updateSidebarContent(newSidebarSelector.value);
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

    // appendLog(`Open Model Tab - Started`);

    // Hide the compare container and show the canvas container
    document.getElementById('compare-container').style.display = 'none';
    document.getElementById('canvas-container').style.display = 'block';


    // Declare all variables
    let i, tabcontent, tablinks;

    // // Get all elements with class="tabcontent" and hide them
    // tabcontent = document.getElementsByClassName("tabcontent");
    // for (i = 0; i < tabcontent.length; i++) {
    //     tabcontent[i].style.display = "none";
    // }

    // Get all elements with class="tablinks" and remove the class "active"
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    // // Show the current tab, and add an "active" class to the button that opened the tab
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
        case "tab-gemini-pro":
            model = "gemini-pro";
            break;
        case "tab-claude-v2":
            model = "claude-v2";
            break;
        case "tab-gpt-4":
            model = "gpt-4";
            break;
        case "tab-mistral-medium":
            model = "mistral-medium";
            break;
        case "tab-mistral-large":
            model = "mistral-large";
            break;
        case "tab-gpt-4-0125-preview":
            model = "gpt-4-0125-preview";
            break;
        case "tab-gpt-4-turbo-preview":
            model = "gpt-4-turbo-preview";
            break;
    // Add cases for other models
    }

    const queryParams = new URLSearchParams({ userInputValue, model }).toString();
    
    updateSidebarContent();


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

// document.getElementById('tab-text-davinci-003').addEventListener('click', (event) => openModelTab(event, 'tab-text-davinci-003'));
document.getElementById('tab-claude-v2').addEventListener('click', (event) => openModelTab(event, 'tab-claude-v2'));
// document.getElementById('tab-gpt-4').addEventListener('click', (event) => openModelTab(event, 'tab-gpt-4'));
document.getElementById('tab-gpt-4-0125-preview').addEventListener('click', (event) => openModelTab(event, 'tab-gpt-4-0125-preview'));
document.getElementById('tab-mistral-medium').addEventListener('click', (event) => openModelTab(event, 'tab-mistral-medium'));
document.getElementById('tab-mistral-large').addEventListener('click', (event) => openModelTab(event, 'tab-mistral-large'));
document.getElementById('tab-gpt-4-turbo-preview').addEventListener('click', (event) => openModelTab(event, 'tab-gpt-4-turbo-preview'));
document.getElementById('tab-gemini-pro').addEventListener('click', (event) => openModelTab(event, 'tab-gemini-pro'));

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

    // try {
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
            modelTitle.textContent = `${modelResult.model}`;
            modelDiv.appendChild(modelTitle);

            append2DVisualization(modelDiv, modelResult);

            // Create a paragraph for the item count
            const itemCountParagraph = document.createElement('p');
            itemCountParagraph.textContent = `Number of items: ${modelResult.numberOfCubes}`;
            modelDiv.appendChild(itemCountParagraph);

            // Create a paragraph for the average pairwise distance
            const avgDistanceParagraph = document.createElement('p');
            avgDistanceParagraph.textContent = `Avg. pairwise distance: ${modelResult.pairwiseAvgDistance.toFixed(2)}`;
            modelDiv.appendChild(avgDistanceParagraph);

            // Create a paragraph for the average neighbors within half pair wise distance
            const avgDensityParagraph = document.createElement('p');
            avgDensityParagraph.textContent = `Avg. Neighbors: ${modelResult.averageDensities.toFixed(2)}`;
            modelDiv.appendChild(avgDensityParagraph);

            // Create a paragraph for the bounding box volume
            const boundingBoxVolumeParagraph = document.createElement('p');
            boundingBoxVolumeParagraph.textContent = `Vector Volume: ${modelResult.boundingBoxVolume.toFixed(2)}`;
            modelDiv.appendChild(boundingBoxVolumeParagraph);

            // Create a paragraph for Shannon Entropy
            const entropyParagraph = document.createElement('p');
            entropyParagraph.textContent = `Shannon Entropy: ${modelResult.shannonEntropy.toFixed(2)}`;
            modelDiv.appendChild(entropyParagraph);

            // Append histogram canvases for pairwise distances and density
            appendHistogramCanvas(modelDiv, modelResult.pairwiseHistogramData, 'Pairwise Distances');
            appendHistogramCanvas(modelDiv, modelResult.densityHistogramData, 'Density of Neighbors');

            // Append the model container to the compare container
            compareContainer.appendChild(modelDiv);
        });
    // } catch (error) {
    //     console.error(`Error during comparison: ${error}`);
    // }
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
function append2DVisualization(modelDiv, modelResult) {
  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 200; // Set width
  canvas.height = 200; // Set height
  modelDiv.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  // Assume we have a set of points (vector representations) for the modelResult
  const points = modelResult.vectorPoints; // This should be an array of {x, y, z} objects

  // Normalize the points to fit the canvas
  const normalizedPoints = normalizePoints(points, canvas.width, canvas.height);

  // Draw each point
  normalizedPoints.forEach(point => {
      // Use the z-coordinate to determine the color and size (as a simple depth effect)
      const depth = (point.z + 1) / 2; // Normalize z value between 0 and 1
      const size = depth * 5 + 2; // Size based on depth
      const blueIntensity = depth * 255;

      // Draw a circle for each point
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = `rgba(135, 206, 250, ${0.5 + depth * 0.5})`; // Light blue with transparency
      ctx.fill();
  });
}

function normalizePoints(points, width, height) {
  // Find the range of the points
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const zValues = points.map(p => p.z);
  const xMax = Math.max(...xValues);
  const xMin = Math.min(...xValues);
  const yMax = Math.max(...yValues);
  const yMin = Math.min(...yValues);
  const zMax = Math.max(...zValues);
  const zMin = Math.min(...zValues);

  // Normalize points to fit within the canvas
  return points.map(p => ({
      x: ((p.x - xMin) / (xMax - xMin)) * width,
      y: ((p.y - yMin) / (yMax - yMin)) * height,
      z: (p.z - zMin) / (zMax - zMin) // Normalized between 0 and 1 for depth effect
  }));
}

document.getElementById('attributesTab').addEventListener('click', compareAttributes);

// Function to create a histogram bar
function createHistogramBar(counts, maxCount) {
  const barContainer = document.createElement('div');
  barContainer.style.width = '100%'; // Full width of the container
  barContainer.style.backgroundColor = '#f0f0f0'; // Light grey background
  barContainer.style.border = '1px solid #ccc'; // Border for the bar container
  barContainer.style.borderRadius = '5px'; // Rounded corners for aesthetics
  barContainer.style.overflow = 'hidden'; // Ensures the inner bar doesn't overflow
  barContainer.style.display = 'flex';
  barContainer.style.position = 'relative'; // Needed to position values

  // Function to determine the bar color based on value
  const getBarColor = value => {
    if (value <= 2) return '#5DADE2'; // Blue
    if (value <= 5) return '#58D68D'; // Green
    if (value <= 8) return '#F4D03F'; // Yellow
    return '#EC7063'; // Red
  };

  counts.forEach((binCount, index) => {
    const bar = document.createElement('div');
    const barWidth = (binCount / maxCount) * 100;
    bar.style.width = `${barWidth}%`;
    bar.style.height = '20px'; 
    bar.style.backgroundColor = getBarColor(index); 
    bar.style.marginRight = '2px'; 
    bar.style.position = 'relative'; 

    if (barWidth > 5) { 
      const valueText = document.createElement('span');
      valueText.textContent = index; 
      valueText.style.position = 'absolute';
      valueText.style.left = '50%'; 
      valueText.style.top = '50%'; 
      valueText.style.transform = 'translate(-50%, -50%)'; 
      valueText.style.fontSize = '0.75rem';
      valueText.style.color = 'white'; 
      valueText.style.pointerEvents = 'none'; 
      bar.appendChild(valueText); 
    }

    barContainer.appendChild(bar);
  });

  return barContainer;
}




async function compareAttributes() {
    const userInputValue = document.getElementById('userInput').value;
    if (!userInputValue) {
        alert("Please enter a query to compare.");
        return;
    }

    const canvasContainer = document.getElementById('canvas-container');
    canvasContainer.style.display = 'none';
    clearCanvas();

    try {
        const response = await fetch(`/get_model_data?query=${encodeURIComponent(userInputValue)}`);
        const modelsAttributeData = await response.json();

        const compareContainer = document.getElementById('compare-container');
        compareContainer.innerHTML = '';
        compareContainer.style.display = 'flex';

        Object.entries(modelsAttributeData).forEach(([modelName, attributes]) => {
            const modelDiv = document.createElement('div');
            modelDiv.classList.add('model-result-container', 'model-card');

            // Create a title for the model
            const modelTitle = document.createElement('h3');
            modelTitle.textContent = `${attributes.model}`;
            modelDiv.appendChild(modelTitle);

            // Convert attribute entries to an array, sort by stdDev, and then iterate
            Object.entries(attributes)
              .sort((a, b) => b[1].stdDev - a[1].stdDev) // Sort by stdDev descending
              .forEach(([attribute, stats]) => {

                try {
                    // Check if any stat is undefined and skip this attribute if so
                    if (stats.max === undefined || stats.min === undefined || stats.avg === undefined || stats.stdDev === undefined) {
                        return; // Skip this attribute
                    }


                    const attributeContainer = document.createElement('div');
                    attributeContainer.classList.add('attribute-container');

                    const attributeTitle = document.createElement('p');
                    attributeTitle.textContent = `Attribute: ${attribute}`;
                    attributeContainer.appendChild(attributeTitle);


                    const max = stats.max.toFixed(2);
                    const min = stats.min.toFixed(2);
                    const avg = stats.avg.toFixed(2);
                    const stdDev = stats.stdDev.toFixed(2);

                    const statsText = `Max: ${max}, Min: ${min}, Avg: ${avg}, Std Dev: ${stdDev}`;
                    const statsParagraph = document.createElement('p');
                    statsParagraph.textContent = statsText;
                    attributeContainer.appendChild(statsParagraph);

                    // Create and append the bar graph here
                    const histogramBar = createHistogramBar(stats.histogram, Math.max(...stats.histogram));
                    attributeContainer.appendChild(histogramBar);

                    // Optionally, create and append a bar graph here

                    modelDiv.appendChild(attributeContainer);

                } catch {
                    return;
                }

            });

            compareContainer.appendChild(modelDiv);
        });
    } catch (error) {
        console.error(`Error during attributes comparison: ${error}`);
    }
}

