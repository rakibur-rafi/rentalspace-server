import express from "express";
import { ObjectId } from "mongodb";
import { equipmentCollection, favouriteCollection, rentCollection, usersCollection } from "../conifg/db.js";
import { verifyToken } from "../middlewares/jwtAuth.js";
import { requireAdmin, requireCustomer, requireOwner } from "../middlewares/verifyRoles.js";
const paidStatuses = [
  "on delivery",
  "delivered",
  "pending"
];

const startDate = new Date();
startDate.setUTCDate(1);
startDate.setUTCHours(0, 0, 0, 0);
startDate.setUTCMonth(startDate.getUTCMonth() - 11);

const monthlySalesPipeline = (match) => [
  {
    $match: {
      ...match,
      status: { $in: paidStatuses },
      createdAt: { $gte: startDate }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m",
          date: "$createdAt"
        }
      },
      totalSales: { $sum: "$totalPrice" },
      totalBookings: { $sum: 1 }
    }
  },
  {
    $sort: { _id: 1 }
  }
];

const monthlyUserGrowthPipeline = [
  {
    $match: {
      createdAt: {
        $gte: startDate
      }
    }
  },
  {
    $group: {
      _id: {
        $dateToString: {
          format: "%Y-%m",
          date: "$createdAt"
        }
      },
      totalUsers: {
        $sum: 1
      }
    }
  },
  {
    $sort: {
      _id: 1
    }
  }
];

const router = express.Router();


router.get("/customer", verifyToken, requireCustomer, async (req, res) => {
  const email = req.user.email;

  try {
    const [
      totalBookings,
      totalSpent,
      favouriteItems,
      onDeliveryRent,
      pendingRent,
      deliveredRent
    ] = await Promise.all([
      rentCollection.countDocuments({
        userEmail: email
      }),

      rentCollection.aggregate([
        {
          $match: {
            userEmail: email,
            status: { $in: paidStatuses }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" }
          }
        }
      ]).toArray(),

      favouriteCollection.countDocuments({
        customerEmail: email
      }),

      rentCollection.countDocuments({
        userEmail: email,
        status: "on delivery"
      }),

      rentCollection.countDocuments({
        userEmail: email,
        status: "pending"
      }),
      rentCollection.countDocuments({
        userEmail: email,
        status: "delivered"
      })
    ]);

    res.send({
      totalBookings,
      totalSpent: totalSpent[0]?.total || 0,
      favouriteItems,
      onDeliveryRent,
      pendingRent,
      deliveredRent
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch customer analytics"
    });
  }
});

router.get("/owner", verifyToken, requireOwner, async (req, res) => {
  const email = req.user.email;

  try {
    const [
      completedRentals,
      totalEquipment,
      totalIncome,
      activeEquipment,
      mostRented,
      monthlySales
    ] = await Promise.all([

      rentCollection.countDocuments({
        ownerEmail: email,
        status: "delivered"
      }),

      equipmentCollection.countDocuments({
        "owner.email": email
      }),

      rentCollection.aggregate([
        {
          $match: {
            ownerEmail: email,
            status: { $in: paidStatuses }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalPrice" }
          }
        }
      ]).toArray(),

      equipmentCollection.countDocuments({
        "owner.email": email,
        status: "active"
      }),

      rentCollection.aggregate([
        {
          $match: {
            ownerEmail: email,
            status: {
              $nin: ["rejected", "cancelled"]
            }
          }
        },
        {
          $group: {
            _id: "$equipmentID",
            totalRentals: { $sum: 1 }
          }
        },
        {
          $sort: {
            totalRentals: -1
          }
        },
        {
          $limit: 1
        },
        {
          $lookup: {
            from: "equipments",
            localField: "_id",
            foreignField: "_id",
            as: "equipment"
          }
        },
        {
          $unwind: "$equipment"
        },
        {
          $project: {
            _id: 0,
            equipmentID: "$_id",
            name: "$equipment.name",
            image: "$equipment.image",
            totalRentals: 1
          }
        }
      ]).toArray(),

      rentCollection.aggregate(
        monthlySalesPipeline({
          ownerEmail: email
        })
      ).toArray()

    ]);

    res.send({
      completedRentals,
      totalEquipment,
      totalIncome: totalIncome[0]?.total || 0,
      activeEquipment,
      mostRented: mostRented[0] || null,
      monthlySales
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch owner analytics"
    });
  }
});


router.get("/admin", verifyToken, requireAdmin, async (req, res) => {
  try {
    const [
      platformRevenue,
      totalBookings,
      totalUsers,
      totalEquipment,
      monthlySales,
      monthlyUserGrowth
    ] = await Promise.all([

      rentCollection.aggregate([
        {
          $match: {
            status: { $in: paidStatuses }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum: "$totalPrice"
            }
          }
        }
      ]).toArray(),

      rentCollection.countDocuments(),

      usersCollection.countDocuments(),

      equipmentCollection.countDocuments(),

      rentCollection.aggregate(
        monthlySalesPipeline({})
      ).toArray(),

      usersCollection.aggregate(
        monthlyUserGrowthPipeline
      ).toArray()

    ]);

    res.send({
      platformRevenue: platformRevenue[0]?.total || 0,
      totalBookings,
      totalUsers,
      totalEquipment,
      monthlySales,
      monthlyUserGrowth
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch admin analytics"
    });
  }
});

export default router