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
        const max_length = req.body.max_length || 1000;
        const min_length = req.body.min_length || undefined;
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

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: err.toString() });
});

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
