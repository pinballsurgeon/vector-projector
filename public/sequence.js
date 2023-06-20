import { appendLog, getSelectedModel } from './sidebar.js';

// A function to fetch a prompt from a server given a promptKey
export const getPrompt = (promptKey) =>
  // Using fetch to make a request to the server
  fetch(`/prompt/${promptKey}`)
    .then((response) => response.json()) // Parsing the response as JSON
    .then((data) => data.prompt); // Returning the prompt from the response data

// A function to clean the GPT response text by removing the full prompt, replacing unwanted characters and splitting it into an array of strings
export const cleanResponse = (responseText, fullPrompt) => {
  // Removing the full prompt and leading/trailing white spaces, and taking the first line
  let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
  
  // Replacing brackets, quotes, and all other punctuation except spaces, commas, and hyphens
  cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
  
  // Splitting the cleaned text into an array of items and trimming each item
  return cleanText.split(",").map(item => item.trim());
};

// A function to fetch a list from the Language Learning Model (LLM) given a promptKey and user input
export const fetchListFromLLM = async (promptKey, userInput) => {
  try {
    // Getting the prompt using the getPrompt function
    const prompt = await getPrompt(promptKey);
    
    // Replacing the '<USERINPUT TOPIC>' placeholder in the prompt with the user input
    const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
    appendLog(`Full prompt: ${fullPrompt}`);

    // Getting the selected model using the getSelectedModel function
    const selectedModel = getSelectedModel();
    appendLog(`Selected model: ${selectedModel}`);

    // Sending a POST request to the '/ask' endpoint with the full prompt and selected model as data
    appendLog('Sending request to /ask...');
    const response = await fetch('/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt, model: selectedModel }),
    });

    // Checking the status of the response, if it's not OK then throwing an error
    if (!response.ok) {
        appendLog(`LLM Request Error: ${JSON.stringify(response)}`);
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parsing the response data as JSON
    const data = await response.json();
    appendLog(`Received response from /ask: ${JSON.stringify(data)}`);

    // Cleaning the response data using the cleanResponse function
    const responseList = cleanResponse(data.response, fullPrompt);
    appendLog('List generation completed successfully');
    
    // Returning the response list
    return responseList;

  } catch (error) {
    // Logging any errors that occur during the process
    appendLog(`Error during list generation: ${error}`);
  }
};

// A function to combine two lists, convert all items to lower case, remove duplicates and empty strings
export const combineAndCleanList = (initialList, expandedList) => {
  // Combining the initial and expanded lists
  let combinedList = [...initialList, ...expandedList];
  
  // Converting all items to lower case
  combinedList = combinedList.map(item => item.toLowerCase());
  
  // Removing duplicate items
  combinedList = [...new Set(combinedList)];
  
  // Removing empty strings and returning the final list
  return combinedList.filter(item => item !== '');
};

// A function to generate and expand a list based on user input
export const listPerpetuator = async () => {
  try {
    // Defining the original and new prompt keys
    const originalPromptKey = "initialList";
    const newPromptKey = "refinedList";

    // Getting the user input from the 'userInput' element
    const userInput = document.getElementById('userInput').value;

    // Generating the initial list using the fetchListFromLLM function
    const initialList = await fetchListFromLLM(originalPromptKey, userInput);
    
    // Converting the initial list to a string to use as input for the expanded list
    const newInput = initialList.join(', ');
    
    // Generating the expanded list using the fetchListFromLLM function
    const expandedList = await fetchListFromLLM(newPromptKey, newInput);

    // Combining and cleaning the initial and expanded lists using the combineAndCleanList function
    const combinedList = combineAndCleanList(initialList, expandedList);

    // Logging the final list
    appendLog(`List perpetuator response: ${combinedList}`);
    
    // Displaying the final list in the 'gptResponse' element
    document.getElementById('gptResponse').innerText = combinedList.join(", ");
    
    // Returning the final list
    return combinedList;

  } catch (error) {
    // Logging any errors that occur during the process
    appendLog(`Error in list perpetuator: ${error}`);
  }
};
