import { fetchPreviousQueries, getModelAndParams, updateSidebarContent, initializeModels, initializeModelParams, initializePrompts, appendLog } from './sidebar.js';
import { updateSpheres } from './sphereManager.js';
import { listPerpetuator } from './listPerpetuator.js';
import { createOrUpdateCube, updateVectorMetricsContent, clearCanvas, renderer, camera} from './cubeManager.js';

document.addEventListener("DOMContentLoaded", function() {
  const newSidebarSelector = document.getElementById("newSidebarSelector");
  const defaultTab = document.getElementById("tab-gpt-3.5-turbo");
  if (defaultTab) {
    defaultTab.className += " active";
     }
  newSidebarSelector.addEventListener("change", function() {
      updateSidebarContent(this.value);
  });

  fetchPreviousQueries();
  updateSidebarContent(newSidebarSelector.value);
  initializeModels();
  initializeModelParams();
  initializePrompts();
});

const askButton = document.getElementById('askButton');
const userInput = document.getElementById('userInput');

askButton.addEventListener('click', async () => {
    const userInputValue = userInput.value.trim().toLowerCase();
    const { model } = getModelAndParams();

    if (userInputValue.length < 2) {
        alert("Please enter a query.");
        return;
    }

    askButton.disabled = true;
    askButton.textContent = 'Processing...';

    try {
        const queryParams = new URLSearchParams({ userInputValue, model }).toString();

        const response = await fetch(`/check_query?${queryParams}`);
        const data = await response.json();

        if (data.exists) {

            await createOrUpdateCube(data.pcaResult);
            updateVectorMetricsContent();
        } else {

            const isAuthenticated = await auth0.isAuthenticated();
            if (isAuthenticated) {

                const rootList = await listPerpetuator();
            } else {

                alert("Please log in to run new queries.");
            }
        }

    } catch (error) {
        console.error("Error:", error);
        alert("An error occurred while processing your request.");
    } finally {
        askButton.disabled = false;
        askButton.textContent = 'Ask';
    }
});

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

async function openModelTab(evt) {
    document.getElementById('compare-container').style.display = 'none';
    document.getElementById('canvas-container').style.display = 'block';

    let i, tablinks;

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById('tab-model').style.display = "block";
    evt.currentTarget.className += " active";

    const userInputValue = document.getElementById('userInput').value.trim().toLowerCase();
    if (!userInputValue.trim()) {
        return;
    }

    const { model } = getModelAndParams();
    const queryParams = new URLSearchParams({ userInputValue, model }).toString();
    
    updateSidebarContent();

    try {
        const response = await fetch(`/check_query?${queryParams}`);
        const data = await response.json();

        if (data.exists) {
            await createOrUpdateCube(data.pcaResult);
            updateVectorMetricsContent();
        }

    } catch (error) {
        appendLog(`Error: ${error}`);
    }
}

document.getElementById('tab-model').addEventListener('click', (event) => openModelTab(event));
document.getElementById('compareTab').addEventListener('click', (event) => compareModels(event));
// document.getElementById('attributesTab').addEventListener('click', (event) => compareAttributes(event));
document.getElementById('modelLeaderTab').addEventListener('click', async (event) => {
    event.preventDefault();

    let i, tablinks;
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    event.currentTarget.className += " active";

    // Directly activate the first sub-tab and prepare the first chart
    showChart('EntropyChart');
});


async function showChart(chartId) {
    const chartContainers = document.getElementsByClassName("chart-content");
    for (let i = 0; i < chartContainers.length; i++) {
        chartContainers[i].style.display = "none"; // Hide all charts initially
    }
    document.getElementById(chartId).style.display = "block"; // Show the selected chart

    const subTablinks = document.getElementsByClassName("sub-tablinks");
    for (let i = 0; i < subTablinks.length; i++) {
        subTablinks[i].className = subTablinks[i].className.replace(" active", ""); // Remove active class
        if (subTablinks[i].getAttribute('onclick').includes(chartId)) {
            subTablinks[i].className += " active"; // Set the current tab as active
        }
    }

    // Proceed with creating the chart if it does not already exist
    const container = document.getElementById(chartId);
    if (!container.hasChildNodes()) {
        const canvas = document.createElement('canvas');
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const response = await fetch('/model_averages');
        const modelAverages = await response.json();

        // Sort and prepare data for the chart
        modelAverages.sort((a, b) => b.entropy_pct - a.entropy_pct);

        const data = {
            labels: modelAverages.map(model => model.model),
            datasets: [{
                label: 'Relative Entropy',
                data: modelAverages.map(model => model.entropy_pct),
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }]
        };

        new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        display: true
                    }
                }
            }
        });
    }
}


