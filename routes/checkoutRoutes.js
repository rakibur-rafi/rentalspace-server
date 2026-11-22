import express from "express"
import { ObjectId } from "mongodb"
import { equipmentCollection, rentCollection } from "../conifg/db.js"
import { verifyToken } from "../middlewares/jwtAuth.js"
import { stripe } from "../conifg/stripe.js"
import { requireCustomer } from "../middlewares/verifyRoles.js"

const router = express.Router()

router.post("/create-checkout-session", verifyToken, requireCustomer, async (req, res) => {
  let rentId
  try {
    const userEmail = req.user?.email

    if (!userEmail) {
      return res.status(401).json({ error: "Please sign in to rent equipment" })
    }

    const { equipmentId, quantity, phone, address, rentStartDate, rentEndDate, additionalNotes } = req.body
    const requestedQuantity = Number(quantity)

    if (!ObjectId.isValid(equipmentId)) {
      return res.status(400).json({ error: "Invalid equipment ID" })
    }

    if (
      !Number.isInteger(requestedQuantity) ||
      requestedQuantity < 1 ||
      !phone?.trim() ||
      !address?.trim()
    ) {
      return res.status(400).json({ error: "Invalid checkout details" })
    }

    const equipment = await equipmentCollection.findOne({
      _id: new ObjectId(equipmentId),
    })

    if (!equipment) {
      return res.status(404).json({ error: "Equipment not found" })
    }
    const ownerEmail = equipment.owner?.email
   
    if (!ownerEmail) {
      return res.status(400).json({ error: "Equipment owner details are missing" })
    }

    const availableQuantity = Number(equipment.availableQuantity)
    const unitPrice = Number(equipment.rentalPrice)

    if (
      requestedQuantity > availableQuantity ||
      !Number.isFinite(unitPrice) ||
      unitPrice <= 0
    ) {
      return res.status(400).json({ error: "Requested quantity is unavailable" })
    }

    const totalPriceUsdCents = Math.round(unitPrice * 0.007731 * 100) * requestedQuantity

    const rent = {
      equipmentID: equipment._id,
      userEmail,
      ownerEmail,
      quantity: requestedQuantity,
      phone: phone.trim(),
      address: address.trim(),
      additionalNotes: additionalNotes.trim(),
      rentalType: equipment.rentalType,
      unitPrice,
      totalPrice: (totalPriceUsdCents / 100)/ 0.007731,
      checkoutDate: new Date(),
      status: "pending",
      rentStartDate: rentStartDate,
      rentEndDate: rentEndDate,
      createdAt: new Date(),
      paymentStatus: "pending"
    }

    const rentResult = await rentCollection.insertOne(rent)
    rentId = rentResult.insertedId

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: requestedQuantity,
          price_data: {
            currency: "usd",
            unit_amount: Math.round(unitPrice * 0.007731 * 100),
            product_data: {
              name: equipment.name,
              description: `Rental price per ${equipment.rentalType}`,
            },
          },
        },
      ],
      metadata: {
        rentId: rentId.toString(),
        equipmentId: equipment._id.toString(),
        userEmail,
        ownerEmail,
        quantity: String(requestedQuantity),
      },
      success_url: `${process.env.CLIENT_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/checkout/cancel`,
    })

    await rentCollection.updateOne(
      { _id: rentId },
      { $set: { stripeSessionId: session.id } }
    )

    return res.json({ url: session.url })
  } catch (error) {
    if (rentId) {
      await rentCollection.deleteOne({ _id: rentId }).catch(() => {})
    }

    console.error("Checkout session creation failed:", error)
    return res.status(500).json({ error: "Could not start checkout" })
  }
})

export default router