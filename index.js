import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import 'dotenv/config';

const app = express();
const PORT= process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Rental Space Server is running');
});


app.listen(PORT, () =>{
    console.log(`Server running on port ${PORT}`)
});