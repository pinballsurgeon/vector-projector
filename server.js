const express = require('express');
const path = require('path');
const { HfInference } = require("@huggingface/inference");

const app = express();
const inference = new HfInference("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");

//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.static('public'));

app.post('/ask', async (req, res) => {
    const userInput = req.body.prompt;
    const { generated_text } = await inference.textGeneration({
        model: 'gpt2',
        inputs: userInput
    });
    res.json({ response: generated_text });
});

app.listen(3000, () => console.log('Server listening on port 3000'));
