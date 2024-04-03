export let selectedModel;
export let selectedTemperature;
export let selectedTopP;
export let selectedNumSequences;

export function getModelAndParams() {

    // const selectedModelTab = document.querySelector('.tablinks.active');
    // const model = selectedModelTab ? selectedModelTab.id.replace('tab-', '') : null;

    const modelSelectionDropdown = document.getElementById('modelSelectionDropdown');
    const model = modelSelectionDropdown.value.replace('tab-', '');

    return { 
        model: model, 
        temperature: 0, 
        top_p: 1, 
        num_return_sequences: 20 
    }; 
}

// Initialize Model
export function initializeModels() {
    const modelSelectionContent = document.getElementById('modelSelectionContent');

}

// Initialize Model Parameters
export function initializeModelParams() {
    const modelSelectionContent = document.getElementById('modelSelectionContent');

}

// Update Sidebar Content
export function updateSidebarContent(selectedValue) {
    const logsContent = document.getElementById('logsContent');
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    const modelParametersContent = document.getElementById('modelParametersContent');
    const cubeContent = document.getElementById('cubeContent');
    const groupsContent = document.getElementById('groupsContent');
    const vectorMetricsContent = document.getElementById('vectorMetricsContent');
    const promptEditors = document.getElementById('promptEditors');
    const library = document.getElementById('library');

    logsContent.style.display = 'none';
    modelSelectionContent.style.display = 'none';
    modelParametersContent.style.display = 'none';
    promptEditors.style.display = 'none';
    cubeContent.style.display = 'none';
    groupsContent.style.display = 'none';
    vectorMetricsContent.style.display = 'none';
    library.style.display = 'none';


    const newSidebarSelector = document.getElementById('newSidebarSelector');
    if (newSidebarSelector.value == 'logs')
        {
            logsContent.style.display = 'block';
            };
    if (newSidebarSelector.value == 'cubeContent')
         {
            cubeContent.style.display = 'block';
            }
    if (newSidebarSelector.value == 'groups')
        {
            groupsContent.style.display = 'block';
            }
    if (newSidebarSelector.value == 'vectorMetrics')
        {
            vectorMetricsContent.style.display = 'block';
            }
    if (newSidebarSelector.value == 'library')
        {
            library.style.display = 'block';
            }


}

// Write to log
export function appendLog(message) {
    const logElement = document.createElement('p');
    const date = new Date();
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    logElement.textContent = `${formattedDate} - ${message}`;
    const logsContent = document.getElementById('logsContent');
    
    console.log(logsContent); // Debug line to check if logsContent is null

    if (logsContent) {
        logsContent.appendChild(logElement);
    } else {
        console.error('logsContent is null. Make sure the element exists and the ID is correct.');
    }
    
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


function adjustImageSize() {
    const cubeContent = document.getElementById('cubeContent');
    const sidebarCubeImage = document.getElementById('sidebarCubeImage');
    
    if (!cubeContent || !sidebarCubeImage) return; // Exit if elements are not found

    // Determine the container width
    const containerWidth = cubeContent.style.width;
    console.log('Container Width', containerWidth);

    // Set image size based on container width
    if (containerWidth < 300) { // Example threshold, adjust as needed
        sidebarCubeImage.style.width = "40%";
        sidebarCubeImage.style.height = "40%";
    } else {
        sidebarCubeImage.style.width = "40%";
        sidebarCubeImage.style.height = "40%";
    }
}


// Adjust image size on window load and resize
window.addEventListener('load', adjustImageSize);
window.addEventListener('resize', adjustImageSize);


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

    const averageRatings = calculateAverageRatingsExceptFor(itemName, cubes);

    let attributesArray = [];
    Object.keys(originalRatings).forEach((attribute, index) => {
        attributesArray.push({
            name: attribute,
            selectedValue: originalRatings[attribute],
            averageValue: averageRatings[index]
        });
    });

    attributesArray.sort((a, b) => {
        let diffA = Math.abs(a.selectedValue - a.averageValue);
        let diffB = Math.abs(b.selectedValue - b.averageValue);
        return diffB - diffA; 
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

    myBarChart = new Chart(ctx, {
        type: 'bar', 
        data: barChartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', 
            scales: {
                x: {
                    ticks: {
                        autoSkip: false,
                        maxRotation: 90, 
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
                    bottom: 50 
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }    
    });

}

function calculateAverageRatingsExceptFor(itemName, cubes) {

    if (cubes.length === 0) {
        return [];
    }

    let attributes = [];
    for (let cube of cubes) {
        if (cube.userData.itemName === itemName) {
            attributes = Object.keys(cube.userData.originalRatings);
            break;
        }
    }

    let summedRatings = {};
    let totalCount = cubes.length - 1;

    for (let attribute of attributes) {
        summedRatings[attribute] = 0;
    }

    for (let cube of cubes) {
        if (cube.userData.itemName !== itemName) {
            for (let attribute of attributes) {
                summedRatings[attribute] += cube.userData.originalRatings[attribute];
            }
        }
    }

    for (let attribute of attributes) {
        summedRatings[attribute] = summedRatings[attribute] / totalCount;
    }

    return Object.values(summedRatings);
}

export async function fetchPreviousQueries() {
    try {
        const response = await fetch('/get_library');
        const result = await response.json();
        if (result.exists) {
            populateLibrary(result.queries);
        } else {
            console.log("No data found for this query");
        }
    } catch (error) {
        console.error('Failed to fetch previous queries:', error);
    }
}

function populateLibrary(queries) {
    const libraryDiv = document.getElementById('library');
    libraryDiv.innerHTML = '';

    queries.forEach(query => {
        const queryBox = document.createElement('div');
        queryBox.classList.add('query-box');
        queryBox.textContent = query.name;

        queryBox.addEventListener('click', () => selectQuery(query.name));

        libraryDiv.appendChild(queryBox);
    });
}

function selectQuery(queryName) {
    const userInput = document.getElementById('userInput');
    userInput.value = queryName; 

    document.getElementById('askButton').click();
}
