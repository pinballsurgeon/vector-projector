import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM } from './llmService.js';
import { createOrUpdateCube } from './cubeManager.js';

export const generateRatings = async (createOrUpdateCubeWithScene) => {
    try {
        const items = document.getElementById('llmListResponse').innerText.split(', ');
        const attributes = document.getElementById('llmTopicAttributes').innerText.split(', ');

        let ratings = {};
        let cubeData = [];
        let pcaRatings = {};

        for (let item of items) {
            ratings[item] = {};

            for (let attribute of attributes) {
                const promptKey = "rateAttribute";  // You would need to define this prompt in your listPrompts
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

        // Get PCA results
        const pcaResponse = await fetch('/performPCA', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(pcaRatings)
        });
        const pcaResult = await pcaResponse.json();

        appendLog(`PCA Results: ${JSON.stringify(pcaResult)}`);

        // // Extract PCA coordinates
        // const pcaCoordinates = pcaResult[item];
        // ratings[item]['pcaCoordinates'] = pcaCoordinates;

        // // Create the cube object with the PCA coordinates and the image URL
        // const cubeObj = {
        //     coordinates: pcaCoordinates,
        //     image: imageUrl
        // };

        // appendLog(`cube object: ${JSON.stringify(cubeObj)}`);
        // cubeData.push(cubeObj);

        // appendLog(`SIX: ${JSON.stringify(cubeData)}`);
        // createOrUpdateCube(cubeData);
    

        // appendLog(`SEVEN`);
        // appendLog(`Ratings: ${JSON.stringify(ratings)}`);

        // appendLog(`EIGHT`);
        // return ratings;

        return pcaResult;

    } catch (error) {
        appendLog(`Error in rating generator: ${error}`);
    }
};
