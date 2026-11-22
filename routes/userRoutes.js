import express from "express";
import { usersCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";
import { requireAdmin } from "../middlewares/verifyRoles.js";
import { ObjectId } from "mongodb";

const router = express.Router();

router.get("/verified-owners", async (req, res) => {
  try {
    const users = await usersCollection.find({role: "owner"}).toArray();
    res.send(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", verifyToken, requireAdmin, async (req, res) => {
  try {
    const users = await usersCollection.find().toArray();
    res.send(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.patch("/:id", verifyToken, requireAdmin, async (req, res) => {
  try {
    const id= req.params.id
    const { role } = req.body;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { 
        $set: {
           role: role
        } 
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    res.send(result);

    }catch (error) {
    res.status(500).send({
      message: error.message
    });
  }
});

router.get("/my-profile", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    const result = await usersCollection.findOne(
      { email: email }
    );

    if (!result) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    res.send(result);

  } catch (error) {
    res.status(500).send({
      message: error.message
    });
  }
});

router.patch("/my-profile", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    const { name, image, phone, address, dateOfBirth } = req.body;

    const updateData = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;

    const result = await usersCollection.updateOne(
      { email: email },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "User not found"
      });
    }

    res.send(result);

    }catch (error) {
    res.status(500).send({
      message: error.message
    });
  }
});

export default router