import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM } from './llmService.js';
import { cleanResponse, combineAndCleanList } from './listProcessor.js';


// A function to fetch a prompt from the listPrompts object
export const getPrompt = (promptKey) => listPrompts[promptKey];

// A function to generate and expand a list based on user input
export const listPerpetuator = async () => {
  try {
    // Defining the original and new prompt keys
    const originalPromptKey = "initialList";
    const newPromptKey = "refinedList";

    // Getting the user input from the 'userInput' element
    const userInput = document.getElementById('userInput').value;
    appendLog(`User input: ${userInput}`);

    // Generating the initial list using the fetchListFromLLM function
    const initialList = await fetchListFromLLM(originalPromptKey, userInput);
    appendLog(`Initial list: ${initialList}`);
    
    // Converting the initial list to a string to use as input for the expanded list
    const newInput = initialList.join(', ');fetchListFromLLM
    appendLog(`New input: ${newInput}`);
    
    // Generating the expanded list using the fetchListFromLLM function
    const expandedList = await fetchListFromLLM(newPromptKey, newInput);
    appendLog(`Expanded list: ${expandedList}`);

    // Combining and cleaning the initial and expanded lists using the combineAndCleanList function
    const combinedList = combineAndCleanList(initialList, expandedList);
    appendLog(`List perpetuator response: ${combinedList}`);
    
    // Displaying the final list in the 'gptResponse' element
    document.getElementById('llmListResponse').innerText = combinedList.join(", ");

    // Update visibility of the button
    handleListButtonVisibility();

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
      listButton.style.display = 'none'; // Hide button
    }
  };
  

  // A function to generate differentiating topics for a list of items
export const differentiatingTopicsGenerator = async () => {
    try {
      // Defining the prompt keys
      const originalPromptKey = "initialList";
      const newPromptKey = "distinguishingFeatures";
  
      // Getting the user input from the 'userInput' element
      const LLMListInput = document.getElementById('llmListResponse').innerText;
      appendLog(`List of items needing attributes: ${LLMListInput}`);  // Use LLMListInput here, not userInput
            
      // Generate Attribute Topics
      const attributeTopics = await fetchListFromLLM(newPromptKey, LLMListInput);
      appendLog(`Attribute Topics: ${attributeTopics}`);
  
      // Displaying the final list in the 'gptResponse' element
      document.getElementById('llmTopicAttributes').innerText = attributeTopics.join(", ");
  
      // Update visibility of the button
      handleListButtonVisibility();
  
      // Returning the final list
      return attributeTopics;
  
    } catch (error) {
      // Logging any errors that occur during the process
      appendLog(`Error in differentiating topics generator: ${error}`);
    }
  };
  