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
        const db = client.db("chat_application_DB");
        const usersCollection = db.collection('users');
        const friendsCollection = db.collection('friends');

        // Add user api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // find friend api
        app.get('/find-people', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const currentUser = await usersCollection.findOne(query);
            if (currentUser) {
                const friends = await friendsCollection.find().toArray();
                const neFilter = friends.filter(user => user.friendship.includes(currentUser.email)).map(user => user.friendship.filter(eml => eml !== currentUser.email)).map(email => email[0]);
                const users = await usersCollection.find({ email: { $nin: [...neFilter, email] } }).toArray();
                const result = users.map(user => {
                    return {
                        name: user.name,
                        email: user.email,
                        username: user.username,
                        _id: user._id,
                        img: user.img
                    }
                });
                res.send(result);
            }
            else {
                res.send({ code: 404 });
            }
        });

        //  Get all requested friends
        app.get('/sr-friends', async (req, res) => {
            const { email } = req.query;
            const friends = await friendsCollection.find().toArray();
            const result = friends.filter(friend => friend.friendship.includes(email)).filter(f => f.status === 'pending');
            res.send(result);
        })



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