import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

// A function to clean the GPT response text by removing the full prompt, replacing unwanted characters and splitting it into an array of strings
export const cleanResponse_punct = (responseText, fullPrompt) => {
  let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
  cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
  return cleanText.split(",").map(item => item.trim());
};

// A function to clean the GPT response text by removing the full prompt, replacing unwanted characters and splitting it into an array of strings
export const cleanResponse = (responseText, fullPrompt) => {
    let cleanText = responseText.replace(fullPrompt, '');
    return cleanText;
  };

// A function to fetch a list from the Language Learning Model (LLM) given a promptKey and user input
export const fetchListFromLLM = async (promptKey, userInput, replacements = {}) => {
    try {

        let prompt = listPrompts[promptKey];
    
        for (const key in replacements) {
            if (Object.hasOwnProperty.call(replacements, key)) {
            prompt = prompt.replace(`{${key}}`, replacements[key]);
            }
        }

        appendLog(`User input: ${userInput}`);
        const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);
            
        appendLog(`Full prompt: ${fullPrompt}`);

        const { model, temperature, top_p, num_return_sequences } = getModelAndParams();
        appendLog(`Selected model: ${model}`);

        // SEND PROMPT
        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: fullPrompt, 
                model: model
            }),
        });

        // We need to make sure the response is OK before we can parse it as JSON
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
        }

        // clean prompt results
        const data = await response.json(); // Parsing the response data as JSON
        const cleanedResponse = cleanResponse_punct(data.response, fullPrompt);
        appendLog(`Cleaned response: ${cleanedResponse}`);

        // RETURN CLEANED RESPONSE
        return cleanedResponse;

    } catch (error) {
      appendLog(`Error during list generation: ${error}`);
    }
};

export const fetchJSONFromLLM = async (promptKey, userInput, replacements = {}) => {
    try {
        let prompt = listPrompts[promptKey];
    
        for (const key in replacements) {
            if (Object.hasOwnProperty.call(replacements, key)) {
                prompt = prompt.replace(`{${key}}`, replacements[key]);
            }
        }
    
        appendLog(`Build json input: ${userInput}`);
        let fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);

        let completeResponse = "";
        let attempts = 0;  // Keep track of attempts to avoid infinite loops
        const maxAttempts = 5;  // Set a maximum number of attempts

        let original_fullprompt = fullPrompt;
        while (attempts < maxAttempts) {
            appendLog(`Build json full prompt: ${fullPrompt}`);

            const { model, temperature, top_p, num_return_sequences } = getModelAndParams();
            appendLog(`Selected model: ${model}`);

            // SEND PROMPT
            appendLog('Sending request to /ask...');
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: fullPrompt, 
                    model: model
                }),
            });

            // We need to make sure the response is OK before we can parse it as JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
            }

            // clean prompt results
            const data = await response.json(); // Parsing the response data as JSON
            let cleanedResponse = data.response;
            // let cleanedResponse = cleanResponse(data.response, fullPrompt);
            appendLog(`Cleaned response: ${cleanedResponse}`);

            let checkResponse = cleanResponse(cleanedResponse, original_fullprompt);
            // Remove trailing text if occurs
            if (checkResponse.includes('}')) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.indexOf('}') + 1); 
            }
            
            // Append the cleaned response to the complete response
            completeResponse += cleanedResponse;

            // Check if the response is complete
            if (checkResponse.includes('}')) {
                cleanedResponse = cleanResponse(cleanedResponse, original_fullprompt);
                break;  
            }

            // If the response is not complete, create a new prompt with the incomplete response
            fullPrompt = original_fullprompt + ' ' + cleanedResponse;
            attempts += 1;
        }

        // RETURN COMPLETE RESPONSE
        return completeResponse;

    } catch (error) {
        appendLog(`Error during list generation: ${error}`);
    }
};



export const correctJsonObject = async (promptKey, replacements = {}) => {
    
    try {

        let prompt = listPrompts[promptKey];
    
        for (const key in replacements) {
            if (Object.hasOwnProperty.call(replacements, key)) {
                prompt = prompt.replace(`{${key}}`, replacements[key]);
            }
        }

        let fullPrompt = prompt;
        let completeResponse = "";
        let attempts = 0;  // Keep track of attempts to avoid infinite loops
        const maxAttempts = 5;  // Set a maximum number of attempts

        let original_fullprompt = fullPrompt;
        while (attempts < maxAttempts) {
            appendLog(`Full prompt: ${fullPrompt}`);

            const { model, temperature, top_p, num_return_sequences } = getModelAndParams();

            // SEND PROMPT
            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: fullPrompt, 
                    model: model
                }),
            });

            // We need to make sure the response is OK before we can parse it as JSON
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
            }

            // Process received results object
            const data = await response.json(); // Parsing the response data as JSON
            let cleanedResponse = data.response;
            appendLog(`Cleaned response: ${cleanedResponse}`);

            let checkResponse = cleanResponse(cleanedResponse, original_fullprompt);
            // Remove trailing text if occurs
            if (checkResponse.includes('}')) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.indexOf('}') + 1); 
            }
            
            // Append the cleaned response to the complete response
            completeResponse += cleanedResponse;

            // Check if the response is complete
            if (checkResponse.includes('}')) {
                cleanedResponse = cleanResponse(cleanedResponse, original_fullprompt);
                break;  
            }

            // If the response is not complete, create a new prompt with the incomplete response
            fullPrompt = original_fullprompt + ' ' + cleanedResponse;
            attempts += 1;
        }

        // RETURN COMPLETE RESPONSE
        return completeResponse;

    } catch (error) {
        appendLog(`Error during list generation: ${error}`);
    }
};
