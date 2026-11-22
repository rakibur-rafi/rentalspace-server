
import express from "express";
import { ObjectId } from "mongodb";
import { client } from "../conifg/db.js";
import { equipmentCollection, rentCollection } from "../conifg/db.js";
import { stripe } from "../conifg/stripe.js";

const router = express.Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error("Stripe signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
      const session = event.data.object;

      if (
        event.type === "checkout.session.completed" &&
        session.payment_status === "paid"
      ) {
        const rentId = session.metadata?.rentId;

        if (!ObjectId.isValid(rentId)) {
          return res.status(400).send("Invalid rent ID");
        }

        const mongoSession = client.startSession();

        try {
          await mongoSession.withTransaction(async () => {
            const rent = await rentCollection.findOne(
              {
                _id: new ObjectId(rentId),
                stripeSessionId: session.id,
                paymentStatus: "pending"
              },
              { session: mongoSession }
            );

            if (!rent) {
              return;
            }

            const equipmentUpdate = await equipmentCollection.updateOne(
              {
                _id: rent.equipmentID,
                availableQuantity: { $gte: rent.quantity }
              },
              {
                $inc: {
                  availableQuantity: -rent.quantity
                }
              },
              { session: mongoSession }
            );

            if (equipmentUpdate.modifiedCount === 0) {
              await rentCollection.updateOne(
                { _id: rent._id, paymentStatus: "pending" },
                {
                  $set: {
                    paymentStatus: "paid",
                    status: "inventory_unavailable",
                    paidAt: new Date()
                  }
                },
                { session: mongoSession }
              );

              return;
            }

            await rentCollection.updateOne(
              {
                _id: rent._id,
                paymentStatus: "pending"
              },
              {
                $set: {
                  paymentStatus: "paid",
                  status: "confirmed",
                  paidAt: new Date()
                }
              },
              { session: mongoSession }
            );
          });

        } finally {
          await mongoSession.endSession();
        }
      }

      if (event.type === "checkout.session.expired") {
        const rentId = session.metadata?.rentId;

        if (ObjectId.isValid(rentId)) {
          await rentCollection.updateOne(
            {
              _id: new ObjectId(rentId),
              stripeSessionId: session.id,
              paymentStatus: "pending"
            },
            {
              $set: {
                paymentStatus: "expired",
                status: "cancelled"
              }
            }
          );
        }
      }

      return res.status(200).json({ received: true });

    } catch (error) {
      console.error("Webhook processing failed:", error);

      return res.status(500).json({
        message: "Webhook processing failed"
      });
    }
  }
);

export default router;
