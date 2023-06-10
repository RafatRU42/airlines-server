const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

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






  async function run(){
    try{

        const availableFlightCollection = client.db('airlines2').collection('flightCollection');
        const bookingCollection = client.db('airlines2').collection('bookings')

        // app.get('/availableFlight',async(req,res) =>{
        //     const query = {};
        //     const result = await availableFlightCollection.find(query).toArray();
        //     console.log('result',result);
        //     res.send(result);
        // })

        app.get('/availableFlight',async(req,res) =>{
         
         // Get the flight options from the your database : =>
         const query = {};
         const flightOptions = await availableFlightCollection.find(query).toArray();

         // Get the selected date from the client side which date you selected => 
         const date = req.query.date;

         // Compare your selected date with the booking collection of database =>
         const queryDate = {flightDate:date};
          // Get the all bookings of your selected date =>
         const alreadyBooked = await bookingCollection.find(queryDate).toArray();

         flightOptions.forEach(option =>{
          // Compare your flight class with availableFlightCollection and bookingCollection =>
          const bookedFlight = alreadyBooked.filter(book => book.flightClass === option.name);
          // code carefully =>
          const bookedSlots = bookedFlight.map(book => book.slot);
          const remainSlots = option.slots.filter(slots => !bookedSlots.includes(slots));
          option.slots = remainSlots;
         })

         res.send(flightOptions)


        })

  
        
        

        app.post('/bookings',async(req,res) =>{
          const query = req.body;
          const booked = {
            flightDate:query.flightDate,
            customerEmail:query.customerEmail
          }
          const alreadyBooked = await bookingCollection.find(booked).toArray()
          if(alreadyBooked.length){
            const message=`You already have an booking on ${query.flightDate}. Please Try Another Day`
            return res.send({acknowledged:false,message})
          }
          const result = await bookingCollection.insertOne(query);
          res.send(result)
        })

    }
    finally{

    }
  }
  run().catch(console.log);

  app.get('/', async (req, res) => {
      res.send('airlines portal server is running');
  })
  
  app.listen(port, () => console.log(`airlines portal running on ${port}`))



