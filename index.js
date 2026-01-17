import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------- MIDDLEWARE ---------- */
app.use(
  cors({
    origin: "http://localhost:3000",
  })
);
app.use(express.json());

/* ---------- MONGODB CONNECT ---------- */
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ---------- SCHEMAS ---------- */

// USER
const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: String,
  displayName: String,
  photoURL: String,
  role: { type: String, default: "user" },
  phone: String,
  address: String,
  lastLogin: { type: Date, default: Date.now },
});

// ITEM
const ItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  image: String,
  category: String,
  stock: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
});

// ✅ NEW: ORDER (PAYMENT)
const OrderSchema = new mongoose.Schema(
  {
    items: [
      {
        id: String,
        name: String,
        price: Number,
        quantity: Number,
        image: String,
      },
    ],
    totalAmount: Number,
    userEmail: String,
    status: {
      type: String,
      default: "pending", // pending | paid | shipped
    },
  },
  { timestamps: true }
);

/* ---------- MODELS ---------- */
const User = mongoose.model("User", UserSchema);
const Item = mongoose.model("Item", ItemSchema);
const Order = mongoose.model("Order", OrderSchema);

/* ---------- SIMPLE AUTH ---------- */
const simpleAuth = (req, res, next) => {
  const key = req.headers["x-api-key"];

  if (key !== "12345") {
    return res.status(401).json({ message: "Not allowed" });
  }

  next();
};

/* ---------- ROUTES ---------- */

// TEST
app.get("/", (req, res) => {
  res.send("🚀 LuminaMarket Server Running");
});

/* ---------- ITEMS ---------- */

// GET all items
app.get("/api/items", async (req, res) => {
  try {
    const items = await Item.find().sort({ _id: -1 });
    res.json(items);
  } catch {
    res.status(500).json({ message: "Failed to fetch items" });
  }
});

// ADD item
app.post("/api/items", simpleAuth, async (req, res) => {
  try {
    const item = new Item(req.body);
    const saved = await item.save();
    res.status(201).json(saved);
  } catch {
    res.status(400).json({ message: "Item add failed" });
  }
});

/* ---------- USERS ---------- */

// GET user by uid
app.get("/api/users/:uid", async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    res.json(user);
  } catch {
    res.status(500).json({ message: "User not found" });
  }
});

// SYNC user
app.post("/api/users/sync", async (req, res) => {
  const { uid, ...rest } = req.body;

  try {
    const user = await User.findOneAndUpdate(
      { uid },
      { ...rest, lastLogin: new Date() },
      { upsert: true, new: true }
    );
    res.json(user);
  } catch {
    res.status(400).json({ message: "User sync failed" });
  }
});

/* ---------- ✅ ORDERS / PAYMENT ---------- */

// CREATE ORDER (Pay Now)
app.post("/api/orders", async (req, res) => {
  try {
    const order = new Order(req.body);
    const saved = await order.save();
    res.status(201).json(saved);
  } catch {
    res.status(400).json({ message: "Order failed" });
  }
});
// GET orders by user email
app.get("/api/orders/:email", async (req, res) => {
  try {
    const orders = await Order.find({ userEmail: req.params.email }).sort({
      createdAt: -1,
    });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});


// GET ALL ORDERS (Dashboard)
app.get("/api/orders", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

/* ---------- SERVER START ---------- */
app.listen(PORT, () => {
  console.log(`✅ Server running: http://localhost:${PORT}`);
});
