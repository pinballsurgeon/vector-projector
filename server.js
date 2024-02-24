import express from 'express';
import path from 'path';
import { HfInference } from '@huggingface/inference';
import MistralClient from '@mistralai/mistralai';
import fs from 'fs';
import * as ss from 'simple-statistics';
import numeric from 'numeric';
import * as math from 'mathjs';
import mlMatrix from 'ml-matrix';
import { createRequire } from "module"; // Bring in the ability to create the 'require' method
import bodyParser from 'body-parser';
import pg from 'pg';
import {BedrockRuntimeClient, InvokeModelCommand} from "@aws-sdk/client-bedrock-runtime";
const {VertexAI} = require('@google-cloud/vertexai');

// Initialize Vertex with your Cloud project and location
const vertex_ai = new VertexAI({project: 'dehls-deluxo-engine', location: 'us-central1'});
const gcp_model = 'gemini-1.0-pro-001';

// Instantiate the models
const generativeModel = vertex_ai.preview.getGenerativeModel({
    model: gcp_model,
    generation_config: {
      "max_output_tokens": 2048,
      "temperature": 0.9,
      "top_p": 1
  },
    safety_settings: [
      {
          "category": "HARM_CATEGORY_HATE_SPEECH",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
          "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
          "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      },
      {
          "category": "HARM_CATEGORY_HARASSMENT",
          "threshold": "BLOCK_MEDIUM_AND_ABOVE"
      }
  ],
  });


// const auth = new GoogleAuth({
//   credentials: JSON.parse(process.env.GCP_CRED)
// });


const { Client } = pg;

const require = createRequire(import.meta.url); // construct the require method
const axios = require('axios'); // Axios for making requests

// const {VertexAI} = require('@google-cloud/vertexai');

const { Configuration, OpenAIApi } = require("openai");
let imageCache = {};  // Create an in-memory image cache

// import the Google Images client at the top of your file
const GoogleImages = require('google-images');
// create an instance of the Google Images client
const client = new GoogleImages(process.env.GOOG_IMG_1, process.env.GOOG_IMG_2);

const hf_key = process.env.hf_key_1;

const configuration = new Configuration({
  apiKey: process.env.openai_wow_wow,
});
const openai = new OpenAIApi(configuration);

const app = express();
const inference = new HfInference(hf_key);

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json());
app.use(express.static('public'));

function covarianceMatrix(data) {
    const means = data[0].map((col, i) => math.mean(data.map(row => row[i])));
    return data[0].map((col, j) => 
        data[0].map((col, i) => 
            math.mean(data.map(row => (row[i] - means[i]) * (row[j] - means[j])))));
}

function isValidItem(item, validKeys) {
    const itemKeys = Object.keys(item);
    // Check if item has the same keys as the valid keys
    if (itemKeys.length !== validKeys.length || !itemKeys.every(key => validKeys.includes(key))) {
        return false;
    }
    // Check if all values are numeric
    return Object.values(item).every(value => typeof value === 'number');
}

function preprocessData(data) {
    // Step 1: Determine the set of valid nested keys from the first item
    const sampleItem = data[Object.keys(data)[0]];
    const validNestedKeys = Object.keys(sampleItem);
    
    // Step 2 & 3: Validate each item and ensure all nested keys match and values are numeric
    const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        const itemKeys = Object.keys(value);
        // Ensure item has the same keys as the valid nested keys and all values are numeric
        const isValidItem = itemKeys.length === validNestedKeys.length && 
                            itemKeys.every(k => validNestedKeys.includes(k) && typeof value[k] === 'number');
        
        if (isValidItem) {
            acc[key] = value; // Keep item if it's valid
        }
        return acc;
    }, {});

    return filteredData;
}

