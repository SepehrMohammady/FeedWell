// Simple OAuth callback server for FeedWell
const express = require('express');
const path = require('path');

const app = express();
const PORT = 8081;

// Serve static files from web directory
app.use(express.static(path.join(__dirname, '../web')));

// OAuth callback route
app.get('/oauth-callback', (req, res) => {
  res.sendFile(path.join(__dirname, '../web/oauth-callback.html'));
});

// Default route
app.get('/', (req, res) => {
  res.send('FeedWell OAuth Server is running!');
});

app.listen(PORT, () => {
  console.log(`OAuth callback server running on http://localhost:${PORT}`);
});
