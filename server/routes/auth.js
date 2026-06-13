const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

const DEFAULT_FOODS = [
  { name: "Bread & Egg",       price: 700  },
  { name: "Garri & Groundnut", price: 500  },
  { name: "Custard & Akara",   price: 500  },
  { name: "Indomie",           price: 400  },
  { name: "Rice & Stew",       price: 1500 },
];

// REGISTER
router.post("/register", async (req, res) => {
  const supabase = req.app.get("supabase");
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (error) return res.status(400).json({ message: error.message });

  res.status(201).json({
    message: "Account created successfully!",
    user: data.user
  });
});

// LOGIN
router.post("/login", async (req, res) => {
  const supabase = req.app.get("supabase");
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) return res.status(400).json({ message: error.message });

  const token  = data.session.access_token;
  const userId = data.user.id;

  // Use service role key to bypass RLS for checking/adding default foods
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Check if user already has foods
  const { data: existingFoods, error: checkError } = await adminClient
    .from("foods")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  console.log("Existing foods check:", existingFoods, checkError);

  // If no foods — add default foods
  if (!existingFoods || existingFoods.length === 0) {
    const { data: inserted, error: insertError } = await adminClient
      .from("foods")
      .insert(
        DEFAULT_FOODS.map(food => ({
          ...food,
          user_id: userId
        }))
      );

    if (insertError) {
      console.error("❌ Insert error:", insertError.message);
    } else {
      console.log(`✅ Default foods added for ${email}`);
    }
  } else {
    console.log(`ℹ️ User already has foods — skipping defaults`);
  }

  res.json({
    token,
    name:  data.user.user_metadata.name,
    email: data.user.email
  });
});

module.exports = router;