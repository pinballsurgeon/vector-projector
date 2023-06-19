d3.select("#my_dataviz")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500)
  .append("circle")
  .attr("cx", 250)
  .attr("cy", 250)
  .attr("r", 50)
  .attr("fill", "blue");

  let selectedModel; // Save selected model

  function getSelectedModel() {
      return selectedModel; // Return saved model
  }
  
  function updateSidebar() {
    const sidebarSelector = document.getElementById("sidebarSelector");
    const sidebarTitle = document.getElementById("sidebarTitle");
    const logsContent = document.getElementById('logsContent');
    const modelSelectionContent = document.getElementById('modelSelectionContent');
    
    logsContent.innerHTML = ''; // Clear current logs
    modelSelectionContent.innerHTML = ''; // Clear current model selection
    
    if(sidebarSelector.value === 'logs') {
        sidebarTitle.textContent = 'Logs';
        logsContent.style.display = 'block'; // Show logsContent
        modelSelectionContent.style.display = 'none'; // Hide modelSelectionContent
        // Logs will be appended to 'logsContent' div
    } else {
        sidebarTitle.textContent = 'Model Selection';
        logsContent.style.display = 'none'; // Hide logsContent
        modelSelectionContent.style.display = 'block'; // Show modelSelectionContent
        appendModelSelection();
    }
}

  
  function appendLog(message) {
      const logElement = document.createElement('p');
      const date = new Date();
      const formattedDate = `${date.getMonth() + 1}/${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
      logElement.textContent = `${formattedDate} - ${message}`;
      document.getElementById('logsContent').appendChild(logElement); // Append to 'logsContent' div
  }
  
  function appendModelSelection() {
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
  
async function getPrompt() {
    const response = await fetch('/prompt');
    const data = await response.json();
    return data.prompt;
}

async function executeSequence() {
    try {
        const userInput = document.getElementById('userInput').value;
        appendLog(`Starting sequence with user input: ${userInput}`);

        const prompt = await getPrompt();
        const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
        appendLog(`Full prompt: ${fullPrompt}`);

        const selectedModel = getSelectedModel();
        appendLog(`Selected model: ${selectedModel}`);

        appendLog('Sending request to /ask...');
        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: fullPrompt, model: selectedModel }),
        });

        if (!response.ok) {
            appendLog(`LLM Request Error: ${JSON.stringify(response)}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        appendLog(`Received response from /ask: ${JSON.stringify(data)}`);

        let responseText = data.response.replace(fullPrompt, ''); // Remove the fullPrompt from the response
        responseText = responseText.trim().replace(/\[|\]|'/g, ""); // Remove brackets and quotes
        let responseList = responseText.split(","); // Split into array by comma
        responseList = responseList.map(item => item.trim()); // Remove any leading/trailing spaces in each item
        document.getElementById('gptResponse').innerText = responseList.join(", "); // Join array elements with a comma for display

        appendLog('Sequence completed successfully');
    } catch (error) {
        appendLog(`Error during sequence: ${error}`);
    }
}

document.addEventListener("DOMContentLoaded", function(){
    const sidebarSelector = document.getElementById("sidebarSelector");
    const toggleSidebarButton = document.getElementById("toggleSidebarButton");
    const sidebar = document.getElementById("sidebar");

    sidebarSelector.addEventListener("change", updateSidebar);

    toggleSidebarButton.addEventListener("click", function() {
        sidebar.classList.toggle("open");
    });
    
    updateSidebar(); // Update sidebar on page load
});

document.getElementById('askButton').addEventListener('click', executeSequence);