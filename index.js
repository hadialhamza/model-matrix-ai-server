require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB URI
const uri = process.env.DB_URI;

// Create MongoDB Client
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// default route for checking the server
app.get("/", (req, res) => {
  res.send("server is running");
});

// Connect MongoDB Server
async function run() {
  try {
    // Connect the client to the server
    await client.connect();

    // Create a DataBase
    const usersDataBase = client.db("modelMatrixDB");
    // Create a Collection of AI models
    const usersCollection = usersDataBase.collection("models");

    // Create a collection of purchases models
    const purchasesCollection = usersDataBase.collection("purchases");

    // Post APIs
    // API for Add AI model data to database
    app.post("/models", async (req, res) => {
      const newUser = req.body;
      const result = await usersCollection.insertOne(newUser);
      res.send(result);
      console.log(result);
    });

    // Get APIs
    // API for Find All data from database including search and framework
    app.get("/models", async (req, res) => {
      const search = req.query.search;
      const framework = req.query.framework;

      const query = {};
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      if (framework) {
        const frameworks = framework.split(",");
        query.framework = { $in: frameworks };
      }

      const cursor = usersCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    // API for find 6 recent models
    app.get("/models/recent", async (req, res) => {
      const cursor = usersCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send(result);
    });

    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
