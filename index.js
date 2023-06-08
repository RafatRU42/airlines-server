const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 5000;
const app = express()

//meddileware

app.use(cors())
app.use(express.json())

app.get('/',async(req,res) =>{
    res.send('airlines portal is running on the port 500')
})

app.listen(port, console.log(`airlines portal is running on ${port}`))

