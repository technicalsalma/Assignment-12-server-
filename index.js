const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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

async function run(){
  try{
    await client.connect();
   const productCollection = client.db('drill_machine').collection('Products')
   const orderCollection = client.db("drill_machine").collection("orders");
   const userCollection = client.db("drill_machine").collection("users");


  app.get('/product', async(req, res) =>{
    const query = {}
    const cursor = productCollection.find(query);
    const products = await cursor.toArray()
    res.send(products);
  }) 

  app.put('/user/:email', async(req,res) =>{
    const email = req.params.email;
    const user = req.body;
    const filter = {email:email}
    const options= {upsert: true};
    const updateDoc = {
      $set: user,
    };
    const result = await userCollection.updateOne(filter, updateDoc,options);
    const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '48h'});
    res.send({result, token})
  }) 

  
  app.get('/product/:id', async(req, res) =>{
    const id = req.params.id;
    const query = {_id: ObjectId(id)};
    const result = await productCollection.findOne(query);
    res.send(result);
  })

  app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order)
            res.send(result)
        });

  app.get('/orders', async (req, res) => {
        const customerEmail = req.query.email;
        const authorization = req.headers.authorization;
        console.log('auth header', authorization);
        const query = { customerEmail: customerEmail };
        const order = await orderCollection.find(query).toArray();
        res.send(order);
  })

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