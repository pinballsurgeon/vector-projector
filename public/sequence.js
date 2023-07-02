import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

// A function to fetch a prompt from the listPrompts object
export const getPrompt = (promptKey) => listPrompts[promptKey];

// A function to clean the GPT response text by removing the full prompt, replacing unwanted characters and splitting it into an array of strings
export const cleanResponse = (responseText, fullPrompt) => {
  let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
  cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
  return cleanText.split(",").map(item => item.trim());
};

// A function to combine two lists, convert all items to lower case, remove duplicates and empty strings
export const combineAndCleanList = (initialList, expandedList) => {

  // Combining the initial and expanded lists
  let combinedList = [...initialList, ...expandedList];
  
  // Converting all items to lower case
  combinedList = combinedList.map(item => item.toLowerCase());
  combinedList = [...new Set(combinedList)];
  return combinedList.filter(item => item !== '');
};

// A function to fetch a list from the Language Learning Model (LLM) given a promptKey and user input
export const fetchListFromLLM = async (promptKey, userInput) => {
    try {
      const prompt = await getPrompt(promptKey);
      const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
      appendLog(`Full prompt: ${fullPrompt}`);
  
      const { model, temperature, top_p, num_return_sequences } = getModelAndParams();
      appendLog(`Selected model: ${model}`);
      appendLog(`Selected temperature: ${temperature}`);
      appendLog(`Selected top_p: ${top_p}`);
      appendLog(`Selected num_return_sequences: ${num_return_sequences}`);
  
      // SEND PROMPT
      appendLog('Sending request to /ask...');
      const response = await fetch('/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
              prompt: fullPrompt, 
              model: model,
              temperature: temperature,
              top_p: top_p,
              num_return_sequences: num_return_sequences
          }),
      });
  
      // We need to make sure the response is OK before we can parse it as JSON
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
      }

      // clean prompt results
      const data = await response.json(); // Parsing the response data as JSON
      const cleanedResponse = cleanResponse(data.response, fullPrompt);
      appendLog(`Cleaned response: ${cleanedResponse}`);

      // RETURN CLEANED RESPONSE
      return cleanedResponse;

    } catch (error) {
      appendLog(`Error during list generation: ${error}`);
    }
};

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
    const newInput = initialList.join(', ');
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
  