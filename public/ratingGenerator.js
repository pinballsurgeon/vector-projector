// Import the necessary functions from dataStore.js
import { getLLMListResponse, getLLMTopicAttributes } from './dataStore.js';
import { appendLog, getModelAndParams } from './sidebar.js';
import { fetchListFromLLM, fetchJSONFromLLM } from './llmService.js';
import { updateVectorMetricsContent, createOrUpdateCube } from './cubeManager.js';


function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

async function fetchRatingsAndImageForItem(item, attributes_str) {
    try {
        let promptKey = "rateAllAttributes";
        let replacements = { item, attributes_str };
        const ratingResponse = await fetchJSONFromLLM(promptKey, '', replacements);

        appendLog(`Rating response: ${ratingResponse}`);

        let validJsonString = ratingResponse.replace(/'/g, '"').replace('.', '');
        let jsonObject = JSON.parse(validJsonString);
        
        // Fetch image for item
        const imageResponse = await fetch(`/generateImage/${item}`);
        const imageResult = await imageResponse.json();

        return {
            item: item,
            ratings: jsonObject,
            imageUrl: imageResult.image
        };
    } catch (error) {
        appendLog(`Error fetching data for item: ${item}. Error: ${error}`);
        return { item, error: true }; // Indicate that an error occurred
    }
}

export const generateRatings = async (createOrUpdateCubeWithScene) => {
    try {
        // Use the functions from dataStore.js to get the data
        const items = getLLMListResponse().split(',');
        const attributes = getLLMTopicAttributes().split(',');
        const attributes_str = getLLMTopicAttributes();  // This line will get the attributes as a string
        
        // appendLog(`fetched items: ${items}`);
        // appendLog(`fetched attributes: ${attributes_str}`);

        let ratings = {};
        let pcaRatings = {};
        let ratings_str = "{";  // Initialize ratings_str as a string

        const { model, temperature, top_p, num_return_sequences } = getModelAndParams();

        if (!['text-davinci-003', 'gpt-3.5-turbo-instruct', 'gpt-3.5-turbo', 'gpt-4', 'gpt-4-1106-preview', 'gpt-4-0125-preview', 'gpt-4-turbo-preview', 'gemini-pro','mistral-medium', 'mistral-large', 'claude-v2', 'claude-v3', 'gpt-4-turbo-2024-04-09', 'gemini-1.0-pro-001', 'gemini-1.0-pro-002', 'gemini-1.5-pro-0409', 'gemini-1.5-pro-preview-0409'].includes(model)) {
            for (let i = 0; i < items.length; i++) {

                let item = items[i];
                try {
                    ratings[item] = {};
                    ratings_str += `"${item}": {`;  // Add item to the ratings_str

                    for (let j = 0; j < attributes.length; j++) {
                        let attribute = attributes[j];
                        const promptKey = "rateAttribute";
                        // appendLog(`Generating rating for item: ${item}, attribute: ${attribute}`);

                        const replacements = { item, attribute };
                        const rating = await fetchListFromLLM(promptKey, '', replacements);

                        // appendLog(`Generated rating: ${rating}`);
                        ratings[item][attribute] = parseInt(rating[0]);
                        ratings_str += `"${attribute}": ${rating[0]}`;  // Add attribute and rating to ratings_str

                        if (j < attributes.length - 1) ratings_str += ", ";
                    }

                    // Fetch image for item
                    const response = await fetch(`/generateImage/${item}`);
                    const result = await response.json();
                    const imageUrl = result.image;
                    ratings[item]['imageUrl'] = imageUrl;
                    ratings_str += `, "imageUrl": "${imageUrl}"`;  // Add imageUrl to ratings_str
                    ratings_str += "}";
                    if (i < items.length - 1) ratings_str += ", ";

                } catch (error) {
                    // Handle or skip errors for that particular item
                    appendLog(`Error fetching rating for item: ${item}. Error: ${error}`);
                    continue; // Skip to the next item
                }
            }
        } else if (['claude-v3'].includes(model)) {

            for (const item of items) {
                // Await the processing of each item
                sleep(500);
                const result = await fetchRatingsAndImageForItem(item, attributes_str);
        
                // Process the result
                if (result && !result.error) { // Check if result is valid and no error
                    ratings[result.item] = result.ratings;
                    ratings[result.item]['imageUrl'] = result.imageUrl;
        
                    // Build ratings_str
                    ratings_str += `"${result.item}": {`;
                    Object.entries(result.ratings).forEach(([key, value], index, array) => {
                        ratings_str += `"${key}": "${value}"`;
                        if (index < array.length - 1) ratings_str += ", ";
                    });
                    ratings_str += `, "imageUrl": "${result.imageUrl}"`;
                    ratings_str += "}";
                    if (items.indexOf(result.item) < items.length - 1) ratings_str += ", ";
                }
            }


        } else {

            // Create an array of promises
            let promises = items.map(item => fetchRatingsAndImageForItem(item, attributes_str));

            // Use Promise.all to wait for all promises to resolve
            let results = await Promise.all(promises);

            // Process the results
            results.forEach(result => {
                if (result && !result.error) { // Check if result is valid and no error
                    ratings[result.item] = result.ratings;
                    ratings[result.item]['imageUrl'] = result.imageUrl;

                    // Build ratings_str
                    ratings_str += `"${result.item}": {`;
                    Object.entries(result.ratings).forEach(([key, value], index, array) => {
                        ratings_str += `"${key}": "${value}"`;
                        if (index < array.length - 1) ratings_str += ", ";
                    });
                    ratings_str += `, "imageUrl": "${result.imageUrl}"`;
                    ratings_str += "}";
                    if (items.indexOf(result.item) < items.length - 1) ratings_str += ", ";
                }
            });
        }

    ratings_str += "}";  // Close the JSON object represented as a string

    appendLog(`Generative AI Complete.`);

    // Assume ratings is your original JSON object
    let standardizedRatings = {};

    // Capture the keys from the first item in the JSON object
    let standardKeys = Object.keys(ratings[Object.keys(ratings)[0]]);

    // Iterate through each item in the original JSON object
    for (let itemKey in ratings) {
        try {
            let item = ratings[itemKey];
            let standardizedItem = {};
    
            standardKeys.forEach((key, index) => {
                let originalKeys = Object.keys(item);
                standardizedItem[key] = item[originalKeys[index]];
            });
    
            standardizedRatings[itemKey] = standardizedItem;
        } catch (error) {
            appendLog(`Error processing item ${itemKey}: ${error}`);
        }
    }
    

    ratings = standardizedRatings;

    // Prepare ratings for PCA (without the imageUrl)
    pcaRatings = JSON.parse(JSON.stringify(standardizedRatings));
    for (let itemKey in pcaRatings) {
        try {
            delete pcaRatings[itemKey]['imageUrl'];
        } catch (error) {
            appendLog(`Error processing PCA rating for item ${itemKey}: ${error}`);
        }
    }
    

    // Get PCA results
    const pcaResponse = await fetch('/performPCA', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(pcaRatings)
    });
    const pcaResult = await pcaResponse.json();

    // Combine PCA coordinates with image URLs and original ratings for each item
    for (let item of items) {
        try {
            pcaResult[item] = {
                coordinates: pcaResult[item],
                image: ratings[item]['imageUrl'],
                originalRatings: ratings[item]
            };
            delete pcaResult[item].originalRatings['imageUrl'];
        } catch (error) {
            appendLog(`Error combining PCA results for item ${item}: ${error}`);
        }
    }    

    const userInputValue = document.getElementById('userInput').value;

    const payload = {
        pcaResult,
        query: userInputValue,
        model
    };
        
    await fetch('/vector_db', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    await createOrUpdateCube(pcaResult); // Wait for all cubes to be created
    updateVectorMetricsContent(); // Now update the vector metrics content
    return pcaResult;

} catch (error) {
    appendLog(`Error in rating generator: ${error}`);
}
};