export let selectedModel;                   // Save selected model
export let selectedTemperature;             // Save selected temperature
export let selectedTopP;                    // Save selected top_p
export let selectedNumSequences;            // Save selected num_return_sequences

// Initialize Model Parameters
export function getModelAndParams() {
    selectedTemperature = document.getElementById('temperature').value;
    selectedTopP = document.getElementById('top_p').value;
    selectedNumSequences = document.querySelector('input[name="num_return_sequences"]:checked').value;
    
    return { 
        model: selectedModel, 
        temperature: selectedTemperature, 
        top_p: selectedTopP, 
        num_return_sequences: selectedNumSequences 
    }; 
}

// Initialize Model
export function initializeModels() {
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    modelSelectionContent.innerHTML = '';
    appendModelSelection();
}

// Initialize Model Parameters
export function initializeModelParams() {
    document.getElementById('temperature').value = 0.5;
    document.getElementById('top_p').value = 0.5;
    document.getElementById('one').checked = true; 
}

// Initialize Update Sidebar
export function updateSidebar() {
    const sidebarSelector = document.getElementById("sidebarSelector");
    const sidebarTitle = document.getElementById("sidebarTitle");
    const logsContent = document.getElementById('logsContent');
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    const modelParametersContent = document.getElementById('modelParametersContent');
    const cubeContent = document.getElementById('cubeContent');
    const groupsContent = document.getElementById('groupsContent');
    
    const promptEditors = document.getElementById('promptEditors');

    // Start by hiding all contents
    logsContent.style.display = 'none';
    modelSelectionContent.style.display = 'none';
    modelParametersContent.style.display = 'none';
    promptEditors.style.display = 'none';
    cubeContent.style.display = 'none';
    groupsContent.style.display = 'none';

    if(sidebarSelector.value === 'prompts') {
        sidebarTitle.textContent = 'Prompts';
        promptEditors.style.display = 'block'; // Show promptEditors
        
    } else if(sidebarSelector.value === 'logs') {
        sidebarTitle.textContent = 'Logs';
        logsContent.style.display = 'block'; // Show logsContent

    } else if(sidebarSelector.value === 'cubeContent') {
        sidebarTitle.textContent = 'Cube Analytics';
        
        // Make sure the 'cubeContent' div is visible
        document.getElementById('cubeContent').style.display = 'block';
        cubeContent.style.display = 'block';
        
    } else if(sidebarSelector.value === 'modelSelection') {
        sidebarTitle.textContent = 'Model Selection';
        modelSelectionContent.style.display = 'block';
        modelParametersContent.style.display = 'block';

    } else if(sidebarSelector.value === 'groups') {
        // } else {
            sidebarTitle.textContent = 'Grouping';
            groupsContent.style.display = 'block';
    } else {
        sidebarTitle.textContent = 'Model Selection';
        modelSelectionContent.style.display = 'block';
        modelParametersContent.style.display = 'block';

    }
    
    
}

// Write to log
export function appendLog(message) {
    const logElement = document.createElement('p');
    const date = new Date();
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    logElement.textContent = `${formattedDate} - ${message}`;
    document.getElementById('logsContent').appendChild(logElement); // Append to 'logsContent' div
}

// Initialize Model
export function appendModelSelection() {
    fetch('/models')
    .then(response => {
        appendLog('Fetching models...');
        return response.json();
    })
    .then(models => {
        const modelSelectionContent = document.getElementById('modelSelectionContent'); // Append to 'modelSelectionContent' div
        models.forEach((model, index) => {
            const label = document.createElement('label');
            label.textContent = model;
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'model';
            input.value = model;
            if (index === 0) {
                input.checked = true;
                selectedModel = model; // Save first model as default
            }
            // Add event listener to save selected model
            input.addEventListener('change', () => {
                if(input.checked) {
                    selectedModel = model;
                }
            });
            label.appendChild(input);
            modelSelectionContent.appendChild(label);
        });
        appendLog('Models fetched successfully');
        // appendLog(`Content objects ${sidebar}`);

        // Initialize model parameters after models are fetched and appended to DOM
        initializeModelParams();
    })
    .catch(error => {
        appendLog(`Error fetching models: ${error}`);
    });
}

// Build prompt sidebar
export let listPrompts;

export function initializePrompts() {
    fetch('/listPrompts.json')
    .then(response => response.json())
    .then(data => {
        listPrompts = data;
        const promptEditors = document.getElementById('promptEditors');
        for (const prompt in listPrompts) {
            const label = document.createElement('label');
            label.textContent = prompt;
            const textarea = document.createElement('textarea');
            textarea.rows = 10;                     // Set the height to 10 lines
            textarea.value = listPrompts[prompt];
            textarea.addEventListener('change', () => listPrompts[prompt] = textarea.value);
            promptEditors.appendChild(label);
            promptEditors.appendChild(textarea);
        }
    })
    .catch(error => console.log('Error:', error));
}


