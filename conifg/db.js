import { MongoClient } from "mongodb";

export const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("rentalspace-db");

export const usersCollection = db.collection("user");
export const equipmentCollection = db.collection("equipments");
export const rentCollection = db.collection("rent");
export const favouriteCollection = db.collection("favourites")
export const categoryCollection= db.collection("categories")
export const reviewCollection= db.collection("reviews")

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}