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
      console.log(authorization);
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

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      // console.log(query);
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const verifySeller = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user?.role !== "seller") {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      // console.log(email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    app.get("/users/seller/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      let seller = false;
      if (user) {
        seller = user?.role === "seller";
      }
      res.send({ seller });
    });

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

    app.get("/allusers", verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const query = { email: req.params.email };
      const result = await userCollection.findOne(query);
      if (!result) {
        return res.send({ message: "user not found" });
      }
      res.send(result);
    });

    app.patch(
      "/users/make-seller/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedAdmin = {
          $set: {
            role: "seller",
          },
        };
        const result = await userCollection.updateOne(filter, updatedAdmin);
        res.send(result);
      }
    );

    app.post("/add-product", verifyToken, verifySeller, async (req, res) => {
      const user = req.body;
      const result = await productCollection.insertOne(user);
      res.send(result);
    });

    app.get("/products", async (req, res) => {
      const result = await productCollection.find().toArray();
      res.send(result);
    });

    app.get(
      "/products/seller-products",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const result = await productCollection.find().toArray();
        res.send(result);
      }
    );

    app.get("/seller-products", verifyToken, verifySeller, async (req, res) => {
      const query = { sellerEmail: req.query.email };
      // console.log(query);
      const result = await productCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/products/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/products/:id", verifyToken, verifySeller, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    app.patch("/products/:id", verifyToken, verifySeller, async (req, res) => {
      const product = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateddoc = {
        $set: {
          title: product.title,
          category: product.category,
          price: product.price,
          description: product.description,
          brand: product.brand,
          stock: product.stock,
          image: product.image,
          discount: product.discount,
        },
      };
      const result = await productCollection.updateOne(filter, updateddoc);
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const user = req.body;
      const result = await cartCollection.insertOne(user);
      res.send(result);
    });

    app.get("/carts", async (req, res) => {
      const query = { buyerEmail: req.query.email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    });

    app.post("/wishlist", async (req, res) => {
      const user = req.body;
      const result = await wishlistCollection.insertOne(user);
      res.send(result);
    });

    app.get("/wishlist", async (req, res) => {
      const query = { buyerEmail: req.query.email };
      const result = await wishlistCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/wishlist/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/all-filter-products", async (req, res) => {
      const { title, sort, category, brand } = req.query;
      const query = {};

      if (title) {
        query.title = { $regex: title, $options: "i" };
      }

      if (category) {
        query.category = { $regex: category, $options: "i" };
      }

      if (brand) {
        query.brand = brand;
      }

      const sortOption = sort === "asc" ? 1 : -1;

      const result = await productCollection
        .find(query)
        .sort({ price: sortOption })
        .toArray();
      res.send(result);
    });

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
