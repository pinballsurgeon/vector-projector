const express = require('express');
const app = express();

// Serve static files from the "public" directory
app.use(express.static('public'));

const port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
