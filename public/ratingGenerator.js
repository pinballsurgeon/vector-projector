// Import the necessary functions from dataStore.js
import { getLLMListResponse, getLLMTopicAttributes } from './dataStore.js';
import { appendLog, getModelAndParams, listPrompts } from './sidebar.js';
import { fetchListFromLLM, fetchJSONFromLLM, correctJsonObject } from './llmService.js';
import { cubes, createOrUpdateCube } from './cubeManager.js';
// import { calculateConvexHull } from './vectorMetrics.js'; // Import the function
// import { cubeDependencies } from 'mathjs';

async function fetchRatingsAndImageForItem(item, attributes_str) {
    try {
        let promptKey = "rateAllAttributes";
        let replacements = { item, attributes_str };
        const ratingResponse = await fetchJSONFromLLM(promptKey, '', replacements);

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
        return null; // Return null or handle the error as needed
    }
}

export const generateRatings = async (createOrUpdateCubeWithScene) => {
    try {
        // Use the functions from dataStore.js to get the data
        const items = getLLMListResponse().split(',');
        const attributes = getLLMTopicAttributes().split(',');
        const attributes_str = getLLMTopicAttributes();  // This line will get the attributes as a string
        
        appendLog(`fetched items: ${items}`);
        appendLog(`fetched attributes: ${attributes_str}`);

        let ratings = {};
        let pcaRatings = {};
        let ratings_str = "{";  // Initialize ratings_str as a string

        const { model, temperature, top_p, num_return_sequences } = getModelAndParams();

        if (!['text-davinci-003', 'gpt-3.5-turbo-instruct', 'gpt-3.5-turbo', 'gpt-4'].includes(model)) {
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
        } else {
            // Create an array of promises
            let promises = items.map(item => fetchRatingsAndImageForItem(item, attributes_str));
        
            // Use Promise.all to wait for all promises to resolve
            let results = await Promise.all(promises);
        
            // Process the results
            results.forEach(result => {
                if (result) {
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


    // Assume ratings is your original JSON object
    let standardizedRatings = {};

    // Capture the keys from the first item in the JSON object
    let standardKeys = Object.keys(ratings[Object.keys(ratings)[0]]);

    // Iterate through each item in the original JSON object
    for (let itemKey in ratings) {
        let item = ratings[itemKey];
        let standardizedItem = {};

        // Iterate through the standard keys and map the values from the original item
        standardKeys.forEach((key, index) => {
            let originalKeys = Object.keys(item);
            standardizedItem[key] = item[originalKeys[index]];
        });

        // Store the standardized item in the new JSON object
        standardizedRatings[itemKey] = standardizedItem;
    }

    ratings = standardizedRatings;

    // Prepare ratings for PCA (without the imageUrl)
    pcaRatings = JSON.parse(JSON.stringify(standardizedRatings));
    for (let itemKey in pcaRatings) {
        delete pcaRatings[itemKey]['imageUrl'];
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
    
    createOrUpdateCube(pcaResult);
    updateVectorMetricsContent();
    
    return pcaResult;

} catch (error) {
    appendLog(`Error in rating generator: ${error}`);
}
};

function calculateCentroid(cubes) {
    let sumX = 0, sumY = 0, sumZ = 0, count = 0;
    cubes.forEach(cube => {
        sumX += cube.position.x;
        sumY += cube.position.y;
        sumZ += cube.position.z;
        count++;
    });
    return { x: sumX / count, y: sumY / count, z: sumZ / count };
}

function calculateBoundingBox(cubes) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    cubes.forEach(cube => {
        minX = Math.min(cube.position.x, minX);
        minY = Math.min(cube.position.y, minY);
        minZ = Math.min(cube.position.z, minZ);
        maxX = Math.max(cube.position.x, maxX);
        maxY = Math.max(cube.position.y, maxY);
        maxZ = Math.max(cube.position.z, maxZ);
    });

    return { minX, minY, minZ, maxX, maxY, maxZ };
}

function calculatePairwiseDistances(cubes) {
    let totalDistance = 0;
    let count = 0;
    for (let i = 0; i < cubes.length; i++) {
        for (let j = i + 1; j < cubes.length; j++) {
            let distance = Math.sqrt(
                Math.pow(cubes[i].position.x - cubes[j].position.x, 2) +
                Math.pow(cubes[i].position.y - cubes[j].position.y, 2) +
                Math.pow(cubes[i].position.z - cubes[j].position.z, 2)
            );
            totalDistance += distance;
            count++;
        }
    }
    return totalDistance / count; // average distance
}

function estimateDensity(cubes, radius) {
    let densities = cubes.map(cube => {
        let count = 0;
        cubes.forEach(otherCube => {
            let distance = Math.sqrt(
                Math.pow(cube.position.x - otherCube.position.x, 2) +
                Math.pow(cube.position.y - otherCube.position.y, 2) +
                Math.pow(cube.position.z - otherCube.position.z, 2)
            );
            if (distance <= radius) count++;
        });
        return count; // Number of points within the radius
    });
    return densities; // Array of densities for each point
}


export function updateVectorMetricsContent() {

    appendLog(`Vector Metrics - Start`);
    const vectorMetricsContent = document.getElementById('vectorMetricsContent');
    vectorMetricsContent.innerHTML = '<p>Vector SALLY Metrics:</p>'; // Reset content

    appendLog(`Vector Metrics - Cubes - ${JSON.stringify(cubes)}`);
    const centroid = calculateCentroid(cubes);
    const boundingBox = calculateBoundingBox(cubes);
    const avgDistance = calculatePairwiseDistances(cubes);
    const densities = estimateDensity(cubes, 1);

    // Display these values in vectorMetricsContent
    vectorMetricsContent.innerHTML += `<p>Centroid: (${centroid.x.toFixed(2)}, ${centroid.y.toFixed(2)}, ${centroid.z.toFixed(2)})</p>`;
    vectorMetricsContent.innerHTML += `<p>Bounding Box: Min (${boundingBox.minX.toFixed(2)}, ${boundingBox.minY.toFixed(2)}, ${boundingBox.minZ.toFixed(2)}) - Max (${boundingBox.maxX.toFixed(2)}, ${boundingBox.maxY.toFixed(2)}, ${boundingBox.maxZ.toFixed(2)})</p>`;
    vectorMetricsContent.innerHTML += `<p>Average Pairwise Distance: ${avgDistance.toFixed(2)}</p>`;
    vectorMetricsContent.innerHTML += `<p>Estimated Density: ${densities.toFixed(2)}</p>`;

}