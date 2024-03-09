import express from 'express';
import { HfInference } from '@huggingface/inference';
import MistralClient from '@mistralai/mistralai';
import fs from 'fs';
import * as ss from 'simple-statistics';
import * as math from 'mathjs';
import mlMatrix from 'ml-matrix';
import { createRequire } from "module"; 
import bodyParser from 'body-parser';
import pg from 'pg';
import {BedrockRuntimeClient, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const { Client } = pg;

const require = createRequire(import.meta.url);
const axios = require('axios'); 

const { Configuration, OpenAIApi } = require("openai");

const GoogleImages = require('google-images');
const client = new GoogleImages(process.env.GOOG_IMG_1, process.env.GOOG_IMG_2);

const hf_key = process.env.hf_key_1;

const configuration = new Configuration({
  apiKey: process.env.openai_wow_wow,
});
const openai = new OpenAIApi(configuration);

const app = express();
const inference = new HfInference(hf_key);

app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https')
      res.redirect(`https://${req.header('host')}${req.url}`)
    else
      next()
  });

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


function preprocessData(data) {

    const sampleItem = data[Object.keys(data)[0]];
    const validNestedKeys = Object.keys(sampleItem);
    

    const filteredData = Object.entries(data).reduce((acc, [key, value]) => {
        const itemKeys = Object.keys(value);

        const isValidItem = itemKeys.length === validNestedKeys.length && 
                            itemKeys.every(k => validNestedKeys.includes(k) && typeof value[k] === 'number');
        
        if (isValidItem) {
            acc[key] = value;
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

        const keys = Object.keys(preprocessedData);
        console.log(`PCA keys: ${keys}`);

        const values = Object.values(preprocessedData).map(obj => Object.values(obj));

        const meanValues = values[0].map((_, i) => ss.mean(values.map(row => row[i])));
        const centeredData = values.map(row => row.map((value, i) => value - meanValues[i]));

        const covMatrix = covarianceMatrix(centeredData);

        const M = new mlMatrix.Matrix(covMatrix);

        const eigendecomposition = new mlMatrix.EigenvalueDecomposition(M);
        const eigenvalues = eigendecomposition.realEigenvalues;
        const eigenvectors = eigendecomposition.eigenvectorMatrix;

        const sortedEigenvaluesIndices = eigenvalues
            .map((val, idx) => [val, idx])
            .sort(([a], [b]) => b - a)
            .map(([, idx]) => idx);
        const sortedEigenvectors = sortedEigenvaluesIndices.map(i => eigenvectors.getColumn(i));

        const selectedEigenvectors = sortedEigenvectors.slice(0, 3);

        const transformedData = centeredData.map(row => selectedEigenvectors.map(eigenvector => math.dot(row, eigenvector)));
    
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


export const invokeTitanTextExpressV1 = async (prompt, modelId) => {
    const client_bd = new BedrockRuntimeClient( { region: 'us-east-1' } );

    const payload = {
        prompt: prompt,
        max_tokens_to_sample: 100,
        temperature: 0.9,
        top_p: 0.9,
        top_k: 150,
    };

    const command = new InvokeModelWithResponseStreamCommand ({
        body: JSON.stringify(payload),
        contentType: 'application/json',
        accept: 'application/json',
        modelId,
    });

    try {
        const response = await client_bd.send(command);

        const chunks = [];

        for await (const event of response.body) {
            if (event.chunk && event.chunk.bytes) {
                const chunk = JSON.parse(Buffer.from(event.chunk.bytes).toString("utf-8"));
                chunks.push(chunk.completion);
            } else if (
                event.internalServerException ||
                event.modelStreamErrorException ||
                event.throttlingException ||
                event.validationException
            ) {
                console.error(event);
                break;
            }
        };

        const res_complete = chunks.join('');
        console.log(res_complete);
        return res_complete;

    } catch (err) {
        console.error(err);
    }
};



export const claudethree = async (prompt, modelId) => {
    try {
        const anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_KEY,
        });
        
        const msg = await anthropic.messages.create({
            model: "claude-3-opus-20240229",
            max_tokens: 1000,
            temperature: 0,
            messages: [{"role": "user", "content": prompt}]
        });

        console.log('CLAUDE 3', msg);

        const response = msg.content[0];
        const text = response.text;

        return text;

    } catch (err) {
        console.error(err);
    }
};


async function gemini_generateContent(prompt) {

    const genAI = new GoogleGenerativeAI(process.env.GCP_API_KEY);

    const model = "gemini-1.0-pro-001";
    const generativeModel = genAI.getGenerativeModel({
      model: model,
      generation_config: {
        max_output_tokens: 2048,
        temperature: 0.6,
        top_p: 0.9,
        top_k: 100
      },
      safety_settings: [
              {
                  "category": "HARM_CATEGORY_HATE_SPEECH",
                  "threshold": "BLOCK_NONE"
              },
              {
                  "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                  "threshold": "BLOCK_NONE"
              },
              {
                  "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                  "threshold": "BLOCK_NONE"
              },
              {
                  "category": "HARM_CATEGORY_HARASSMENT",
                  "threshold": "BLOCK_NONE"
              }
          ]
    });

    const result = await generativeModel.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    return text;

  };


app.post('/ask', async (req, res, next) => {
    try {
        const userInput = req.body.prompt;
        const model = req.body.model || 'gpt2'; 

        if (['text-davinci-003', 'text-davinci-002', 'gpt-3.5-turbo-instruct'].includes(model)) {
            const gptResponse = await openai.createCompletion({
                model: model,
                prompt: userInput,
                max_tokens: 200
            });
            const clean_resp = gptResponse.data.choices[0].text.trim().replace(/\//g, "").replace(/\\/g, "");
            res.json({ response: clean_resp });

        } else if (['gpt-3.5-turbo', 'gpt-4', 'gpt-4-0125-preview', 'gpt-4-1106-preview', 'gpt-4-turbo-preview'].includes(model)) {

            const gptResponse = await openai.createChatCompletion({
                model: model,
                messages: [{ role: "user", content: userInput }],
              });

            const clean_resp = gptResponse.data.choices[0].message.content.trim().replace(/\//g, "").replace(/\\/g, "");
            res.json({ response: clean_resp });
      
        } else if (['gemini-pro'].includes(model)) {

            const prompt = userInput;
            const results = await gemini_generateContent(prompt);

            const clean_resp = results.trim().replace(/\//g, "").replace(/\\/g, "");
            res.json({ response: clean_resp });

        } else if (['claude-v2'].includes(model)) {

            const prompt = userInput;
            const results = await invokeTitanTextExpressV1(prompt, 'anthropic.claude-v2');

            const clean_resp = results.trim().replace(/\//g, "").replace(/\\/g, "");
            res.json({ response: results });          
            
        } else if (['claude-v3'].includes(model)) {

            const prompt = userInput;
            const results = await claudethree(prompt, 'anthropic.claude-3-sonnet-20240229-v1:0');

            res.json({ response: results });          

        } else if (['mistral-medium'].includes(model)) {

            const apiKey = process.env.MISTRAL_API_KEY;
            const client_ms = new MistralClient(apiKey);
            
            const chatResponse = await client_ms.chat({
              model: 'mistral-medium',
              messages: [{role: 'user', content: userInput}],
            });

            const clean_resp = chatResponse.choices[0].message.content.trim().replace(/\//g, "").replace(/\\/g, "");
            res.json({ response: clean_resp });

        } else if (['mistral-large'].includes(model)) {

            const apiKey = process.env.MISTRAL_API_KEY;
            const client_ms = new MistralClient(apiKey);
            
            const chatResponse = await client_ms.chat({
              model: 'mistral-large-latest',
              messages: [{role: 'user', content: userInput}],
            });

            const clean_resp = chatResponse.choices[0].message.content.trim().replace(/\//g, "").replace(/\\/g, "");
            res.json({ response: clean_resp });

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
        const images = await client.search(query, {size: 'small', safe: 'high'});

        for (let image of images) {
            const imageUrl = image.url;
            if (imageUrl.startsWith("https://") && await isImageCORSCompliant(imageUrl)) {
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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.toString() });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening`);
}
);


app.post('/vector_db', async (req, res) => {
    const client = new Client({
        connectionString: process.env.pgsql_conn,
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
        client.end();
    }
});


app.get('/check_query', async (req, res) => {
    const client = new Client({
        connectionString: process.env.pgsql_conn,
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
        client.end();
    }
});

app.get('/get_all_queries', async (req, res) => {
    const client = new Client({
        connectionString: process.env.pgsql_conn,
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
        client.end();
    }
});


app.get('/get_library', async (req, res) => {
    const client = new Client({
        connectionString: process.env.pgsql_conn,
        ssl: {
            rejectUnauthorized: false
        }
    });
    try {
        await client.connect();

        const queryResult = await client.query(`
            SELECT query, count(*) as models FROM cache GROUP BY query ORDER BY models DESC
        `);

        const queries = queryResult.rows.map(row => ({ 
            name: row.query, 
            models: row.models 
        }));

        res.json({
            exists: queries.length > 0,
            queries: queries
        });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).send("Internal server error");
    } finally {
        await client.end();
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

    const validCoordinates = Object.values(cubeData).filter(item => 
        item.coordinates && 
        !isNaN(item.coordinates.x) && 
        !isNaN(item.coordinates.y) && 
        !isNaN(item.coordinates.z)    
    ).map(item => item.coordinates);

    const numOfCubes = validCoordinates.length;
    const pairwiseDistances = calculateAllPairwiseDistances(validCoordinates);
    const averagePairwiseDistance = calculateAverage(pairwiseDistances);
    const densities = estimateDensity(validCoordinates, averagePairwiseDistance);
    const averageDensities = calculateAverage(densities);
    const shannonEntropy = calculateShannonEntropy(densities);

    const pairwiseHistogramData = calculateHistogramBins(pairwiseDistances, 5);

    const densityHistogramData = calculateHistogramBins(densities, 5);

    const boundingBoxVolume = validCoordinates.length > 0 ? calculateBoundingVolumeArea(validCoordinates) : 0;

    return {
        numberOfCubes: numOfCubes,
        pairwiseAvgDistance: averagePairwiseDistance,
        boundingBoxVolume,
        pairwiseHistogramData,
        densityHistogramData,
        vectorPoints: validCoordinates,
        averageDensities,
        shannonEntropy
    };
}

function calculateAllPairwiseDistances(coordinates) {
    return coordinates.flatMap((coord, index, arr) =>
        arr.slice(index + 1).map(otherCoord => calculateDistance(coord, otherCoord))
    );
}

function calculateDistance(coord1, coord2) {
    return Math.sqrt(
        Math.pow(coord1.x - coord2.x, 2) +
        Math.pow(coord1.y - coord2.y, 2) +
        Math.pow(coord1.z - coord2.z, 2)
    );
}

function calculateAverage(array) {
    const sum = array.reduce((acc, val) => acc + val, 0);
    return sum / array.length;
}


function calculateBoundingVolumeArea(coordinates) {

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    coordinates.forEach(coord => {
        if (coord.x < minX) minX = coord.x;
        if (coord.y < minY) minY = coord.y;
        if (coord.z < minZ) minZ = coord.z;
        if (coord.x > maxX) maxX = coord.x;
        if (coord.y > maxY) maxY = coord.y;
        if (coord.z > maxZ) maxZ = coord.z;
    });

    let length = maxX - minX;
    let width = maxY - minY;
    let height = maxZ - minZ;

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
    binEdges.push(maxDistance); 

    pairwiseDistances.forEach(distance => {
        let binIndex = Math.floor((distance - minDistance) / binSize);

        binIndex = binIndex === binCount ? binCount - 1 : binIndex;
        bins[binIndex]++;
    });

    return { bins, binEdges };
}

function estimateDensity(coordinates, avgDistance) {
    let halfAvgDistance = avgDistance / 2;
    return coordinates.map(coord => 
        coordinates.filter(otherCoord => 
            calculateDistance(coord, otherCoord) <= halfAvgDistance
        ).length - 1 
    );
}

app.get('/compare_vectors', async (req, res) => {
    const userInputValue = req.query.query;
    console.info("COMPARE VECTORS INPUT:", userInputValue);

    try {
        const client = new Client({
                        connectionString: process.env.pgsql_conn,
                        ssl: {
                            rejectUnauthorized: false
                        }
                    });
        await client.connect();

        const queryResult = await client.query(`
            SELECT model, cube_data
            FROM cache
            WHERE query = $1
            ORDER BY LENGTH(cube_data #>> '{}') desc
        `, [userInputValue]);

        client.end();

        const compareData = queryResult.rows.map(row => {
            const model = row.model;
            let cubeData;

            try {

                cubeData = (typeof row.cube_data === 'string') ? JSON.parse(row.cube_data) : row.cube_data;
            } catch (e) {
                console.error(`Failed to parse cube_data for model ${model}:`, e);
                cubeData = {};
            }

            const metrics = calculateModelMetrics(cubeData);
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

    Object.values(modelData).forEach(item => {
        const attributes = item.originalRatings;

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

        const bins = Array(10).fill(0);
        values.forEach(value => {
            const binIndex = Math.floor(value); 
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
            connectionString: process.env.pgsql_conn,
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


app.post('/users', async (req, res) => {
    const client = new Client({
        connectionString: process.env.pgsql_conn,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const { email, username } = req.body;

    try {
        await client.connect();
        
        const checkUserExistsQuery = `
            SELECT * FROM users WHERE email = $1
        `;
        const existingUserResult = await client.query(checkUserExistsQuery, [email]);
        
        if (existingUserResult.rows.length > 0) {

            res.json({
                message: "User already exists.",
                user: existingUserResult.rows[0]
            });
        } else {

            const insertQuery = `
                INSERT INTO users (email, username) VALUES ($1, $2) RETURNING *
            `;
            const newUserResult = await client.query(insertQuery, [email, username]);
            
            res.json({
                message: "User added successfully.",
                user: newUserResult.rows[0]
            });
        }
    } catch (error) {
        console.error("Error processing user request:", error);
        res.status(500).send("Internal server error");
    } finally {
        client.end();
    }
});

app.delete('/users/:email', async (req, res) => {
    const client = new Client({
        connectionString: process.env.pgsql_conn,
        ssl: {
            rejectUnauthorized: false
        }
    });

    const { email } = req.params;

    try {
        await client.connect();
        
        const deleteQuery = `
            DELETE FROM users WHERE email = $1
        `;
        await client.query(deleteQuery, [email]);
        
        res.json({ message: "User deleted successfully" });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).send("Internal server error");
    } finally {
        client.end();
    }
});
