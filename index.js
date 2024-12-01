const express = require('express')
require('dotenv').config();
const gradesRoute = require('./routes/grades.js')
const grades_aggRoute = require('./routes/grades_agg.js')

const PORT = process.env.PORT;
const app = express();
app.use(express.json())

app.use('/grades', gradesRoute)
app.use('/grades_agg',grades_aggRoute)

app.get('/',(req,res)=> {
   res.send('welcome to our app')
})

app.listen(PORT ,()=> {
    console.log("running on port"+ PORT)
})