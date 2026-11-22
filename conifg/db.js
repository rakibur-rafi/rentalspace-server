
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI is not defined");
}

export const client = new MongoClient(uri);

let connectionPromise;

export async function connectToMongoDB() {
  try {
    if (!connectionPromise) {
      connectionPromise = client.connect();
    }

    await connectionPromise;

    console.log("Successfully connected to MongoDB!");

    return client;
  } catch (error) {
    connectionPromise = null;
    console.error("MongoDB connection failed:", error);
    throw error;
  }
}

const db = client.db("rentalspace-db");

export const usersCollection = db.collection("user");
export const equipmentCollection = db.collection("equipments");
export const rentCollection = db.collection("rent");
export const favouriteCollection = db.collection("favourites");
export const categoryCollection = db.collection("categories");
export const reviewCollection = db.collection("reviews");
