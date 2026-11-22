import express from "express";
import { categoryCollection } from "../conifg/db.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const result = await categoryCollection
      .find()
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch customer rentals",
    });
  }
});

export default router