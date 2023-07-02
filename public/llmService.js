import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

// A function to clean the GPT response text by removing the full prompt, replacing unwanted characters and splitting it into an array of strings
export const cleanResponse = (responseText, fullPrompt) => {
  let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
  cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
  return cleanText.split(",").map(item => item.trim());
};

// A function to fetch a list from the Language Learning Model (LLM) given a promptKey and user input
export const fetchListFromLLM = async (prompt, userInput) => {
    try {
      // const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
      // appendLog(`Full prompt: ${fullPrompt}`);
      const fullPrompt = listPrompts[prompt].replace('<USERINPUT TOPIC>', userInput);
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
