import express from "express";
import { reviewCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
    const data= req.body
    const result= await reviewCollection.insertOne(data)
    res.send(result)
});

router.get("/", async(req,res)=>{
    const result= await reviewCollection.find().toArray()
    res.send(result)
})

export default router;