async function compareModels(evt) {
    const userInputValue = document.getElementById('userInput').value;
    if (!userInputValue) {
        alert("Please enter a query to compare.");
        return;
    }

    let i, tablinks;

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById('compareTab').style.display = "block";
    evt.currentTarget.className += " active";


        const canvasContainer = document.getElementById('canvas-container');
        canvasContainer.style.display = 'none';
        clearCanvas();

        const response = await fetch(`/compare_vectors?query=${encodeURIComponent(userInputValue)}`);
        const compareData = await response.json();
        
        const compareContainer = document.getElementById('compare-container');
        compareContainer.innerHTML = '';
        compareContainer.style.display = 'flex';
        compareContainer.classList.add('compare-results-grid');
        
        compareData.forEach(modelResult => {

            const modelDiv = document.createElement('div');
            modelDiv.classList.add('model-result-container', 'model-card');
            
            appendLog(`Model Result - ${JSON.stringify(modelResult)}`);

            const modelTitle = document.createElement('h3');
            modelTitle.textContent = `${modelResult.model}`;
            modelDiv.appendChild(modelTitle);

            append2DVisualization(modelDiv, modelResult);

            const itemCountParagraph = document.createElement('p');
            itemCountParagraph.textContent = `Number of items: ${modelResult.numberOfCubes}`;
            modelDiv.appendChild(itemCountParagraph);

            const avgDistanceParagraph = document.createElement('p');
            avgDistanceParagraph.textContent = `Avg. pairwise distance: ${modelResult.pairwiseAvgDistance.toFixed(2)}`;
            modelDiv.appendChild(avgDistanceParagraph);

            const avgDensityParagraph = document.createElement('p');
            avgDensityParagraph.textContent = `Avg. Neighbors: ${modelResult.averageDensities.toFixed(2)}`;
            modelDiv.appendChild(avgDensityParagraph);

            const boundingBoxVolumeParagraph = document.createElement('p');
            boundingBoxVolumeParagraph.textContent = `Vector Volume: ${modelResult.boundingBoxVolume.toFixed(2)}`;
            modelDiv.appendChild(boundingBoxVolumeParagraph);

            const entropyParagraph = document.createElement('p');
            entropyParagraph.textContent = `Shannon Entropy: ${modelResult.shannonEntropy.toFixed(2)}`;
            modelDiv.appendChild(entropyParagraph);

            appendHistogramCanvas(modelDiv, modelResult.pairwiseHistogramData, 'Pairwise Distances');
            appendHistogramCanvas(modelDiv, modelResult.densityHistogramData, 'Density of Neighbors');
            compareContainer.appendChild(modelDiv);

            const payload = {
                items: modelResult.numberOfCubes,
                pairwise: modelResult.pairwiseAvgDistance.toFixed(2),
                density: modelResult.averageDensities.toFixed(2),
                volume: modelResult.boundingBoxVolume.toFixed(2),
                entropy: modelResult.shannonEntropy.toFixed(2),
                query: userInputValue,
                model: modelResult.model
            };
                
            fetch('/entropy_db', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
                    
    });

}

 function appendHistogramCanvas(modelDiv, histogramData, chartLabel) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  modelDiv.appendChild(canvas);

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
                      stepSize: 1
                  }
              }
          }
      }
  });
}

function append2DVisualization(modelDiv, modelResult) {

  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 200;
  modelDiv.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const points = modelResult.vectorPoints;

  const normalizedPoints = normalizePoints(points, canvas.width, canvas.height);

  normalizedPoints.forEach(point => {
      const depth = (point.z + 1) / 2;
      const size = depth * 5 + 2;
      const blueIntensity = depth * 255;

      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, 2 * Math.PI, false);
      ctx.fillStyle = `rgba(135, 206, 250, ${0.5 + depth * 0.5})`;
      ctx.fill();
  });
}

function normalizePoints(points, width, height) {
  const xValues = points.map(p => p.x);
  const yValues = points.map(p => p.y);
  const zValues = points.map(p => p.z);
  const xMax = Math.max(...xValues);
  const xMin = Math.min(...xValues);
  const yMax = Math.max(...yValues);
  const yMin = Math.min(...yValues);
  const zMax = Math.max(...zValues);
  const zMin = Math.min(...zValues);

  return points.map(p => ({
      x: ((p.x - xMin) / (xMax - xMin)) * width,
      y: ((p.y - yMin) / (yMax - yMin)) * height,
      z: (p.z - zMin) / (zMax - zMin)
  }));
}



