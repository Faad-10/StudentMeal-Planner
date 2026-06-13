const express = require("express");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Make supabase available to routes
app.set("supabase", supabase);

// Routes
app.use("/api/auth",  require("./routes/auth"));
app.use("/api/foods", require("./routes/foods"));
app.use("/api/profile", require("./routes/profile"));

// Health check — visit this to confirm server is running
app.get("/", (req, res) => res.send("✅ Meal Planner API is running!"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
