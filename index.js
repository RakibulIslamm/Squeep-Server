const express = require('express');
require('dotenv').config();
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');


const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const expressServer = http.createServer(app);
const io = new Server(expressServer, {
    cors: {
        origin: ['http://localhost:3000']
    }
});


io.on("connection", (socket) => {
    console.log(socket.id);
});




app.get('/', (req, res) => {
    res.send('Hello from Squeep server!');
});

expressServer.listen(port, () => console.log('Server running at port ' + port));