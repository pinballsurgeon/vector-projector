import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';

export const cleanResponse_punct = (responseText, fullPrompt) => {
  let cleanText = responseText.replace(fullPrompt, '').trim().split("\n")[0];
  cleanText = cleanText.replace(/\[|\]|'/g, "").replace(/[^\w\s,-]/g, "");
  return cleanText.split(",").map(item => item.trim());
};

export const cleanResponse = (responseText, fullPrompt) => {
    let cleanText = responseText.replace(fullPrompt, '');
    return cleanText;
  };

export const fetchListFromLLM = async (promptKey, userInput, replacements = {}) => {
    try {

        let prompt = listPrompts[promptKey];
    
        for (const key in replacements) {
            if (Object.hasOwnProperty.call(replacements, key)) {
            prompt = prompt.replace(`{${key}}`, replacements[key]);
            }
        }

        const fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);

        const { model, temperature, top_p, num_return_sequences } = getModelAndParams();
        appendLog(`Selected model: ${model}`);

        const response = await fetch('/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                prompt: fullPrompt, 
                model: model
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
        }


        const data = await response.json();
        const cleanedResponse = cleanResponse_punct(data.response, fullPrompt);

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
    
        let fullPrompt = prompt.replace('<USERINPUT TOPIC>', userInput);

        let completeResponse = "";
        let attempts = 0; 
        const maxAttempts = 2; 

        let original_fullprompt = fullPrompt;
        while (attempts < maxAttempts) {

            try {

                const { model, temperature, top_p, num_return_sequences } = getModelAndParams();
                appendLog(`Selected model: ${model}`);

                appendLog('Sending request to /ask...');
                const response = await fetch('/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: fullPrompt, 
                        model: model
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
                }

                const data = await response.json();
                let cleanedResponse = data.response;

                let checkResponse = cleanResponse(cleanedResponse, original_fullprompt);
                if (checkResponse.includes('}')) {
                    cleanedResponse = cleanedResponse.substring(0, cleanedResponse.indexOf('}') + 1); 
                }
                
                completeResponse += cleanedResponse;

                if (checkResponse.includes('}')) {
                    cleanedResponse = cleanResponse(cleanedResponse, original_fullprompt);
                    break;  
                }

                fullPrompt = original_fullprompt + ' ' + cleanedResponse;
                attempts += 1;

            } catch (error) {
                appendLog(`Error during request attempt ${attempts + 1}: ${error}`);
                attempts += 1;
        
                if (attempts === maxAttempts) {
                    appendLog('Exhausted all attempts. Exiting...');

                    throw new Error("Failed after 3 attempts");
                }
            }

        }

        return completeResponse;

    } catch (error) {
        appendLog(`Error during building vector json: ${error}`);
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
        let attempts = 0;
        const maxAttempts = 3;

        let original_fullprompt = fullPrompt;
        while (attempts < maxAttempts) {

            const { model, temperature, top_p, num_return_sequences } = getModelAndParams();

            const response = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: fullPrompt, 
                    model: model
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${JSON.stringify(response)}`);
            }

            const data = await response.json();
            let cleanedResponse = data.response;

            let checkResponse = cleanResponse(cleanedResponse, original_fullprompt);
            if (checkResponse.includes('}')) {
                cleanedResponse = cleanedResponse.substring(0, cleanedResponse.indexOf('}') + 1); 
            }
            
            completeResponse += cleanedResponse;

            if (checkResponse.includes('}')) {
                cleanedResponse = cleanResponse(cleanedResponse, original_fullprompt);
                break;  
            }

            fullPrompt = original_fullprompt + ' ' + cleanedResponse;
            attempts += 1;
        }

        return completeResponse;

    } catch (error) {
        appendLog(`Error during JSON correction: ${error}`);
    }
};