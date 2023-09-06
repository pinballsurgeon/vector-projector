import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM, fetchJSONFromLLM } from './llmService.js';
import { createOrUpdateCube } from './cubeManager.js';

export const generateRatings = async (createOrUpdateCubeWithScene) => {
    try {
        const items = document.getElementById('llmListResponse').innerText.split(', ');
        const attributes = document.getElementById('llmTopicAttributes').innerText.split(', ');
        const attributes_str = document.getElementById('llmTopicAttributes').innerText;

        let ratings = {};
        let pcaRatings = {};

        const { model, temperature, top_p, num_return_sequences } = getModelAndParams();

        appendLog(`SELECTED MODEL: ${model}`);

        if (model !== 'gpt-3') {
            
            for (let item of items) {
                ratings[item] = {};

                for (let attribute of attributes) {
                    const promptKey = "rateAttribute";
                    appendLog(`Generating rating for item: ${item}, attribute: ${attribute}`);

                    const replacements = { item, attribute };
                    const rating = await fetchListFromLLM(promptKey, '', replacements);

                    appendLog(`Generated rating: ${rating}`);

                    ratings[item][attribute] = parseInt(rating[0]);
                }

                // Fetch image for item
                const response = await fetch(`/generateImage/${item}`);
                const result = await response.json();
                const imageUrl = result.image;
                ratings[item]['imageUrl'] = imageUrl;
                appendLog(`Image URL: ${imageUrl}`);

                // Prepare ratings for PCA (without the imageUrl)
                pcaRatings = JSON.parse(JSON.stringify(ratings));
                for (let item_sub in pcaRatings) {
                    delete pcaRatings[item_sub]['imageUrl'];
                }
            }
        } else {

            // GPT-3
            for (let item of items) {
                ratings[item] = {};

                const promptKey = "rateAllAttributes";

                // Fetch ratings in one go for this item and all its attributes
                const replacements = { item, attributes_str };
                const rating = await fetchJSONFromLLM(promptKey, '', replacements);

                appendLog(`GPT3 SINGLE RATING: ${rating}`);


                const validJsonString = rating.replace(/'/g, '"');
                const jsonObject = JSON.parse(validJsonString);

                ratings[item] = JSON.parse(jsonObject);

                // Fetch image for item
                const response = await fetch(`/generateImage/${item}`);
                const result = await response.json();
                const imageUrl = result.image;
                ratings[item]['imageUrl'] = imageUrl;
                appendLog(`Image URL: ${imageUrl}`);
                
                // Prepare ratings for PCA (without the imageUrl)
                pcaRatings = JSON.parse(JSON.stringify(ratings));
                for (let item_sub in pcaRatings) {
                    delete pcaRatings[item_sub]['imageUrl'];
                }
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