function createHistogramBar(counts, maxCount) {
  const barContainer = document.createElement('div');
  barContainer.style.width = '100%';
  barContainer.style.backgroundColor = '#f0f0f0';
  barContainer.style.border = '1px solid #ccc';
  barContainer.style.borderRadius = '5px';
  barContainer.style.overflow = 'hidden';
  barContainer.style.display = 'flex';
  barContainer.style.position = 'relative';

  const getBarColor = value => {
    if (value <= 2) return '#5DADE2';
    if (value <= 5) return '#58D68D';
    if (value <= 8) return '#F4D03F';
    return '#EC7063';
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

async function compareAttributes(evt) {
    const userInputValue = document.getElementById('userInput').value.trim().toLowerCase();
    if (!userInputValue) {
        alert("Please enter a query to compare.");
        return;
    }

    let i, tablinks;

    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }

    document.getElementById('attributesTab').style.display = "block";
    evt.currentTarget.className += " active";
    
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

            const modelTitle = document.createElement('h3');
            modelTitle.textContent = `${attributes.model}`;
            modelDiv.appendChild(modelTitle);

            Object.entries(attributes)
              .sort((a, b) => b[1].stdDev - a[1].stdDev)
              .forEach(([attribute, stats]) => {

                try {
                    if (stats.max === undefined || stats.min === undefined || stats.avg === undefined || stats.stdDev === undefined) {
                        return;
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

                    const histogramBar = createHistogramBar(stats.histogram, Math.max(...stats.histogram));
                    attributeContainer.appendChild(histogramBar);

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

let auth0 = null;

async function initializeAuth0() {
    try {
        auth0 = await createAuth0Client({
            domain: 'dev-h3zfs1afk4agsssf.us.auth0.com',
            client_id: 'vWhUs5xQshlz8Chj7lxs0jQ0wOFtUuiW',
            redirect_uri: window.location.origin,
        });
        
        const isAuthenticated = await auth0.isAuthenticated();
        if (isAuthenticated) {
            await updateUI(true);
        } else {
            
            await handleAuthenticationResult();
        }
    } catch (error) {
        console.error("Error initializing Auth0", error);
    }
}

async function handleAuthenticationResult() {
    const query = window.location.search;
    console.log('Auth Query', query);
    if (query.includes("code=") && query.includes("state=")) {
        await auth0.handleRedirectCallback();
        
        console.log('Handle callback');
        const isAuthenticated = await auth0.isAuthenticated();
        await updateUI(isAuthenticated);

        if (isAuthenticated) {

            const user = await auth0.getUser();
            
            const userData = {
                email: user.email,
                username: user.nickname
            };

            await updateUserInDatabase(userData);
        }

        window.history.replaceState({}, document.title, "/");
    } else {
        await updateUI(await auth0.isAuthenticated());
    }
}

async function updateUserInDatabase(userData) {
    try {
        const response = await fetch('/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });

        const data = await response.json();
        console.log('User update response:', data);
    } catch (error) {
        console.error('Error updating user in database:', error);
    }
}

async function updateUI(isAuthenticated) {
    const userInfoDisplay = document.getElementById('user-info');

    if (isAuthenticated && auth0) {
        const user = await auth0.getUser();
        
        if (user) {
            userInfoDisplay.textContent = `${user.name}`;
            userInfoDisplay.style.display = 'block';
        }

        document.getElementById('btn-login').style.display = 'none';
        document.getElementById('btn-logout').style.display = 'block';
    } else {
        userInfoDisplay.style.display = 'none';
        document.getElementById('btn-login').style.display = 'block';
        document.getElementById('btn-logout').style.display = 'none';
    }
}

window.addEventListener('load', initializeAuth0);

window.login = async () => { await auth0.loginWithRedirect(); };
window.logout = () => { auth0.logout({ returnTo: window.location.origin }); };

document.getElementById('modelSelectionDropdown').addEventListener('change', function() {
    var selectedModel = this.value;
    console.log("Selected model:", selectedModel);
});

function adjustCanvasSize() {
    const headerHeight = document.getElementById('header').offsetHeight;
    const combinedContainerHeight = document.getElementById('combined-container').offsetHeight;
    const tabContentHeight = document.getElementById('tab-sliver').offsetHeight;
    const margin = 20;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const availableHeight = viewportHeight - headerHeight - combinedContainerHeight - tabContentHeight - (2 * margin) ;

    const canvasWidth = viewportWidth * 0.67; 
    const canvasHeight = Math.max(0, availableHeight);

    renderer.setSize(canvasWidth, canvasHeight);

    camera.aspect = canvasWidth / canvasHeight;
    camera.updateProjectionMatrix();
}

function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this, args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

window.addEventListener('resize', debounce(adjustCanvasSize, 10));

window.onload = function() {
    adjustCanvasSize();
};