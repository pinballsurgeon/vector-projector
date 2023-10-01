import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM, fetchJSONFromLLM, correctJsonObject } from './llmService.js';
import { createOrUpdateCube } from './cubeManager.js';

export const generateRatings = async (createOrUpdateCubeWithScene) => {
    try {
        const items = document.getElementById('llmListResponse').innerText.split(', ');
        const attributes = document.getElementById('llmTopicAttributes').innerText.split(', ');
        const attributes_str = document.getElementById('llmTopicAttributes').innerText;

        let ratings = {};
        let pcaRatings = {};
        let ratings_str = "{";  // Initialize ratings_str as a string

        const { model, temperature, top_p, num_return_sequences } = getModelAndParams();

        // appendLog(`SELECTED MODEL: ${model}`);

        if (model !== 'gpt-3') {
            for (let i = 0; i < items.length; i++) {
                let item = items[i];
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
            }
        } else {

            for (let i = 0; i < items.length; i++) {
                let item = items[i];
                ratings[item] = {};
                ratings_str += `"${item}": {`;  // Add item to the ratings_str

                let promptKey = "rateAllAttributes";
                let replacements = { item, attributes_str };
                const rating = await fetchJSONFromLLM(promptKey, '', replacements);

                let validJsonString = rating.replace(/'/g, '"').replace('.', '');
                // appendLog(`GPT3 SINGLE RATING: ${validJsonString}`);

                // correct json issues
                let jsonObject = {};
                try {
                    jsonObject = JSON.parse(validJsonString);
                    ratings[item] = jsonObject;
                }
                catch (json_parse_error) {

                    // appendLog(`Correcting Error ${json_parse_error} In: ${validJsonString}`);

                    promptKey = "correctJsonObject";
                    replacements = { json_parse_error, validJsonString };
                    let corrected_json = await correctJsonObject(promptKey, replacements);

                    jsonObject = JSON.parse(corrected_json);
                    ratings[item] = jsonObject;
                }

                let keys = Object.keys(jsonObject);
                for (let j = 0; j < keys.length; j++) {
                    let key = keys[j];
                    ratings_str += `"${key}": "${jsonObject[key]}"`;  // Add key and value to ratings_str
                    if (j < keys.length - 1) ratings_str += ", ";
                }

                // Fetch image for item
                const response = await fetch(`/generateImage/${item}`);
                const result = await response.json();
                const imageUrl = result.image;
                ratings[item]['imageUrl'] = imageUrl;
                ratings_str += `, "imageUrl": "${imageUrl}"`;  // Add imageUrl to ratings_str
                ratings_str += "}";
                if (i < items.length - 1) ratings_str += ", ";
            }
        }

    ratings_str += "}";  // Close the JSON object represented as a string


    // appendLog(`Ratings Str: ${ratings_str}`);  // Log the ratings_str at the end to inspect it

        // Prepare ratings for PCA (without the imageUrl)
    pcaRatings = JSON.parse(JSON.stringify(ratings));
    for (let item_sub in pcaRatings) {
        delete pcaRatings[item_sub]['imageUrl'];
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
        pcaResult[item] = {
            coordinates: pcaResult[item],
            image: ratings[item]['imageUrl'],
            originalRatings: ratings[item]
        };

        // Remove the 'imageUrl' key from originalRatings as it's redundant
        delete pcaResult[item].originalRatings['imageUrl'];
    }

    try {
        appendLog(`PCA Results with Images and Original Ratings: ${JSON.stringify(pcaResult)}`);
    }
    catch {
        appendLog(pcaResult);
    }

    createOrUpdateCube(pcaResult);

    return pcaResult;

} catch (error) {
    appendLog(`Error in rating generator: ${error}`);
}
};


