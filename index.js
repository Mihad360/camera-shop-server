const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//  ahmedmihad962
//  yK6JW2CKZbNkwXU8

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster25.kpsyv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster25`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("cameraShopDB").collection("users");
    const productCollection = client.db("cameraShopDB").collection("products");
    const cartCollection = client.db("cameraShopDB").collection("carts");
    const wishlistCollection = client.db("cameraShopDB").collection("wishlist");

    app.post("/jwt", async (req, res) => {
      const email = req.body;
      const token = jwt.sign(email, process.env.SECRET_TOKEN, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    const verifyToken = async (req, res, next) => {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = authorization.split(" ")[1];
      if (token) {
        jwt.verify(token, process.env.SECRET_TOKEN, (err, decoded) => {
          if (err) {
            return res.status(401).send({ message: "unauthorized access" });
          }
          req.decoded = decoded;
          next();
        });
      }
    };

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const isExist = await userCollection.findOne(query);
      if (isExist) {
        return res.send({
          message: "email is already exist",
          insertedId: null,
        });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const query = { email: req.params.email };
      console.log(query);
      const result = await userCollection.findOne(query);
      if (!result) {
        return res.send({ message: "user not found" });
      }
      res.send(result);
    });

    app.post('/add-product', async(req, res) =>{
      const user = req.body;
      const result = await productCollection.insertOne(user);
      res.send(result)
    })

    app.get('/products', async(req, res)=>{
      const result = await productCollection.find().toArray()
      res.send(result)
    })

    app.post('/carts', async(req, res) =>{
      const user = req.body;
      const result = await cartCollection.insertOne(user)
      res.send(result)
    })

    app.get('/carts', async(req, res) =>{
      const query = {buyerEmail: req.query.email}
      const result = await cartCollection.find(query).toArray()
      res.send(result)
    })

    app.post('/wishlist', async(req, res) =>{
      const user = req.body;
      const result = await wishlistCollection.insertOne(user)
      res.send(result)
    })

    app.get('/wishlist', async(req, res) =>{
      const query = {buyerEmail: req.query.email}
      console.log(query);
      const result = await wishlistCollection.find(query).toArray()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(`boss is running`);
});

app.listen(port, (req, res) => {
  console.log(`boss is running on port: ${port}`);
});
