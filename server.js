const express = require('express');
const path = require('path');
const { HfInference } = require("@huggingface/inference");
const fs = require('fs');

const app = express();
const inference = new HfInference("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");

app.use(express.json());
app.use(express.static('public'));

app.get('/prompt', (req, res, next) => {
    fs.readFile('public/listPrompts.json', 'utf8', (err, data) => {
        if (err) {
            console.error(err);
            return next(err);
        } else {
            const prompts = JSON.parse(data);
            res.json({ prompt: prompts[0] });
        }
    });
});

app.post('/ask', async (req, res, next) => {
    try {
        const userInput = req.body.prompt;
        const model = req.body.model || 'gpt2'; // Provide a default value
        const { generated_text } = await inference.textGeneration({
            model: model,
            inputs: userInput,
            max_length: 1000
        });
        res.json({ response: generated_text });
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
            appendLog('Models fetched successfully'); // Added this line
            res.json(models);
        }
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.toString() });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
