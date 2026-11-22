
import express from "express";
import { ObjectId } from "mongodb";
import { rentCollection } from "../conifg/db.js";
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
      if (event.type === "checkout.session.completed") {
        const session = event.data.object;

        if (session.payment_status === "paid") {
          const rentId = session.metadata?.rentId;

          if (!ObjectId.isValid(rentId)) {
            return res.status(400).send("Invalid rent ID");
          }

          await rentCollection.updateOne(
            {
              _id: new ObjectId(rentId),
              stripeSessionId: session.id,
              paymentStatus: "pending"
            },
            {
              $set: {
                paymentStatus: "paid",
                paidAt: new Date()
              }
            }
          );
        }
      }

      if (event.type === "checkout.session.expired") {
        const session = event.data.object;
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
                paymentStatus: "expired"
              }
            }
          );
        }
      }

      return res.status(200).json({
        received: true
      });

    } catch (error) {
      console.error("Webhook processing failed:", error);

      return res.status(500).json({
        message: "Webhook processing failed"
      });
    }
  }
);

export default router;
