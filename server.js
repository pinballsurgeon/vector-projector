import express from 'express';
import path from 'path';
import { HfInference } from '@huggingface/inference';
// import { Configuration, OpenAIApi } from 'openai';
import fs from 'fs';
import * as ss from 'simple-statistics';
import numeric from 'numeric';
import * as math from 'mathjs';
import mlMatrix from 'ml-matrix';
import { createRequire } from "module"; // Bring in the ability to create the 'require' method
import bodyParser from 'body-parser';
import pg from 'pg';
const { Client } = pg;


const require = createRequire(import.meta.url); // construct the require method
const axios = require('axios'); // Axios for making requests

const { Configuration, OpenAIApi } = require("openai");
let imageCache = {};  // Create an in-memory image cache

// import the Google Images client at the top of your file
const GoogleImages = require('google-images');
// create an instance of the Google Images client
const client = new GoogleImages('17c526ffb4fb140f8', 'AIzaSyAKyI2qTZ-5bfy5HckFSd1lmTD5V4ZphU8');

const hf_key = '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';

// AIzaSyAKyI2qTZ-5bfy5HckFSd1lmTD5V4ZphU8
// 17c526ffb4fb140f8
// Initialize OpenAI with API Key
const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

const app = express();
const inference = new HfInference(hf_key);

app.use(express.json());
app.use(express.static('public'));

function covarianceMatrix(data) {
    const means = data[0].map((col, i) => math.mean(data.map(row => row[i])));
    return data[0].map((col, j) => 
        data[0].map((col, i) => 
            math.mean(data.map(row => (row[i] - means[i]) * (row[j] - means[j])))));
}


function performPCA(data) {

    console.time("performPCA");
    console.log(data);

    console.time("init");
    const keys = Object.keys(data);
    const values = Object.values(data).map(obj => Object.values(obj)); // Convert objects to arrays
    console.timeEnd("init");
    console.log(values);

    console.time("centering");
    // Center the data
    const meanValues = values[0].map((_, i) => ss.mean(values.map(row => row[i])));

    const centeredData = values.map(row => row.map((value, i) => value - meanValues[i]));
    console.timeEnd("centering");
    console.log(centeredData);

    console.time("covMatrix");
    // Calculate covariance matrix
    const covMatrix = covarianceMatrix(centeredData);
    console.timeEnd("covMatrix");
    console.log(covMatrix);

    console.time("eigendecomposition");
    // Create a new ml-matrix instance from the covariance matrix
    const M = new mlMatrix.Matrix(covMatrix);

    // Compute the eigenvectors and eigenvalues of the covariance matrix
    const eigendecomposition = new mlMatrix.EigenvalueDecomposition(M);
    const eigenvalues = eigendecomposition.realEigenvalues;
    const eigenvectors = eigendecomposition.eigenvectorMatrix;
    console.timeEnd("eigendecomposition");

    console.time("sorting");
    // Sort the eigenvectors based on the eigenvalues
    const sortedEigenvaluesIndices = eigenvalues
        .map((val, idx) => [val, idx]) // attach the original index positions [eigenvalue, index]
        .sort(([a], [b]) => b - a) // sort based on the eigenvalue in decreasing order
        .map(([, idx]) => idx); // discard the sorted eigenvalues, we just want the indices
    const sortedEigenvectors = sortedEigenvaluesIndices.map(i => eigenvectors.getColumn(i));

    console.timeEnd("sorting");

    console.time("transformation");
    // Select the first three eigenvectors
    const selectedEigenvectors = sortedEigenvectors.slice(0, 3);

    // Transform the data into the new space
    const transformedData = centeredData.map(row => selectedEigenvectors.map(eigenvector => math.dot(row, eigenvector)));
    console.timeEnd("transformation");

    console.time("finalizing");
    // Construct the result object
    const result = {};
    keys.forEach((key, i) => {
    result[key] = {
        x: transformedData[i][0],
        y: transformedData[i][1],
        z: transformedData[i][2]
    };
    });
    console.timeEnd("finalizing");

    console.timeEnd("performPCA");

    return result;
}

app.post('/performPCA', (req, res, next) => {
    try {
        const data = req.body;
        const result = performPCA(data);
        res.json(result);
    } catch (err) {
        console.error(err);
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


// // This code is for v4 of the openai package: npmjs.com/package/openai
// import OpenAI from "openai";

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// const response = await openai.chat.completions.create({
//   model: "gpt-3.5-turbo",
//   messages: [
//     {
//       "role": "user",
//       "content": ""
//     }
//   ],
//   temperature: 1,
//   max_tokens: 256,
//   top_p: 1,
//   frequency_penalty: 0,
//   presence_penalty: 0,
// });

app.post('/ask', async (req, res, next) => {
    try {
        const userInput = req.body.prompt;

        const model = req.body.model || 'gpt2'; // Provide a default value

        // If model is GPT-3, call OpenAI's API
        if (model === 'gpt-3') {

            const gptResponse = await openai.createCompletion({
                model: "text-davinci-003",
                prompt: userInput,
                max_tokens: 200
            });

            // console.log("CREATE CHAT COMPLETION");
            // const gptResponse = await openai.createChatCompletion({
            //     model: "gpt-3.5-turbo",
            //     messages: [{ role: "user", content: userInput }],
            //   });

            // console.log(gptResponse.data.choices);
            // console.log("START CHOICES");
            // console.log(gptResponse.data.choices[0]);
            // console.log("START MESSAGES");
            
            
            // console.log(gptResponse.data.choices[0].message.content);
            res.json({ response: gptResponse.data.choices[0].text.trim() });
            // res.json({ response: gptResponse.data.choices[0].message.content });
      
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
        console.error(err);
        next(err);
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
        const images = await client.search(query);

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
  console.log(`Server listening on port ${port}`);
}
);


app.use(bodyParser.json());  // This middleware parses incoming requests with JSON payloads

app.post('/vector_db', async (req, res) => {
    try {
        const { pcaResult, query } = req.body;  // Destructure the JSON payload

        console.log(`We made it!`);

        const client = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: {
                rejectUnauthorized: false
            }
        });

        await client.connect();

        await client.query('INSERT INTO cache (query, cube_data) VALUES ($1, $2) ON CONFLICT (query) DO UPDATE SET cube_data = $2', [query, JSON.stringify(pcaResult)]);

        client.end();
    
        res.status(200).send("Done");  // Send a success response
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");  // Send a generic error response
    }
});


