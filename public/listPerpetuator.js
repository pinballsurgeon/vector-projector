// listPerpetuator.js
import { fetchListFromLLM } from './llmService.js';
import { appendLog } from './sidebar.js';
import { combineAndCleanList } from './listProcessor.js';
import { setLLMListResponse } from './dataStore.js';
import { differentiatingTopicsGenerator } from './attributeGenerator.js';

// A function to generate and expand a list based on user input
export const listPerpetuator = async () => {
  try {
    // Defining the original and new prompt keys
    const originalPromptKey = "initialList";
    const newPromptKey = "refinedList";

    // Getting the user input from the 'userInput' element
    const userInput = (document.getElementById('userInput').value).trim().toLowerCase();
    appendLog(`User input: ${userInput}`);

    // Generating the initial list using the fetchListFromLLM function
    const initialList = await fetchListFromLLM(originalPromptKey, userInput);
    appendLog(`Initial list: ${initialList}`);
    
    // Converting the initial list to a string to use as input for the expanded list
    const newInput = initialList.join(', ');
    appendLog(`New input: ${newInput}`);
    
    // Generating the expanded list using the fetchListFromLLM function
    const expandedList = await fetchListFromLLM(newPromptKey, newInput);
    appendLog(`Expanded list: ${expandedList}`);

    // Combining and cleaning the initial and expanded lists using the combineAndCleanList function
    const combinedList = combineAndCleanList(initialList, expandedList);
    appendLog(`List perpetuator response: ${combinedList}`);
    
    // Displaying the final list in the 'gptResponse' element
    setLLMListResponse(combinedList.join(", "));
    // document.getElementById('llmListResponse').innerText = combinedList.join(", ");

    // Update visibility of the button
    // handleListButtonVisibility();
    differentiatingTopicsGenerator();

    // Returning the final list
    return combinedList;

  } catch (error) {
    // Logging any errors that occur during the process
    appendLog(`Error in list perpetuator: ${error}`);
  }
};

// Function to handle visibility of the button
const handleListButtonVisibility = () => {
    const llmListResponse = document.getElementById('llmListResponse');
    const listButton = document.getElementById('listButton');
    
    if (llmListResponse.innerText.trim() !== '') {
      listButton.style.display = 'inline-block'; // Show button
    } else {
      // listButton.style.display = 'none'; // Hide button
      listButton.style.display = 'inline-block'; // Show button
    }
};