const express = require("express");
const cors = require("cors");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const allowedOrigins = ["https://hoques-portfolio.web.app"];
app.use(
  cors({
    origin: ["https://hoques-portfolio.web.app"],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB Connection URL
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    // Connect to MongoDB
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("portfolio");
    const collection = db.collection("users");
    const projectsCollection = db.collection("projects");

    // User Registration
    app.post("/api/auth/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await collection.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await collection.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/auth/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await collection.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });
    app.get("/api/auth/projectsCollection", async (req, res) => {
      const result = await projectsCollection.find().toArray();
      res.send(result);
    });

    app.post("/api/auth/projectsCollection", async (req, res) => {
      const { image, category, name, live, server, client, rating } = req.body;
      const result = await projectsCollection.insertOne({
        image,
        category,
        name,
        live,
        server,
        client,
        rating,
      });
      res.json({
        success: true,
        message: "New supply added successful",
      });
    });

    app.put("/api/auth/projectsCollection/:id", async (req, res) => {
      try {
        const itemId = req.params.id;
        const filter = { _id: new ObjectId(itemId) }; // Assuming you're using MongoDB ObjectId
        const updatedData = req.body; // Updated data received from the client

        const updateFields = {};
        for (const key in updatedData) {
          if (updatedData.hasOwnProperty(key)) {
            updateFields[key] = updatedData[key];
          }
        }

        const result = await projectsCollection.updateOne(filter, {
          $set: updateFields,
        });

        if (result.modifiedCount === 1) {
          // Supply item updated successfully
          res.status(200).json({ message: "Supply item updated successfully" });
        } else {
          // No supply item found with the given ID
          res.status(404).json({ message: "Supply item not found" });
        }
      } catch (error) {
        console.error("Error updating supply item:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    app.delete("/api/auth/projectsCollection/:id", async (req, res) => {
      const itemId = req.params.id;
      const query = { _id: new ObjectId(itemId) };
      const result = await projectsCollection.deleteOne(query);
      res.send(result);
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

// Test route
app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
