const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');


const app = express();
const port = process.env.PORT || 5000;
const corsOptions = {
    origin: '*',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200,
}

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

const expressServer = http.createServer(app);
const io = new Server(expressServer, {
    cors: {
        origin: "*",
        credentials: true,
    }
});


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qvyuz.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const activeUsers = new Set();

const run = async () => {
    try {
        await client.connect();
        console.log('Mongodb is connected');
        const db = client.db("chat_application_DB");
        const usersCollection = db.collection('users');
        const friendsCollection = db.collection('friends');
        const conversationsCollection = db.collection('conversations');
        const messagesCollection = db.collection('messages');

        // Add user api
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        // Get single user api
        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        // Get single user by username
        app.get('/profile', async (req, res) => {
            const username = req.query.username;
            const query = { username: username }
            const user = await usersCollection.findOne(query);
            res.send(user);
        });

        // Update profile
        app.post('/update-profile/:id', async (req, res) => {
            const { id } = req.params;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: req.body
            }
            try {
                const result = await usersCollection.updateOne(filter, updatedDoc);
                res.send(result);
            }
            catch (err) {
                throw new Error(err);
            }
        })

        // Update profile Photo
        app.post('/update-profile-photo/:id', async (req, res) => {
            const { id } = req.params;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    img: req.body.img
                }
            }
            try {
                const result = await usersCollection.updateOne(filter, updatedDoc);
                res.send(result);
            }
            catch (err) {
                throw new Error(err);
            }
        });

        // Update profile Photo
        app.post('/update-cover-photo/:id', async (req, res) => {
            const { id } = req.params;
            const filter = { _id: ObjectId(id) };
            const updatedDoc = {
                $set: {
                    coverImg: req.body.img
                }
            }
            try {
                const result = await usersCollection.updateOne(filter, updatedDoc, { upsert: true });
                res.send(result);
            }
            catch (err) {
                throw new Error(err);
            }
        });

        // find friend api
        app.get('/new-people', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const currentUser = await usersCollection.findOne(query);
            if (currentUser) {
                const friends = await friendsCollection.find().toArray();
                const neFilter = friends.filter(user => user.friendship.includes(currentUser.email)).map(user => user.friendship.filter(eml => eml !== currentUser.email)).map(email => email[0]);
                const users = await usersCollection.find({ email: { $nin: [...neFilter, email] } }).sort({ _id: -1 }).limit(7).toArray();
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

        // Get friend requests
        app.get('/friend-request', async (req, res) => {
            const { email } = req.query;
            const query = { receiver: email };
            const users = await friendsCollection
                .find(query)
                .sort({ timestamp: -1 })
                .toArray();
            const result = users.filter(user => user.status === 'pending');
            res.send(result);
        });

        //  Get all requested friends
        app.get('/requested-friends', async (req, res) => {
            const { email } = req.query;
            const friends = await friendsCollection.find().toArray();
            const result = friends.filter(friend => friend.friendship.includes(email)).filter(f => f.status === 'pending');
            res.send(result);
        })

        // Accept Friend Request
        app.put('/accept/:id', async (req, res) => {
            const { id } = req.params;
            const filter = { _id: ObjectId(id) }
            const updateDoc = { status: 'friend' }
            const unsetProperty = { requester: '', receiver: '', timestamp: '' }
            const result = await friendsCollection.updateOne(filter, { $set: updateDoc, $unset: unsetProperty });
            res.send(result);
        });

        // Cancel Friend friend Request
        app.delete('/cancel/:id', async (req, res) => {
            const { id } = req.params;
            const query = { _id: ObjectId(id) }
            const result = await friendsCollection.deleteOne(query)
            res.send(result);
        })

        // Get all friends
        app.get('/friends', async (req, res) => {
            const { email } = req.query;
            // console.log(email);
            const filter = { friendship: email, status: 'friend' }
            const result = await friendsCollection.find(filter).toArray();
            res.send(result)
        });

        // Get conversations
        app.get('/conversations', async (req, res) => {
            const { email } = req.query;
            const filter = { users: { $elemMatch: { email: email } }, isFriend: true };
            const result = await conversationsCollection.find(filter, { sort: { timestamp: -1 } }).toArray();
            res.send(result);
        });

        // Get Searched Conversations
        app.get('/search-conversations', async (req, res) => {
            const { search, email } = req.query;
            const filter = { users: { $elemMatch: { email: email } }, isFriend: true };
            const conversations = await conversationsCollection.find(filter, { sort: { timestamp: -1 } }).toArray();
            const result = conversations.filter(conversation => conversation.users.find(user => user.email !== email).name.toLowerCase().includes(search.toLocaleLowerCase()));
            res.send(result);
        });

        // Get single conversation by id
        app.get('/conversation/:id', async (req, res) => {
            const { id } = req.params;
            const result = await conversationsCollection.findOne({ _id: ObjectId(id) });
            res.send(result);
        });

        // Get Messages
        app.get('/messages', async (req, res) => {
            try {
                const { conversationId } = req.query;
                const filter = { conversationId: conversationId }
                const isExist = await conversationsCollection.findOne({ _id: ObjectId(conversationId) });
                if (isExist == null) {
                    throw "Not found";
                };
                const result = await messagesCollection.find(filter, { sort: { timestamp: -1 } }).toArray();
                res.send(result);
            }
            catch (err) {
                res.send(err);
            }
        });

        io.on("connection", (socket) => {
            socket.on('join', function (data) {
                // console.log(data);
                // io.emit('welcome', { mesage: `Welcome back ${data}` })
            });

            socket.on("new_user", function (email) {
                socket.userId = email;
                // const emailArr = [...activeUsers];
                activeUsers.add(email);

                io.emit("new_user", [...activeUsers]);
            });

            socket.on('leavedUser', email => {
                activeUsers.delete(email);
                io.emit("new_user", [...activeUsers]);
            });

            socket.on('room', room => {
                socket.join(room)
                socket.on('id', ({ peerId, videoCall, caller }) => {
                    socket.to(room).emit('id', ({ peerId, videoCall, caller }));
                })
                socket.on('callEnd', data => {
                    socket.to(room).emit('callEnd', data);
                })
                socket.on('callAnswered', data => {
                    socket.to(room).emit('callAnswered', data);
                })
                socket.on('videoActive', data => {
                    socket.to(room).emit('videoActive', data);
                })
                socket.on('users', data => {
                    io.to(room).emit('users', data);
                })
            });

            socket.on('typing', data => {
                console.log(data);
            })

            socket.on("disconnect", () => {
                activeUsers.delete(socket.userId);
                io.emit("new_user", [...activeUsers]);
            });

            // Send Friend Request
            app.post('/send-request', async (req, res) => {
                const { currentUser, requestedPerson, conversationId } = req.body;
                const friend = {
                    friendship: [currentUser.email, requestedPerson.email],
                    requester: currentUser.email,
                    receiver: requestedPerson.email,
                    users: [
                        currentUser, requestedPerson
                    ],
                    status: 'pending',
                    timestamp: new Date().getTime(),
                    conversationId
                }
                const friends = await friendsCollection.find().toArray();
                const isExist = friends.find(f => f.friendship.includes(currentUser.email) && f.friendship.includes(requestedPerson.email));
                if (isExist) {
                    res.send({ message: 'Already Added' });
                }
                else {
                    const result = await friendsCollection.insertOne(friend);
                    const newFriend = await friendsCollection.findOne({ _id: ObjectId(result.insertedId) });
                    io.emit('newFriendReq', newFriend);
                    res.send(result);
                }
            });


            // Add conversation
            app.post('/conversations', async (req, res) => {
                try {
                    const conversation = req.body;
                    const result = await conversationsCollection.insertOne(conversation);
                    io.emit('conversation', conversation);
                    res.send(result);
                }
                catch (err) {
                    res.send({ message: 'Internal server error' })
                }
            });

            // Update conversation status
            app.put('/conversation-status/:id', async (req, res) => {
                const { id } = req.params;
                const isFriend = req.body;
                const filter = { _id: ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        isFriend: isFriend.isFriend,
                        timestamp: new Date().getTime()
                    }
                }
                const result = await conversationsCollection.updateOne(filter, updatedDoc, { upsert: true });
                const conversation = await conversationsCollection.findOne(filter);
                io.emit("conversation", conversation);
                res.send(result)

            });

            // Update conversation last message
            app.put('/conversations/:id', async (req, res) => {
                const { id } = req.params;
                const data = req.body;
                const filter = { _id: ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        lastMessage: data.messageText,
                        sender: data.email,
                        timestamp: data.timestamp,
                        img: data.img,
                        unseenMessages: data.unseenMessages + 1
                    }
                }
                const result = await conversationsCollection.updateOne(filter, updatedDoc);
                // console.log(result);
                if (result.modifiedCount) {
                    io.emit("updateConversation", ({ data, id }));
                }
                res.send(result)

            })

            // Update conversation last seen
            app.put('/last-seen/:id', async (req, res) => {
                const { id } = req.params;
                const data = req.body;
                const filter = { _id: ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        lastSeen: {
                            message: data.message,
                            timestamp: data.timestamp,
                            whoSeen: data.email
                        }
                    }
                }
                const result = await conversationsCollection.updateOne(filter, updatedDoc, { upsert: true });
                // console.log(result);
                if (result.modifiedCount) {
                    io.emit("lastSeen", ({ data, id }));
                }
                res.send(result)
            })

            // Send Message
            // socket.on('getMessage', async (messageInfo) => {
            //     try {
            //         const message = messageInfo;
            //         const result = await messagesCollection.insertOne(message);
            //         io.emit("message", messageInfo);
            //         io.emit("messageResult", result);
            //     }
            //     catch (err) {

            //     }
            // })

            app.post('/send-message', async (req, res) => {
                try {
                    const message = req.body;
                    // console.log(message);
                    const result = await messagesCollection.insertOne(message);
                    if (result.insertedId) {
                        res.send(result);
                        io.emit("message", message);
                    }
                }
                catch (err) {

                }
            });

            // Handle message Notification
            socket.on('message-notification', async ({ id, data }) => {
                // console.log(id);
                const filter = { _id: ObjectId(id) };
                const updatedDoc = {
                    $set: {
                        unseenMessages: 0,
                        lastSeen: {
                            message: data.message,
                            timestamp: data.timestamp,
                            whoSeen: data.email
                        }
                    }
                }
                const result = await conversationsCollection.updateOne(filter, updatedDoc, { upsert: true });
                io.emit('message-notification-update', { result, id });
                io.emit('lastSeen', { result, id, data });
            });
        });

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