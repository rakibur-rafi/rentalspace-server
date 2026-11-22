import express from "express";
import { ObjectId } from "mongodb";
import { verifyToken } from "../middlewares/jwtAuth.js";
import { requireAdmin, requireCustomer, requireOwner } from "../middlewares/verifyRoles.js";
import { rentCollection } from "../conifg/db.js";

const router = express.Router();

router.get("/all-rentals", verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await rentCollection
      .find()
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch customer rentals",
    });
  }
});

router.delete("/all-rentals/:id", verifyToken, requireAdmin, async (req, res) => {
   try {
      const id = req.params.id
      const existingRent = await rentCollection.findOne({
        _id: new ObjectId(id)
      });
  
      if (!existingRent) {
        return res.status(409).send({
          message: "Not a Valid ID",
        });
      }
  
      const result = await rentCollection.deleteOne({_id: new ObjectId(id)});
      res.status(201).send(result);
    } catch (error) {
      res.status(500).send({
        message: "Failed to Remove",
      });
    }
});

router.get("/customer-rentals", verifyToken, requireCustomer, async (req, res) => {
  const email = req.user.email;
  try {
    const result = await rentCollection
      .find({ userEmail: email })
      .toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch customer rentals",
    });
  }
});

router.get("/owner-rentals", verifyToken, requireOwner, async (req, res) => {
  const email = req.user.email;
  try {
    const result = await rentCollection
      .find({ownerEmail : email})
      .toArray();
    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch owner rentals",
    });
  }
});


router.patch("/owner-rentals/:id", verifyToken, requireOwner, async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).send({ message: "Invalid rental ID" });
  }

  if (typeof status !== "string" || !status.trim()) {
    return res.status(400).send({ message: "A valid status is required" });
  }

  try {
    const result = await rentCollection.updateOne(
      {
        _id: new ObjectId(id),
        ownerEmail: req.user.email,
      },
      {
        $set: {
          status: status.trim(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Rental not found or unauthorized",
      });
    }

    res.send({
      message: "Rental status updated successfully",
      result,
    });
  } catch (error) {
    res.status(500).send({
      message: "Failed to update rental status",
    });
  }
});

export default router
