import express from "express";
import { ObjectId } from "mongodb";
import { equipmentCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";
import { requireAdmin, requireOwner } from "../middlewares/verifyRoles.js";

const router = express.Router();

router.post("/", verifyToken, requireOwner,  async (req, res) => {
    const data= req.body
    const result= await equipmentCollection.insertOne(data)
    res.send(result)
});

router.get("/", async (req, res) => {
  try {
    const query = {};

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.location) {
      query.location = req.query.location;
    }

    if (req.query.rentalType) {
      query.rentalType = req.query.rentalType;
    }

    if (req.query.condition) {
      query.condition = req.query.condition;
    }

    if (req.query.brand) {
      query.brand = req.query.brand;
    }

    const equipments = await equipmentCollection.find(query).toArray();

    res.send(equipments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid equipment ID" })
    }

    const result = await equipmentCollection.findOne({
      _id: new ObjectId(id)
    })

    if (!result) {
      return res.status(404).send({ message: "Equipment not found" })
    }

    res.send(result)
  } catch (error) {
    res.status(500).send({ message: "Internal server error" })
  }
})

router.get("/my-equipments/:email", verifyToken, requireOwner, async (req, res) => {
    const email= req.params.email
    const result= await equipmentCollection.find({"owner.email": email}).toArray()
    res.send(result)
});

router.patch("/my-equipments/:id", verifyToken, requireOwner, async (req, res) => {
    const id = req.params.id
    const data = req.body
    const result= await equipmentCollection.updateOne({_id: new ObjectId(id)}, {$set: data})
    res.send(result)
});

router.delete("/my-equipments/:id", verifyToken, requireOwner, async (req, res) => {
    const id= req.params.id
    const result= await equipmentCollection.deleteOne({_id: new ObjectId(id)})
    res.send(result)
});

router.patch("/:id", verifyToken, requireAdmin, async(req,res)=>{
  const id = req.params.id;
  const { status } = req.body;
  
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid rental ID" });
    }
  
    if (typeof status !== "string" || !status.trim()) {
      return res.status(400).send({ message: "A valid status is required" });
    }
  
    try {
      const result = await equipmentCollection.updateOne(
        {
          _id: new ObjectId(id)
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
})

export default router