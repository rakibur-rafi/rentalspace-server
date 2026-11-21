import express from "express";
import { ObjectId } from "mongodb";
import { favouriteCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";
import { requireCustomer } from "../middlewares/verifyRoles.js";

const router = express.Router();

router.post("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const data = req.body;

    const existingFavourite = await favouriteCollection.findOne({
      customerEmail: req.user.email,
      equipmentId: data.equipmentId,
    });

    if (existingFavourite) {
      return res.status(409).send({
        message: "Equipment already added to favourites",
      });
    }

    const result = await favouriteCollection.insertOne(data);

    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to add favourite",
    });
  }
});

router.get("/", verifyToken, requireCustomer, async (req, res) => {
  try {
    const result = await favouriteCollection
      .find({ customerEmail: req.user.email })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch favourites",
    });
  }
});

router.delete("/:id", verifyToken, requireCustomer, async (req, res) => {
    try {
    const id = req.params.id
    const existingFavourite = await favouriteCollection.findOne({
      _id : new ObjectId(id)
    });

    if (!existingFavourite) {
      return res.status(409).send({
        message: "Not in favourites",
      });
    }

    const result = await favouriteCollection.deleteOne({_id: new ObjectId(id)});
    res.status(201).send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to Remove",
    });
  }
});

export default router