function cosineDistance(A, B) {
    const dotProduct = A.x * B.x + A.y * B.y + A.z * B.z;
    const magnitudeA = Math.sqrt(A.x ** 2 + A.y ** 2 + A.z ** 2);
    const magnitudeB = Math.sqrt(B.x ** 2 + B.y ** 2 + B.z ** 2);

    const similarity = dotProduct / (magnitudeA * magnitudeB);
    
    // Return the distance, which is 1 minus similarity
    return 1 - similarity;
}


let myBarChart;

export function setCubeImageInSidebar(imageUrl, itemName, originalRatings, cubes) {
    const sidebarCubeImage = document.getElementById('sidebarCubeImage');
    const sidebarTitle = document.getElementById("sidebarTitle");
    const logsContent = document.getElementById('logsContent');
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    const modelParametersContent = document.getElementById('modelParametersContent');
    const cubeContent = document.getElementById('cubeContent');
    
    const promptEditors = document.getElementById('promptEditors');

    // Start by hiding all contents
    logsContent.style.display = 'none';
    modelSelectionContent.style.display = 'none';
    modelParametersContent.style.display = 'none';
    promptEditors.style.display = 'none';
        
    // Make sure the 'cubeContent' div is visible
    document.getElementById('cubeContent').style.display = 'block';
    cubeContent.style.display = 'block';
        
    sidebarCubeImage.src = imageUrl;
    sidebarTitle.textContent = itemName;
    
    const ratingsBarChartCanvas = document.getElementById('ratingsBarChart');

    // Destroy the previous chart instance if it exists
    if (myBarChart) {
        myBarChart.destroy();
    }
    
    // Make sure the canvas element exists
    if (ratingsBarChartCanvas === null) {
        console.error("Canvas element not found");
        return;
    }

    const ctx = ratingsBarChartCanvas.getContext('2d'); // Get the context


    // Calculate average ratings for all other cubes
    const averageRatings = calculateAverageRatingsExceptFor(itemName, cubes);

    // Create the data for Chart.js
    // First, build an array of objects for sorting
    let attributesArray = [];
    Object.keys(originalRatings).forEach((attribute, index) => {
        attributesArray.push({
            name: attribute,
            selectedValue: originalRatings[attribute],
            averageValue: averageRatings[index]
        });
    });

    // Sort the array based on the absolute difference between the selected cube's value and the average value
    attributesArray.sort((a, b) => {
        let diffA = Math.abs(a.selectedValue - a.averageValue);
        let diffB = Math.abs(b.selectedValue - b.averageValue);
        return diffB - diffA;  // For descending order
    });

    const barChartData = {
        labels: attributesArray.map(attribute => attribute.name),
        datasets: [{
            type: 'line',
            label: 'Average Ratings',
            data: attributesArray.map(attribute => attribute.averageValue),
            borderColor: 'red',
            borderWidth: 2,
            fill: false
        }, {
            label: 'Selected Cube Ratings',
            data: attributesArray.map(attribute => attribute.selectedValue),
            backgroundColor: 'blue',
            borderColor: 'blue',
            borderWidth: 1,
        }]
    };

    // Create the new chart instance
    myBarChart = new Chart(ctx, {
        type: 'bar',
        data: barChartData,
        options: {
            scales: {
                x: {
                    ticks: {
                        autoSkip: false, // ensures that labels are not skipped
                        maxRotation: 90, // keeps the labels horizontal
                        minRotation: 90
                    }
                },
                y: {
                    suggestedMin: 0,
                    suggestedMax: 11
                }
            },
            layout: {
                padding: {
                    left: 2,
                    right: 2,
                    top: 5,
                    bottom: 50 // adjust this value to provide more space below the chart
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
        
    });

    const selectedCube = { x: selectedX, y: selectedY, z: selectedZ }; 
    const distances = cubes.map(cube => ({
        cube,
        distance: cosineDistance(selectedCube, cube)
    }));
    
    distances.sort((a, b) => a.distance - b.distance);


}

function calculateAverageRatingsExceptFor(itemName, cubes) {

    // Check if cubes is empty
    if (cubes.length === 0) {
        return [];
    }

    // Locate the originalRatings keys from the selected item
    let attributes = [];
    for (let cube of cubes) {
        if (cube.userData.itemName === itemName) {
            attributes = Object.keys(cube.userData.originalRatings);
            break;
        }
    }

    // Initialize summed ratings and total count
    let summedRatings = {};
    let totalCount = cubes.length - 1; // minus the selected cube

    for (let attribute of attributes) {
        summedRatings[attribute] = 0;  // initialize
    }

    // Sum up the ratings
    for (let cube of cubes) {
        if (cube.userData.itemName !== itemName) {
            for (let attribute of attributes) {
                summedRatings[attribute] += cube.userData.originalRatings[attribute];
            }
        }
    }

    // Calculate the averages
    for (let attribute of attributes) {
        summedRatings[attribute] = summedRatings[attribute] / totalCount;
    }

    return Object.values(summedRatings);
}
