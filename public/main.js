d3.select("#my_dataviz")
  .append("svg")
  .attr("width", 500)
  .attr("height", 500)
  .append("circle")
  .attr("cx", 250)
  .attr("cy", 250)
  .attr("r", 50)
  .attr("fill", "blue");

function getSelectedModel() {
    const radios = document.getElementsByName('model');
    for (let i = 0; i < radios.length; i++) {
        if (radios[i].checked) {
            return radios[i].value;
        }
    }
}


function appendLog(message) {
    const logElement = document.createElement('p');
    const date = new Date();
    const formattedDate = `${date.getMonth() + 1}/${date.getDate()} - ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
    logElement.textContent = `${formattedDate} - ${message}`;
    document.querySelector('.sidebar-content').appendChild(logElement);
}

fetch('/models')
.then(response => {
    appendLog('Fetching models...');
    return response.json();
})
.then(models => {
    const modelContainer = document.getElementById('modelContainer');
    models.forEach((model, index) => {
        const label = document.createElement('label');
        label.textContent = model;
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'model';
        input.value = model;
        if (index === 0) {
            input.checked = true;
        }
        label.appendChild(input);
        modelContainer.appendChild(label);
    });
    appendLog('Models fetched successfully');
})
.catch(error => {
    appendLog(`Error fetching models: ${error}`);
});
  
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
        appendLog(`Received response from /ask: ${data}`);

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
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggleSidebarButton");

    toggleButton.addEventListener("click", function() {
        sidebar.classList.toggle("open");
    });
});



document.getElementById('askButton').addEventListener('click', executeSequence);