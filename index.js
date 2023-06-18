const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const secretKet = (process.env.STRIPE_SECRET_KEY)
console.log('sec', secretKet);
const stripe = require("stripe")(secretKet);



const port = process.env.PORT || 5000;

const app = express();

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.lfwjozb.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


function VerifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized access')
  }

  const token = authHeader.split(' ')[1]
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbidden access' })
    }
    req.decoded = decoded;
    next()
  })

}






async function run() {
  try {

    const availableFlightCollection = client.db('airlines2').collection('flightCollection');
    const bookingCollection = client.db('airlines2').collection('bookings');
    const usersCollection = client.db('airlines2').collection('users');
    const offerCollection = client.db('airlines2').collection('offer')
    const paymentCollection = client.db('airlines2').collection('payment')


    // app.get('/availableFlight',async(req,res) =>{
    //     const query = {};
    //     const result = await availableFlightCollection.find(query).toArray();
    //     console.log('result',result);
    //     res.send(result);
    // })

    app.get('/availableFlight', async (req, res) => {

      // Get the flight options from the your database : =>
      const query = {};
      const flightOptions = await availableFlightCollection.find(query).toArray();

      // Get the selected date from the client side which date you selected => 
      const date = req.query.date;

      // Compare your selected date with the booking collection of database =>
      const queryDate = { flightDate: date };
      // Get the all bookings of your selected date =>
      const alreadyBooked = await bookingCollection.find(queryDate).toArray();

      flightOptions.forEach(option => {
        // Compare your flight class with availableFlightCollection and bookingCollection =>
        const bookedFlight = alreadyBooked.filter(book => book.flightClass === option.name);
        // code carefully =>
        const bookedSlots = bookedFlight.map(book => book.slot);
        const remainSlots = option.slots.filter(slots => !bookedSlots.includes(slots));
        option.slots = remainSlots;
      })

      res.send(flightOptions)


    })


    app.get('/usersBooking', VerifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      const query = { customerEmail: email };
      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })


    app.post('/bookings', async (req, res) => {
      const query = req.body;
      const booked = {
        flightDate: query.flightDate,
        customerEmail: query.customerEmail
      }
      const alreadyBooked = await bookingCollection.find(booked).toArray()
      if (alreadyBooked.length) {
        const message = `You already have an booking on ${query.flightDate}. Please Try Another Day`
        return res.send({ acknowledged: false, message })
      }
      const result = await bookingCollection.insertOne(query);
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const data = req.body;
      const result = await usersCollection.insertOne(data);
      res.send(result)

    })


    // How to set JWT => =>
    // 1. Make access token if user exist in usersCollection.
    // 2. Go to the sign up and set access token in the local storage.
    // 3.
    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.find(query).toArray()
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN)
        // { expiresIn: '1h' }
        return res.send({ accessToken: token })
      }
      else {
        return res.send('forbidden access')
      }
    })

    app.get('/allUsers', async (req, res) => {
      const query = {};
      const users = await usersCollection.find(query).toArray()
      res.send(users)
    })

    // app.put('/users/admin/:id',async(req,res) =>{
    //   const id = req.params.id;
    //   const filter = {_id:new ObjectId(id)}
    //   const option = {upsert:true};
    //   const updatedDoc ={
    //     $set  :{
    //       role:'admin'
    //     }
    //   }
    //   const result = await usersCollection.updateOne(filter,option,updatedDoc);
    //   res.send(result)
    // })


    // MongoInvalidArgumentError: Update document requires atomic operators

    app.put('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      };

      const result = await usersCollection.updateOne(filter, updatedDoc, option);
      res.send(result);
    });


    // useAdmin hook every time call this following method with different emails
    // Check the user is an Admin= Output: true/false =>
    app.get('/users/admin/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send({ isAdmin: user?.role === 'admin' })
    })

    app.get('/flightName', async (req, res) => {
      const query = {};
      const result = await availableFlightCollection.find(query).project({ name: 1 }).toArray()
      res.send(result)
    })


    app.post('/addOffer/admin', async (req, res) => {
      const data = req.body;
      const result = await offerCollection.insertOne(data);
      res.send(result)
    })

    app.get('/allOffers', async (req, res) => {
      const query = {};
      const result = await offerCollection.find(query).toArray();
      res.send(result)
    })

    app.get('/allOffers/selected', async (req, res) => {
      const query = {};
      const result = await offerCollection.find(query).project({ type: 1, title: 1, image: 1 }).toArray()
      res.send(result)
    })

    app.delete('/allOffers/selected/:id', async (req, res) => {
      const id = req.params.id;
      console.log('object', id);

      const query = { _id: new ObjectId(id) };
      const result = await offerCollection.deleteOne(query);
      res.send(result)
    })

    app.get('/dashboard/payment/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.findOne(query)
      res.send(result)
    })


    // app.post('/create-payment-intent',async(req,res) =>{
    //   const price = req.body;
    //   const price1 = price.price;
    //   // console.log('dfpri',price);
    //   const amount =price1 * 100;
    //   // console.log(amount);


    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount:amount,
    //     currency:"usd",
    //    "payment-method-types":[
    //     "card"
    //    ]
    //   })

    //   res.send({
    //     clientSecret: paymentIntent.client_secret,
    //   });

    // })



    app.post('/create-payment-intent', async (req, res) => {
      // const booking = req.body;
      // const price = booking.price;

      const price = 250;
      const amount = price * 90;
    

      const paymentIntent = await stripe.paymentIntents.create({
          currency: 'usd',
          amount: amount,
          "payment_method_types": [
              "card"
          ]
      });
      console.log('object',paymentIntent);

      res.send({
          clientSecret: paymentIntent.client_secret,
      });

      

    });


    app.post('/payment',async(req,res) =>{
      const data = req.body;
      const result = await paymentCollection.insertOne(data);
      const id = data._id;
      const filter = {_id: new ObjectId(id)};
      const option = {upsert:true};
      updatedDoc= {
        $set:{
          paid:true,
          transactionId : data.transactionId,
        }
      }
      const update = await bookingCollection.updateOne(filter,updatedDoc,option)
      res.send(result)
    })


  }



  finally {

  }
}
run().catch(console.log);

app.get('/', async (req, res) => {
  res.send('airlines portal server is running');
})

app.listen(port, () => console.log(`airlines portal running on ${port}`))