function performPCA(data) {
    try {
        const preprocessedData = preprocessData(data);
        if (preprocessedData.length === 0) {
            throw new Error('No valid data items for PCA');
        }

        // Assume we're working with the first item to demonstrate getting keys TESTING
        // You might need to adjust based on your actual requirements
        const keys = Object.keys(preprocessedData);
        console.log(`PCA keys: ${keys}`);

        // Correctly convert objects to arrays of values
        // const values = preprocessedData.map(obj => Object.values(obj));
        const values = Object.values(preprocessedData).map(obj => Object.values(obj)); // Convert objects to arrays

        // const keys = Object.keys(data);


        // Center the data
        const meanValues = values[0].map((_, i) => ss.mean(values.map(row => row[i])));
        const centeredData = values.map(row => row.map((value, i) => value - meanValues[i]));

        // Calculate covariance matrix
        const covMatrix = covarianceMatrix(centeredData);

        // Create a new ml-matrix instance from the covariance matrix
        const M = new mlMatrix.Matrix(covMatrix);

        // Compute the eigenvectors and eigenvalues of the covariance matrix
        const eigendecomposition = new mlMatrix.EigenvalueDecomposition(M);
        const eigenvalues = eigendecomposition.realEigenvalues;
        const eigenvectors = eigendecomposition.eigenvectorMatrix;

        // Sort the eigenvectors based on the eigenvalues
        const sortedEigenvaluesIndices = eigenvalues
            .map((val, idx) => [val, idx]) // attach the original index positions [eigenvalue, index]
            .sort(([a], [b]) => b - a) // sort based on the eigenvalue in decreasing order
            .map(([, idx]) => idx); // discard the sorted eigenvalues, we just want the indices
        const sortedEigenvectors = sortedEigenvaluesIndices.map(i => eigenvectors.getColumn(i));

        // Select the first three eigenvectors
        const selectedEigenvectors = sortedEigenvectors.slice(0, 3);

        // Transform the data into the new space
        const transformedData = centeredData.map(row => selectedEigenvectors.map(eigenvector => math.dot(row, eigenvector)));
    
        // Construct the result object
        const result = {};
        keys.forEach((key, i) => {
        result[key] = {
            x: transformedData[i][0],
            y: transformedData[i][1],
            z: transformedData[i][2]
        };
        });

        return result;
    } catch (error) {
        console.error("PCA Error:", error);
    }
}

app.post('/performPCA', (req, res, next) => {
    try {
        const data = req.body;
        const result = performPCA(data);
        res.json(result);
    } catch (err) {
        console.error(err);
        console.error("performPCA error");
        next(err);
    }
});

app.get('/prompt/:promptKey', (req, res, next) => {
    fs.readFile('public/listPrompts.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return next(err);
        } else {
            const prompts = JSON.parse(data);
            const prompt = prompts[req.params.promptKey];
            res.json({ prompt: prompt });
        }
    });
});

// const authOptions = {
//     credentials: {
//       client_email: process.env.GCP_CLIENT_EMAIL,
//       private_key: process.env.GCP_CLIENT_KEY
//     }
//   }

// // const vertex_ai = new VertexAI({
// //     project: 'dehls-deluxo-engine',
// //     location: 'us-central1'
// //   });


// const vertex_ai = new VertexAI({
//     project: 'dehls-deluxo-engine',
//     location: 'us-central1',
//     googleAuthOptions: authOptions
//   });

