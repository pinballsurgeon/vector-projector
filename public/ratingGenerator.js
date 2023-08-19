import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM } from './llmService.js';
import { createOrUpdateCube } from './cubeManager.js';

export const generateRatings = async (createOrUpdateCubeWithScene) => {
    try {
        const items = document.getElementById('llmListResponse').innerText.split(', ');
        const attributes = document.getElementById('llmTopicAttributes').innerText.split(', ');

        let ratings = {};
        let cubeData = [];  // Array to hold the cube data

        for (let item of items) {
            ratings[item] = {};

            for (let attribute of attributes) {
                const promptKey = "rateAttribute";  // You would need to define this prompt in your listPrompts
                appendLog(`Generating rating for item: ${item}, attribute: ${attribute}`);

                const replacements = { item, attribute };
                const rating = await fetchListFromLLM(promptKey, '', replacements);  // Removed userInput

                appendLog(`Generated rating: ${rating}`);

                // Assuming LLM returns a list of one item being the numerical rating. Parse to integer and store it.
                ratings[item][attribute] = parseInt(rating[0]);
            }
            

            appendLog(`ONE`);
            // Fetch image for item
            let response = await fetch(`/generateImage/${item}`);
            let result = await response.json();
            const imageUrl = result.image;
            ratings[item]['imageUrl'] = imageUrl;
            
            appendLog(`TWO`);
            // Copy ratings without imageUrl for PCA
            let pcaRatings = ratings;
            for (let item in pcaRatings) {
                delete pcaRatings[item]['imageUrl'];
            }

            appendLog(`THREE`);
            // Send ratings data to server for PCA
            response = await fetch('/performPCA', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pcaRatings)
            });
            const pcaResult = await response.json();

            appendLog(`FOUR`);
            const pcaCoordinates = pcaResult[item];
            ratings[item]['pcaCoordinates'] = pcaCoordinates;


            appendLog(`FIVE`);
            // Prepare data for cube creation
            cubeData.push({ coordinates: pcaCoordinates, image: imageUrl });

            appendLog(`SIX`);
            // Create or update cubes
            createOrUpdateCube(cubeData);
        } 

        appendLog(`SEVEN`);
        appendLog(`Ratings: ${JSON.stringify(ratings)}`);

        appendLog(`EIGHT`);
        return ratings;

    } catch (error) {
        appendLog(`Error in rating generator: ${error}`);
    }
};