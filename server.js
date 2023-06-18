const express = require('express');
const path = require('path');
const { HfInference } = require("@huggingface/inference");
const fs = require('fs');

const app = express();
const inference = new HfInference("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");

app.use(express.json());
app.use(express.static('public'));

app.get('/prompt', (req, res) => {
    fs.readFile('public/listPrompts.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        } else {
            const prompts = JSON.parse(data);
            res.json({ prompt: prompts[0] });
        }
    });
});


// LLM INTERACTION
app.post('/ask', async (req, res) => {
    const userInput = req.body.prompt;
    const model = req.body.model;
    const { generated_text } = await inference.textGeneration({
        model: model,
        inputs: userInput,
        max_length: 1000
    });
    res.json({ response: generated_text });
});


// MODELS
app.get('/models', (req, res) => {
    fs.readFile('public/llmModels.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            res.sendStatus(500);
        } else {
            const models = JSON.parse(data);
            res.json(models);
        }
    });
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
