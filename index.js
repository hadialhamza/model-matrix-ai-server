require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const admin = require("firebase-admin");
const app = express();
const port = process.env.PORT || 5000;

// Firebase Admin Service Account decoded
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

// Firebase Admin Initialization
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware function for check authentic user
const verifyAuth = async (req, res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).send({ error: true, message: "unauthorized access" });
  }
};

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
    const modelsDatabase = client.db("aximoAiDB");

    // Create a Collection of AI models
    const modelsCollection = modelsDatabase.collection("models");

    // Create a collection of purchases models
    const purchasesCollection = modelsDatabase.collection("purchases");

    // Create a Collection of users
    const usersCollection = modelsDatabase.collection("users");

    // default route for checking the server
    app.get("/", (req, res) => {
      res.send(
        "Welcome to Model Matrix Server. We are Online and successfully connected to Database."
      );
    });

    // User Related APIs
    // Save user data (SignUp / Login)
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const updateDoc = {
        $set: {
          ...user,
          lastLogin: new Date(),
        },
        $setOnInsert: {
          role: "user",
          createdAt: new Date(),
        },
      };
      const result = await usersCollection.updateOne(query, updateDoc, {
        upsert: true,
      });
      res.send(result);
    });

    // Get user data
    app.get("/users/:email", verifyAuth, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    // Update user data
    app.put("/users/:email", verifyAuth, async (req, res) => {
      const email = req.params.email;
      if (req.user.email !== email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const filter = { email: email };
      const updatedDoc = {
        $set: req.body,
      };
      const result = await usersCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // Admin: Get all users
    app.get("/users", verifyAuth, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    // Admin: Delete user
    app.delete("/users/:id", verifyAuth, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    // Admin: Get System Stats
    app.get("/admin/stats", verifyAuth, async (req, res) => {
      const totalUsers = await usersCollection.estimatedDocumentCount();
      const totalModels = await modelsCollection.estimatedDocumentCount();
      // Calculate revenue or total purchases
      const totalPurchases = await purchasesCollection.estimatedDocumentCount();

      // Mock revenue calculation (e.g. $50 avg per model)
      const totalRevenue = totalPurchases * 50;

      res.send({
        totalUsers,
        totalModels,
        totalRevenue,
        totalPurchases,
      });
    });

    // Admin: Get All Models (Raw List)
    app.get("/admin/models", verifyAuth, async (req, res) => {
      const result = await modelsCollection.find().toArray();
      res.send({ success: true, result });
    });

    // Post APIs
    // API for Add AI model data to database
    app.post("/models", verifyAuth, async (req, res) => {
      const newModel = {
        ...req.body,
        createdBy: req.user.email,
        createdAt: new Date(),
        purchased: 0,
      };
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
    app.get("/models/:id", verifyAuth, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await modelsCollection.findOne(query);
      res.send({ success: true, result });
    });

    // Update APIs
    app.put("/models/:id", verifyAuth, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updatedData = {
        $set: data,
      };
      const result = await modelsCollection.updateOne(query, updatedData);
      res.send({ success: true, result });
    });

    // Delete API
    app.delete("/models/:id", verifyAuth, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await modelsCollection.deleteOne(query);
      res.send({ success: true, result });
    });

    // API for purchase model
    app.post("/models/:id/purchase", verifyAuth, async (req, res) => {
      const id = req.params.id;
      const buyerEmail = req.user.email;
      const query = { _id: new ObjectId(id) };

      const model = await modelsCollection.findOne(query);

      const purchaseModel = {
        modelId: model._id,
        modelName: model.name,
        framework: model.framework,
        useCase: model.useCase,
        createdBy: model.createdBy,
        purchasedBy: buyerEmail,
        image: model.image,
        purchasedAt: new Date(),
      };

      const result = await purchasesCollection.insertOne(purchaseModel);

      const purchaseCount = await modelsCollection.updateOne(query, {
        $inc: { purchased: 1 },
      });

      res.send({ success: true, result, purchaseCount });
    });

    // API for get user models
    app.get("/my-models", verifyAuth, async (req, res) => {
      const email = req.user.email;
      const query = { createdBy: email };
      const cursor = modelsCollection.find(query).sort({ createdAt: -1 });
      const result = await cursor.toArray();
      res.send({ success: true, result });
    });

    // API for get user purchased models
    app.get("/my-purchases", verifyAuth, async (req, res) => {
      const email = req.user.email;
      const query = { purchasedBy: email };
      const cursor = purchasesCollection.find(query).sort({ purchasedAt: -1 });
      const result = await cursor.toArray();
      res.send({ success: true, result });
    });

    // Send a ping to confirm a successful connection
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