// const authOptions = {
//     credentials: {
//       client_email: 'dehls-tst@dehls-deluxo-engine.iam.gserviceaccount.com',
//       private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDCcLqlhastQtmc\nYvLTPLsam4cIwVHyyZp0mcklhWIR8IGxK/RRiN9+NBZMJfq7y32GcUJXjfsT2ZqC\nM9QYBBr5wAYdZ2h/CTGBthBb4w+RUFC4LUHkL86/lkhaTAzwEk5iPM7168FW+HLJ\npWmMXmXdsyQnuKBOQF9vK1lFd9z811lw3g4m46sanD+foD3V9E7Hl9Wcs5koALSg\nNpMtWEh8btKI/QX3o/QRiEtn6dWoko1wVC3kin92I32cIJDZrZ/Zu/2+ZxYmAJa4\nWWyj0vCGwCf94PiM5kDCX2tRBBvIkWw9SAPNRlO0FRH+ZPZZ4kW1ClOa42cWwEXn\nNkFOdn7LAgMBAAECggEABpBwtKrVExOZLh7nDLuVo3nRrrl8D0LAHKSedk5Q98MT\nVcxilKgWx3dxs0Nq+hEOHU5Qi40nB04G2dNvGxp0YK8bZb26eONyEOt5FOkO+vxn\npTgd69qzU6N6sNW1cBtmGwnrgMDjR5DeqzES5aLANKJaG58vhkTFFAc2HdLEmqKJ\nW9avqgMC6jOSWhgoSWlXFDfy8mMJbmVDWZcy/LV4idIFWahruxhFzL1DOSdS4EeT\nNNvx5VyXMhYJcodXizWP4vYr1AAf8qy59z8nTKoUFuSAJFVReSlqKN0K2aSGpNVe\nznZtOHKRKLXcMabUbCvkD6GWvC5AIycqeigpS0bhPQKBgQD8j2sFzBCLRIjQdF1U\nSrPmXXntZa4Fhrai0LULqss0c4VfUHOm1lFSzks7wcyB3mkrGzrDgTQMTrhHrEO8\nPlxgJxGGgikLc5+CfPGcKTAoXB/37Xbq6xFISoQlozCNkmNO/vKZcF6kMI0NxgA6\nkO0T5RER9zFkl1utElaJ1j81zwKBgQDFFqtD+nqeGt1kralEp5W+B8Nn252ivM4P\n3Ekr4ZvNXMrEqEcG5wGl1OfKPB9KdqCe+FfeDwwaGPyIqMkYHYhQW1veItmsMCG2\nr8rLssR7HAlNh9Pjk0QRt8LGjefi+5LDL38MbIzJOfCgP64j+nGcFgQ0w840jT4c\nEBl1sqCiRQKBgQDNioq29RShwuz1eT5bU1CFsp2ALrgplzEb4G73R9CIp1tr7rWw\nmcslcO6Ze2dMag19H3P7mDMbsRUYf4HAuZ/EQQdqSJPO1hKCx9x6Eqs2rYL26zNU\njGpMQxi46M6i6PgZWjNl3KWpSjoBc5rMDxZikpIJ5Ps1uljJyZrUIqDe0QKBgC6L\n+grl/0uT4LHEafOy+KSWxMmkjog+uxP33LgmYluQDLuBWrUAnd0CeXPD20gE2E5z\nLJ1fRGZtfEbyRfwSDX2c9gdyh6IpA+1Xeze8krbYmkHbUGmxACSHF9M49IkhDTpX\n31OZ12425uOR5pjMr0RD1t53WB4FNaP/EWRAubtZAoGBALDtIg0RxP64pn7BZ/v0\nlH7vk0HlDYvzKIWIU1Pg4uoXViybkG1qNQlshW9YjCv43TnV5W+YyAoypYMZnfU0\nRzylsfVBWEAu3Gh4M8rMmiuauEsL7hQWwg5vJysZOuKQ9103POiFERHuKyw4Srg1\nWxBbQF/X8LV/TpLr4KUk5X/8\n-----END PRIVATE KEY-----\n'
//     }
//   };

//   const vertex_ai = new VertexAI({
//     project: 'dehls-deluxo-engine',
//     location: 'us-central1',
//     googleAuthOptions: authOptions
//   });


  async function generateContentFromGeminiPro(userInput, model) {
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: model,
      generation_config: {
        "max_output_tokens": 4048,
        "temperature": 0.6,
        "top_p": 1
      },
      safety_settings: [],
    });
  
    // const chat = generativeModel.startChat({});
    // const chatInput1 = userInput;
  
    console.log(`Gemini Pro User: ${userInput}`);
    const result = await generativeModel.generateContent(userInput);
    // const result_test = result.response.text();
    const result_test = result.response.candidates[0].content.parts[0].text;
    console.log('Gemini Pro response: ', result_test);

    return result_test;
    
}

