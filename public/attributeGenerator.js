// attributeGenerator.js
import { fetchListFromLLM } from './llmService.js';
import { appendLog } from './sidebar.js';
import { setLLMTopicAttributes, getLLMListResponse } from './dataStore.js';  // Import from dataStore.js

// A function to generate differentiating topics for a list of items
export const differentiatingTopicsGenerator = async () => {
    try {
      // Defining the prompt keys
      const originalPromptKey = "initialList";
      const newPromptKey = "distinguishingFeatures";
  
      // Getting the user input from dataStore.js
      const LLMListInput = getLLMListResponse();  // Use getLLMListResponse here
      appendLog(`List of items needing attributes: ${LLMListInput}`);  // Use LLMListInput here, not userInput
            
      // Generate Attribute Topics
      const attributeTopics = await fetchListFromLLM(newPromptKey, LLMListInput);
      appendLog(`Attribute Topics: ${attributeTopics}`);
  
      // Saving the final list to dataStore.js
      // document.getElementById('llmTopicAttributes').innerText = attributeTopics.join(", ");
      setLLMTopicAttributes(attributeTopics.join(", "));  // Use setLLMTopicAttributes here
  
      // Once the attributes are populated, display the 'vectorizeButton'
      document.getElementById('vectorizeButton').style.display = 'block';

      // Returning the final list
      return attributeTopics;
  
    } catch (error) {
      // Logging any errors that occur during the process
      appendLog(`Error in differentiating topics generator: ${error}`);
    }
};
