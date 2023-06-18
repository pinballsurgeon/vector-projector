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
        model: 'tiiuae/falcon-7b',
        inputs: userInput,
        max_length: 1000
    });
    res.json({ response: generated_text });
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