export const invokeTitanTextExpressV1 = async (prompt) => {
    const client = new BedrockRuntimeClient( { region: 'us-east-1' } );

    //const modelId = 'amazon.titan-text-express-v1';
    const modelId = 'meta.llama2-70b-chat-v1';
    //const modelId = 'meta.llama2-70b-v1';

    const textGenerationConfig = {
        maxTokenCount: 512,
        stopSequences: ["\n"],
        temperature: 0.5,
        topP: 1,
    };

    const payload = {
        //inputText: prompt,
        prompt: prompt,
        max_gen_len: 1000,
        temperature: 0.5,
        top_p: 0.7
        //textGenerationConfig,
    };

    const command = new InvokeModelCommand({
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
        modelId,
    });

    try {
        const response = await client.send(command);
        console.log(`Llama2 response!`, response);
        const decodedResponseBody = new TextDecoder().decode(response.body);

        const responseBody = JSON.parse(decodedResponseBody);
        return responseBody.generation;

    } catch (err) {
        console.error(err);
    }
};


async function gemini_generateContent(prompt) {
    const chat = generativeModel.startChat({});
  
    const userMessage0 = [{text: prompt}];
    const streamResult0 = await chat.sendMessageStream(userMessage0);
    const response = JSON.stringify((await streamResult0.response).candidates[0].content);
    
    return response;

  };


app.post('/ask', async (req, res, next) => {
    try {
        const userInput = req.body.prompt;
        const model = req.body.model || 'gpt2'; // Provide a default value

        // OpenAI - Create Completion 
        if (['text-davinci-003', 'text-davinci-002', 'gpt-3.5-turbo-instruct'].includes(model)) {
            const gptResponse = await openai.createCompletion({
                model: model,
                prompt: userInput,
                max_tokens: 200
            });
            res.json({ response: gptResponse.data.choices[0].text.trim() });

        // OpenAI - Create Chat Completion 
        } else if (['gpt-3.5-turbo', 'gpt-4', 'gpt-4-0125-preview', 'gpt-4-1106-preview', 'gpt-4-turbo-preview'].includes(model)) {

            const gptResponse = await openai.createChatCompletion({
                model: model,
                messages: [{ role: "user", content: userInput }],
              });

            res.json({ response: gptResponse.data.choices[0].message.content });
      
        } else if (['gemini-pro'].includes(model)) {

            console.log(`Gemini-Pro request!`);
            // const gm_response = await generateContentFromGeminiPro(userInput, model);
            const prompt = userInput;
            // const results = await invokeTitanTextExpressV1(prompt);
            const results = await generateContent(prompt);
            console.log(`Gemini-Pro response`, results);
            res.json({ response: results });

        } else if (['mistral-medium'].includes(model)) {

            console.log(`mistral-medium request!`, process.env.MISTRAL_API_KEY);

            const apiKey = process.env.MISTRAL_API_KEY;
            const client = new MistralClient(apiKey);
            
            const chatResponse = await client.chat({
              model: 'mistral-medium',
              messages: [{role: 'user', content: userInput}],
            });

            console.log(`mistral-medium response`, chatResponse.choices[0].message.content );
            res.json({ response: chatResponse.choices[0].message.content });

        // HuggingFace - Transformers
        } else {
            const max_length = req.body.max_length || 1000;
            const min_length = req.body.min_length || 30;
            const temperature = req.body.temperature || 1.0;
            const top_p = req.body.top_p || undefined;
            const top_k = req.body.top_k || undefined;
            const num_return_sequences = req.body.num_return_sequences || 1;
            const do_sample = req.body.do_sample || true;

            const { generated_text } = await inference.textGeneration({
                model: model,
                inputs: userInput,
                max_length: max_length,
                min_length: min_length,
                temperature: temperature,
                top_p: top_p,
                top_k: top_k,
                num_return_sequences: num_return_sequences,
                do_sample: do_sample
            });
            res.json({ response: generated_text });
        }
    } catch (err) {
        console.error("Error processing the ask endpoint:", err);
        res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
});

app.get('/models', (req, res, next) => {
    fs.readFile('public/llmModels.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return next(err);
        } else {
            const models = JSON.parse(data);
            res.json(models);
        }
    });
});

const DEFAULT_IMAGE_URL = "https://cdn.iconscout.com/icon/premium/png-256-thumb/error-management-2410698-2024636.png";

