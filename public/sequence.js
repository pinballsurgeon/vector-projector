import { appendLog, getSelectedModel } from './sidebar.js';

export const getPrompt = (promptKey) =>
  fetch(`/prompt/${promptKey}`)
    .then((response) => response.json())
    .then((data) => data.prompt);

export const cleanResponse = (responseText, fullPrompt) => {
  let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
  cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
  return cleanText.split(",").map(item => item.trim());
};

export const fetchListFromLLM = async (promptKey, userInput) => {
  try {
    const prompt = await getPrompt(promptKey);
    const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
    appendLog(`Full prompt: ${fullPrompt}`);

    const selectedModel = getSelectedModel();
    appendLog(`Selected model: ${selectedModel}`);

    // SEND PROMPT
    appendLog('Sending request to /ask...');
    const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    const responseList = cleanResponse(data.response, fullPrompt);
    appendLog('List generation completed successfully');
    return responseList;

  } catch (error) {
    appendLog(`Error during list generation: ${error}`);
  }
};

export const combineAndCleanList = (initialList, expandedList) => {
  let combinedList = [...initialList, ...expandedList];
  combinedList = combinedList.map(item => item.toLowerCase());
  combinedList = [...new Set(combinedList)];
  return combinedList.filter(item => item !== '');
};

export const listPerpetuator = async () => {
  try {
    const originalPromptKey = "initialList";
    const newPromptKey = "refinedList";

    const userInput = document.getElementById('userInput').value;

    const initialList = await fetchListFromLLM(originalPromptKey, userInput);
    const newInput = initialList.join(', ');
    const expandedList = await fetchListFromLLM(newPromptKey, newInput);

    const combinedList = combineAndCleanList(initialList, expandedList);

    appendLog(`List perpetuator response: ${combinedList}`);
    document.getElementById('gptResponse').innerText = combinedList.join(", ");
    return combinedList;

  } catch (error) {
    appendLog(`Error in list perpetuator: ${error}`);
  }
};
