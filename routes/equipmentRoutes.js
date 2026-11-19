import express from "express";
import { equipmentCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
    const data= req.body
    const result= await equipmentCollection.insertOne(data)
    res.send(result)
});
router.get("/", (req, res) => {
    res.send("get all equipments");
});

export default router