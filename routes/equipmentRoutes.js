import express from "express";
import { ObjectId } from "mongodb";
import { equipmentCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";
import { requireAdmin, requireOwner } from "../middlewares/verifyRoles.js";

const router = express.Router();

router.get("/featured", async (req, res) => {
  try {
    const equipments = await equipmentCollection
      .find({ availableQuantity: { $gt: 0 } })
      .limit(6)
      .toArray();

    res.send(equipments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const query = {};

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.location) {
      query.location = {
        $regex: String(req.query.location).replace(/[.*+?^$()|[\]{}\\]/g, "\\$&"),
        $options: "i"
      };
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


    const search = String(req.query.search || "").trim();
    const searchBy = req.query.searchBy === "location" ? "location" : "name";

    if (search) {
      query[searchBy] = {
        $regex: search.replace(/[.*+?^$()|[\]{}\\]/g, "\\$&"),
        $options: "i"
      };
    }

    const minPrice = Number(req.query.minPrice);
    const maxPrice = Number(req.query.maxPrice);
    if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
      query.rentalPrice = {};
      if (req.query.minPrice !== undefined && Number.isFinite(minPrice)) {
        query.rentalPrice.$gte = minPrice;
      }
      if (req.query.maxPrice !== undefined && Number.isFinite(maxPrice)) {
        query.rentalPrice.$lte = maxPrice;
      }
    }

    if (req.query.availability === "available") {
      query.availableQuantity = { $gt: 0 };
    }

    const sort = {};

    if (req.query.sort === "low-to-high") {
      sort.rentalPrice = 1;
    } else if (req.query.sort === "high-to-low") {
      sort.rentalPrice = -1;
    } else if (req.query.sort === "recently-added") {
      sort._id = -1;
    }

    const equipments = await equipmentCollection.find(query).sort(sort).toArray();

    res.send(equipments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/", verifyToken, requireOwner,  async (req, res) => {
    const data= req.body
    const result= await equipmentCollection.insertOne(data)
    res.send(result)
});


router.get("/:id", verifyToken, async (req, res) => {
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
router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
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