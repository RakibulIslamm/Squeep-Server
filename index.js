const express = require('express');
require('dotenv').config();
const cors = require('cors');


const app = express();
const port = process.env.PORT || 5000;

const http = require('http')
const expressServer = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
    res.send('Hello from Squeep server!');
})



expressServer.listen(port, () => console.log('Server running at port ' + port));