async function searchImage(query) {
    try {
        const images = await client.search(query, {size: 'small'});

        for (let image of images) {
            const imageUrl = image.url;
            if (await isImageCORSCompliant(imageUrl)) {
                return imageUrl;
            }
        }

        return DEFAULT_IMAGE_URL;

    } catch (err) {
        console.error(err);
        return DEFAULT_IMAGE_URL;
    }
}

async function isImageCORSCompliant(url) {
    try {
        const response = await axios.head(url, { timeout: 1000 });
        if (response.headers['access-control-allow-origin'] === '*') {
            return true;
        }
        return false;
    } catch (err) {
        console.error("Failed to fetch image headers:", err);
        return false;
    }
}

app.get('/generateImage/:prompt', async (req, res, next) => {
    try {
        const query = req.params.prompt;
        const imageUrl = await searchImage(query);
        res.json({ image: imageUrl });
    } catch (err) {
        console.error(err);
        next(err);
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.toString() });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening`);
}
);


// app.use(bodyParser.json());  // This middleware parses incoming requests with JSON payloads



app.post('/vector_db', async (req, res) => {
    const client = new Client({
        connectionString: "postgres://vfqzlejlllqrql:d5d26b2af53f87b9de74464e2f1adbd80a6808c4bdb93d111a29ee4be6c2ceaa@ec2-54-208-84-132.compute-1.amazonaws.com:5432/d7em8s8aiqge1a",
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();
        const { pcaResult, query, model } = req.body;

        await client.query(`
            INSERT INTO cache (query, cube_data, model)
            VALUES ($1, $2, $3)
            ON CONFLICT (model, query) 
            DO UPDATE SET cube_data = EXCLUDED.cube_data
        `, [query, JSON.stringify(pcaResult), model]);
        res.status(200).send("Done");
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");
    } finally {
        client.end(); // Ensure the client connection is closed
    }
});


app.get('/check_query', async (req, res) => {
    const client = new Client({
        connectionString: "postgres://vfqzlejlllqrql:d5d26b2af53f87b9de74464e2f1adbd80a6808c4bdb93d111a29ee4be6c2ceaa@ec2-54-208-84-132.compute-1.amazonaws.com:5432/d7em8s8aiqge1a",
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();
        const { userInputValue, model } = req.query;

        const queryResult = await client.query(`
            SELECT cube_data FROM cache WHERE query = $1 AND model = $2
        `, [userInputValue, model]);

        if (queryResult.rows.length > 0) {
            const cubeData = queryResult.rows[0].cube_data;
            res.json({
                exists: true,
                pcaResult: (typeof cubeData === 'object') ? cubeData : JSON.parse(cubeData)
            });
        } else {
            res.json({ exists: false, message: "No data found for this query" });
        }
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");
    } finally {
        client.end(); // Ensure the client connection is closed
    }
});

app.get('/get_all_queries', async (req, res) => {
    const client = new Client({
        connectionString: "postgres://vfqzlejlllqrql:d5d26b2af53f87b9de74464e2f1adbd80a6808c4bdb93d111a29ee4be6c2ceaa@ec2-54-208-84-132.compute-1.amazonaws.com:5432/d7em8s8aiqge1a",
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();
        const { userInputValue, model } = req.query;

        const queryResult = await client.query(`
            SELECT cube_data FROM cache WHERE query = $1 AND model = $2
        `, [userInputValue, model]);

        if (queryResult.rows.length > 0) {
            const cubeData = queryResult.rows[0].cube_data;
            res.json({
                exists: true,
                pcaResult: (typeof cubeData === 'object') ? cubeData : JSON.parse(cubeData)
            });
        } else {
            res.json({ exists: false, message: "No data found for this query" });
        }
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");
    } finally {
        client.end(); // Ensure the client connection is closed
    }
});


function calculateShannonEntropy(densities) {
    let totalPoints = densities.reduce((sum, val) => sum + val, 0);
    let probabilities = densities.map(density => density / totalPoints);
    let entropy = probabilities.reduce((sum, p) => {
        return p > 0 ? sum - p * Math.log2(p) : sum;
    }, 0);
    return entropy;
}

function calculateModelMetrics(cubeData) {
    // Extract coordinates for pairwise distance calculation
    const coordinates = Object.values(cubeData).map(item => item.coordinates);
    const numOfCubes = coordinates.length;
    const pairwiseDistances = calculateAllPairwiseDistances(coordinates);
    const averagePairwiseDistance = calculateAverage(pairwiseDistances);
    const densities = estimateDensity(coordinates, averagePairwiseDistance);
    const averageDensities = calculateAverage(densities);
    const shannonEntropy = calculateShannonEntropy(densities);

    // Calculate the histogram for pairwise distances
    const pairwiseHistogramData = calculateHistogramBins(pairwiseDistances, 5); // 5 bins for the histogram

    // Calculate the histogram for densities
    const densityHistogramData = calculateHistogramBins(densities, 5); // 5 bins for density histogram

    // Return the calculated metrics
    return {
        numberOfCubes: numOfCubes,
        pairwiseAvgDistance: averagePairwiseDistance,
        boundingBoxVolume: calculateBoundingVolumeArea(coordinates),
        pairwiseHistogramData,
        densityHistogramData,
        vectorPoints: coordinates,
        averageDensities,
        shannonEntropy
    };
}

// Function for calculating all pairwise distances
function calculateAllPairwiseDistances(coordinates) {
    // Flatten the array of distances between each pair of coordinates
    return coordinates.flatMap((coord, index, arr) =>
        arr.slice(index + 1).map(otherCoord => calculateDistance(coord, otherCoord))
    );
}

// Function to calculate the distance between two points in 3D space
function calculateDistance(coord1, coord2) {
    return Math.sqrt(
        Math.pow(coord1.x - coord2.x, 2) +
        Math.pow(coord1.y - coord2.y, 2) +
        Math.pow(coord1.z - coord2.z, 2)
    );
}

// Function for calculating the average of an array
function calculateAverage(array) {
    const sum = array.reduce((acc, val) => acc + val, 0);
    return sum / array.length;
}


function calculateBoundingVolumeArea(coordinates) {
    // Initialize min and max coordinates
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    // Find min and max values for each coordinate axis
    coordinates.forEach(coord => {
        if (coord.x < minX) minX = coord.x;
        if (coord.y < minY) minY = coord.y;
        if (coord.z < minZ) minZ = coord.z;
        if (coord.x > maxX) maxX = coord.x;
        if (coord.y > maxY) maxY = coord.y;
        if (coord.z > maxZ) maxZ = coord.z;
    });

    // Calculate differences for each axis
    let length = maxX - minX;
    let width = maxY - minY;
    let height = maxZ - minZ;

    // Calculate volume
    return length * width * height;
}


function calculateHistogramBins(pairwiseDistances, binCount) {
    const maxDistance = Math.max(...pairwiseDistances);
    const minDistance = Math.min(...pairwiseDistances);
    const binSize = (maxDistance - minDistance) / binCount;
    let bins = new Array(binCount).fill(0);
    let binEdges = [];

    for (let i = 0; i < binCount; i++) {
        binEdges.push(minDistance + i * binSize);
    }
    binEdges.push(maxDistance); // Include the max edge

    pairwiseDistances.forEach(distance => {
        let binIndex = Math.floor((distance - minDistance) / binSize);
        // Make sure the maximum distance falls into the last bin
        binIndex = binIndex === binCount ? binCount - 1 : binIndex;
        bins[binIndex]++;
    });

    return { bins, binEdges };
}

// Function to estimate density based on average pairwise distance
function estimateDensity(coordinates, avgDistance) {
    let halfAvgDistance = avgDistance / 2;
    return coordinates.map(coord => 
        coordinates.filter(otherCoord => 
            calculateDistance(coord, otherCoord) <= halfAvgDistance
        ).length - 1 // Subtract 1 to exclude the point itself
    );
}

app.get('/compare_vectors', async (req, res) => {
    const userInputValue = req.query.query;
    console.info("COMPARE VECTORS INPUT:", userInputValue);

    try {
        const client = new Client({
                        connectionString: "postgres://vfqzlejlllqrql:d5d26b2af53f87b9de74464e2f1adbd80a6808c4bdb93d111a29ee4be6c2ceaa@ec2-54-208-84-132.compute-1.amazonaws.com:5432/d7em8s8aiqge1a",
                        ssl: {
                            rejectUnauthorized: false
                        }
                    });
        await client.connect();

        const queryResult = await client.query(`
            SELECT model, cube_data
            FROM cache
            WHERE query = $1
        `, [userInputValue]);

        // Close the database connection
        client.end();


        // Process each row and ensure cube_data is an object
        const compareData = queryResult.rows.map(row => {
            const model = row.model;
            let cubeData;

            try {
                // Attempt to parse cube_data if it's a string
                cubeData = (typeof row.cube_data === 'string') ? JSON.parse(row.cube_data) : row.cube_data;
            } catch (e) {
                console.error(`Failed to parse cube_data for model ${model}:`, e);
                cubeData = {}; // default to an empty object in case of error
            }

            // Now you have a valid cubeData object to work with
            const metrics = calculateModelMetrics(cubeData); // Assumes calculateModelMetrics is defined correctly
            return { model, ...metrics };
        });

        res.json(compareData);
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");
    }
});



function calculateAttributeMetrics(modelData) {
    let attributesAggregated = {};

    // Iterate over each item in the model data
    Object.values(modelData).forEach(item => {
        const attributes = item.originalRatings;

        // Aggregate attribute values
        for (let [key, value] of Object.entries(attributes)) {
            if (!attributesAggregated[key]) {
                attributesAggregated[key] = [];
            }
            attributesAggregated[key].push(value);
        }
    });

    let attributeMetrics = {};
    for (let [key, values] of Object.entries(attributesAggregated)) {
        const max = Math.max(...values);
        const min = Math.min(...values);
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const stdDev = Math.sqrt(values.map(val => Math.pow(val - avg, 2)).reduce((sum, val) => sum + val, 0) / values.length);

        // Calculate histogram data
        // Assuming 10 bins for simplicity, each bin representing an interval [0-1, 1-2, ..., 9-10]
        const bins = Array(10).fill(0);
        values.forEach(value => {
            const binIndex = Math.floor(value); // Assuming value is from 0 to 10
            if (binIndex >= 0 && binIndex < bins.length) {
                bins[binIndex]++;
            }
        });

        attributeMetrics[key] = { max, min, avg, stdDev, histogram: bins };
    }

    return attributeMetrics;
}


app.get('/get_model_data', async (req, res) => {
    const userInputValue = req.query.query;
    console.info("COMPARE ATTRIBUTES:", userInputValue);

    try {
        const client = new Client({
            connectionString: "postgres://vfqzlejlllqrql:d5d26b2af53f87b9de74464e2f1adbd80a6808c4bdb93d111a29ee4be6c2ceaa@ec2-54-208-84-132.compute-1.amazonaws.com:5432/d7em8s8aiqge1a",
            ssl: {
                rejectUnauthorized: false
            }
        });
        await client.connect();

        const queryResult = await client.query(`
            SELECT model, cube_data
            FROM cache
            WHERE query = $1
        `, [userInputValue]);

        client.end();

        const attributeMetrics = queryResult.rows.map(row => {
            let cubeData;
            try {
                cubeData = (typeof row.cube_data === 'string') ? JSON.parse(row.cube_data) : row.cube_data;
            } catch (e) {
                console.error(`Failed to parse cube_data for model ${row.model}:`, e);
                return { model: row.model, error: "Failed to parse cube data" };
            }

            try {
                const metrics = calculateAttributeMetrics(cubeData);
                return { model: row.model, ...metrics };
            } catch (e) {
                console.error(`Error in calculateAttributeMetrics for model ${row.model}:`, e);
                return { model: row.model, error: "Error in attribute metrics calculation" };
            }
        });

        res.json(attributeMetrics);

    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");
    }
});
