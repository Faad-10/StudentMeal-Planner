const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Middleware — checks the token on every request
async function auth(req, res, next) {
  const supabase = req.app.get("supabase");
  const token = req.headers.authorization?.split(" ")[1];

  if (!token)
    return res.status(401).json({ message: "Please log in first" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ message: "Session expired, please log in again" });

  req.user  = data.user;
  req.token = token;
  next();
}

// GET all foods for this user
router.get("/", auth, async (req, res) => {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${req.token}` } } }
  );
  const { data, error } = await client
    .from("foods")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// ADD a food
router.post("/", auth, async (req, res) => {
  const { name, price } = req.body;
  if (!name || !price)
    return res.status(400).json({ message: "Food name and price are required" });

  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${req.token}` } } }
  );
  const { data, error } = await client
    .from("foods")
    .insert({ name, price: Number(price), user_id: req.user.id })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.status(201).json(data);
});

// EDIT a food
router.put("/:id", auth, async (req, res) => {
  const { name, price } = req.body;
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${req.token}` } } }
  );
  const { data, error } = await client
    .from("foods")
    .update({ name, price: Number(price) })
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// DELETE a food
router.delete("/:id", auth, async (req, res) => {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${req.token}` } } }
  );
  const { error } = await client
    .from("foods")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Food deleted successfully" });
});

module.exports = router;