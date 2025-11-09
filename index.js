require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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

// Connect MongoDB Server
async function run() {
  try {
    // Connect the client to the server
    // await client.connect();

    // Create a DataBase
    const modelsDatabase = client.db("modelMatrixDB");

    // Create a Collection of AI models
    const modelsCollection = modelsDatabase.collection("models");

    // Create a collection of purchases models
    const purchasesCollection = modelsDatabase.collection("purchases");

    // default route for checking the server
    app.get("/", (req, res) => {
      res.send("Welcome to Model Matrix Server. We are Online.");
    });

    // Post APIs
    // API for Add AI model data to database
    app.post("/models", async (req, res) => {
      const newModel = req.body;
      const result = await modelsCollection.insertOne(newModel);
      res.send({ success: true, result });

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

      const cursor = modelsCollection.find(query);
      const result = await cursor.toArray();
      res.send({ success: true, result });
    });

    // API for find 6 recent models
    app.get("/models/recent", async (req, res) => {
      const cursor = modelsCollection.find().sort({ createdAt: -1 }).limit(6);
      const result = await cursor.toArray();
      res.send({ success: true, result });
    });

    // API for find model by ID
    app.get("/models/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await modelsCollection.findOne(query);
      res.send({ success: true, result });
    });

    // Update APIs
    app.put("/models/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: data,
      };
      const result = await modelsCollection.updateOne(query, updatedData);
      res.send({ success: true, result });
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
