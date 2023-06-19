import {appendLog, getSelectedModel} from './sidebar.js';

export async function getPrompt() {
    const response = await fetch('/prompt');
    const data = await response.json();
    return data.prompt;
}

export async function generateRootList() {
    try {
        const userInput = document.getElementById('userInput').value;

        const prompt = await getPrompt();
        const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
        appendLog(`Full prompt: ${fullPrompt}`);

        const selectedModel = getSelectedModel();
        appendLog(`Selected model: ${selectedModel}`);

        // SEND PROMPT
        appendLog('Sending request to /ask...');
        const response = await fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt: fullPrompt, model: selectedModel }),
        });

        // ERROR in RESPONSE
        if (!response.ok) {
            appendLog(`LLM Request Error: ${JSON.stringify(response)}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // DATA RESPONSE
        const data = await response.json();
        appendLog(`Received response from /ask: ${JSON.stringify(data)}`);

        let responseText = data.response.replace(fullPrompt, '');  // Remove the fullPrompt from the response
        responseText = responseText.trim().split("\n")[0];          // Split by newline, take the first line, and trim
        responseText = responseText.replace(/\[|\]|'/g, "");        // Remove brackets and quotes
        let responseList = responseText.split(",");                 // Split into array by comma
        responseList = responseList.map(item => item.trim());       // Remove any leading/trailing spaces in each item
        document.getElementById('gptResponse').innerText = responseList.join(", "); // Join array elements with a comma for display

        appendLog('Root list generation completed successfully');
    } catch (error) {
        appendLog(`Error during root list generation: ${error}`);
    }
}

