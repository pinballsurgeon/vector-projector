export let selectedModel; // Save selected model

export function initializeModels() {
    appendModelSelection();
}

export function getSelectedModel() {
    return selectedModel; // Return saved model
}

export function updateSidebar() {
    const sidebarSelector = document.getElementById("sidebarSelector");
    const sidebarTitle = document.getElementById("sidebarTitle");
    const logsContent = document.getElementById('logsContent');
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    
    if(sidebarSelector.value === 'logs') {
        sidebarTitle.textContent = 'Logs';
        logsContent.style.display = 'block'; // Show logsContent
        modelSelectionContent.style.display = 'none'; // Hide modelSelectionContent
    } else {
        sidebarTitle.textContent = 'Model Selection';
        logsContent.style.display = 'none'; // Hide logsContent
        modelSelectionContent.style.display = 'block'; // Show modelSelectionContent

        modelSelectionContent.innerHTML = ''; // Clear current model selection
        appendModelSelection();
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
    })
    .catch(error => {
        appendLog(`Error fetching models: ${error}`);
    });
}