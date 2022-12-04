const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvyuz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        await client.connect();
        console.log('Mongodb is connected');
    }
    catch (err) {

    }
    finally {
        // client.close();
    }
}

run().catch(console.dir)



app.get('/', (req, res) => {
    res.send('Hello from Squeep server!');
});

expressServer.listen(port, () => console.log('Server running at port ' + port));