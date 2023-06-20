import {appendLog, getSelectedModel} from './sidebar.js';

export async function getPrompt(promptKey) {
    const response = await fetch('/prompt/' + promptKey);
    const data = await response.json();
    return data.prompt;
}

export async function fetchListFromLLM(promptKey) {
    try {
        const userInput = document.getElementById('userInput').value;

        const prompt = await getPrompt(promptKey);
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

        // CLEAN LIST RESPONSE
        let responseText = data.response.replace(fullPrompt, '');  // Remove the fullPrompt from the response
        responseText = responseText.trim().split("\n")[0];         // Split by newline, take the first line, and trim
        responseText = responseText.replace(/\[|\]|'/g, "");       // Remove brackets and quotes
        let responseList = responseText.split(",");                // Split into array by comma
        responseList = responseList.map(item => item.trim());      // Remove any leading/trailing spaces in each item

        appendLog('List generation completed successfully');
        return responseList;                                       // Return the response list
    } catch (error) {
        appendLog(`Error during list generation: ${error}`);
    }
}

export async function listPerpetuator() {
    try {
        // Define your original and new prompt keys
        const originalPromptKey = "original";
        const newPromptKey = "new";

        // Call the fetchListFromLLM function with the original prompt key and get the result
        const initialList = await fetchListFromLLM(originalPromptKey);

        // Then call fetchListFromLLM again with the new prompt key to expand the list
        const expandedList = await fetchListFromLLM(newPromptKey);

        // Combine the initial and expanded lists
        const combinedList = [...initialList, ...expandedList];

        appendLog(`List perpetuator response: ${combinedList}`);

        // Update the 'gptResponse' element with the returned list
        document.getElementById('gptResponse').innerText = combinedList.join(", ");

        // Return the combined list to the caller
        return combinedList;
    } catch (error) {
        appendLog(`Error in list perpetuator: ${error}`);
    }
}
