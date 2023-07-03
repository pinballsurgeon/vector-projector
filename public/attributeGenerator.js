// attributeGenerator.js
import { fetchListFromLLM } from './llmService.js';
import { appendLog } from './sidebar.js';

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
  
      // Returning the final list
      return attributeTopics;
  
    } catch (error) {
      // Logging any errors that occur during the process
      appendLog(`Error in differentiating topics generator: ${error}`);
    }
};