const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.kr01r.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    // console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

async function run(){
  try{
    await client.connect();
    const productCollection = client.db("drill_machine").collection("Products");
    const orderCollection = client.db("drill_machine").collection("orders");
    const userCollection = client.db("drill_machine").collection("users");
    const reviewCollection = client.db("drill_machine").collection("reviews");

    // ===========All Product ===========//
    app.get("/product", async (req, res) => {
      const query = {};
      const cursor = productCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.findOne(query);
      res.send(result);
    });

    // ===========add product===========//
    app.post("/product", async (req, res) => {
      const products = req.body;
      const result = await productCollection.insertOne(products);
      res.send(result);
    });

    // ===========Manage Product===========//
    app.get("/product", async (req, res) => {
      const products = await productCollection.find().toArray();
      res.send(products);
    });

// ===========Manage Product Delete===========//
    app.delete('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id)}
            const result = await productCollection.deleteOne(query);
            res.send(result)
        })
        

    // ===========single product===========//
    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

// ===========update profile===========//
     app.put('/users/:email',  verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updatedDoc = {
                $set: user
            };
            const result = await userCollection.updateOne(
              filter,
              updatedDoc,
              options
            );
            res.send(result);
        })



    // ===========user email===========//
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "48h" }
      );
      res.send({ result, token });
    });

    // ===========Admin===========//
      app.get('/admin/:email', async(req,res) =>{
        const email =req.params.email;
        const user = await userCollection.findOne({email:email});
        const isAdmin = user.role === 'admin';
        res.send({admin: isAdmin})
      })


    // ===========Admin===========//
    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const requester = req.decoded.email;
      const requseterAccount = await userCollection.findOne({email:requester});
      if(requseterAccount.role === 'admin'){
         const filter = { email: email };
         const updateDoc = {
           $set: { role: "admin" },
         };
         const result = await userCollection.updateOne(filter, updateDoc);
         res.send(result);

      }
      else{
        res.status(403).send({message: 'forbidden'});
      }

    });

    // ===========single product add===========//
    app.post("/orders", async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });

    // ===========Order Delete===========//
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/orders", verifyJWT, async (req, res) => {
      const customerEmail = req.query.email;
      const decodedEmail = req.decoded.email;
      if (customerEmail === decodedEmail) {
        const query = { customerEmail: customerEmail };
        const order = await orderCollection.find(query).toArray();
        res.send(order);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

     

    //===== pay order=======//
    app.get('/orders/:id', verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const order = await orderCollection.findOne(query);
            res.send(order);
        })

    app.post("/create-payment-intent", verifyJWT, async (req, res) => {
      const order = req.body;
      const price = order.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    });   

//===== reviews=======//
    app.get("/reviews", async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    
  }
  finally{

  }

}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Drill Machine is running!');
  })
  
  app.listen(port, () => {
    console.log("Listening to port");
  })