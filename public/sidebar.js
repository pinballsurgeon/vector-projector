export let selectedModel; // Save selected model
export let selectedTemperature; // Save selected temperature
export let selectedTopP; // Save selected top_p
export let selectedNumSequences; // Save selected num_return_sequences

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

// sidebar.js
export function initializeModels() {
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    modelSelectionContent.innerHTML = '';
    appendModelSelection();

    //initializeModelParams();
}

export function initializeModelParams() {
    document.getElementById('temperature').value = 0.5;
    document.getElementById('top_p').value = 0.5;
    document.getElementById('one').checked = true; 
}


export function updateSidebar() {
    const sidebarSelector = document.getElementById("sidebarSelector");
    const sidebarTitle = document.getElementById("sidebarTitle");
    const logsContent = document.getElementById('logsContent');
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    const modelParametersContent = document.getElementById('modelParametersContent');
    
    if(sidebarSelector.value === 'logs') {
        sidebarTitle.textContent = 'Logs';
        logsContent.style.display = 'block'; // Show logsContent
        modelSelectionContent.style.display = 'none'; // Hide modelSelectionContent
        modelParametersContent.style.display = 'none'; // Hide modelParametersContent
    } else {
        sidebarTitle.textContent = 'Model Selection';
        logsContent.style.display = 'none'; // Hide logsContent
        modelSelectionContent.style.display = 'block'; // Show modelSelectionContent
        modelParametersContent.style.display = 'block'; // Show modelParametersContent
    }
}


export function appendLog(message) {
    const logElement = document.createElement('p');
    const date = new Date();
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    logElement.textContent = `${formattedDate} - ${message}`;
    document.getElementById('logsContent').appendChild(logElement); // Append to 'logsContent' div
}

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
        appendLog(`Content objects ${sidebar}`);
        console.log('sidebarSelector:', sidebarSelector);
        console.log('toggleSidebarButton:', toggleSidebarButton);
        console.log('sidebar:', sidebar);

        // Initialize model parameters after models are fetched and appended to DOM
        initializeModelParams();
    })
    .catch(error => {
        appendLog(`Error fetching models: ${error}`);
    });
}
