import express from "express";
import cors from "cors";
import 'dotenv/config';
import { connectToMongoDB } from "./conifg/db.js";
import equipmentRoutes from "./routes/equipmentRoutes.js";
import userRoutes from "./routes/userRoutes.js"
import checkoutRoutes from "./routes/checkoutRoutes.js"
import favouriteRoutes from "./routes/favouriteRoutes.js"
import rentalRoutes from "./routes/rentalRoutes.js"

const app = express();
const PORT= process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

await connectToMongoDB()

app.get("/", (req, res) => {
    res.send("Rental Space Server");
})
app.get("/health", (req, res) => {
    res.send("Healthy");
});

app.use('/equipments', equipmentRoutes);
app.use('/users', userRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/favourites', favouriteRoutes);
app.use('/rentals', rentalRoutes)

app.listen(PORT, () =>{
    console.log(`Server running on port ${PORT}`)
});