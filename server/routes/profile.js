const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const router = express.Router();

// Middleware — verify token
async function auth(req, res, next) {
  const supabase = req.app.get("supabase");
  const token = req.headers.authorization?.split(" ")[1];
  if (!token)
    return res.status(401).json({ message: "Please log in first" });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user)
    return res.status(401).json({ message: "Session expired" });

  req.user  = data.user;
  req.token = token;
  next();
}

// GET profile
router.get("/", auth, async (req, res) => {
  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${req.token}` } } }
  );

  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", req.user.id)
    .single();

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// UPDATE profile
router.put("/", auth, async (req, res) => {
  const { name, default_budget, default_meals } = req.body;

  const client = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${req.token}` } } }
  );

  const { data, error } = await client
    .from("profiles")
    .update({
      name,
      default_budget,
      default_meals,
      updated_at: new Date()
    })
    .eq("id", req.user.id)
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  // Also update name in auth metadata
  await req.app.get("supabase").auth.admin.updateUserById(
    req.user.id,
    { user_metadata: { name } }
  );

  // Update localStorage name
  res.json({ ...data, message: "Profile updated successfully!" });
});

// CHANGE PASSWORD
router.put("/password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: "All fields are required" });

  if (newPassword.length < 6)
    return res.status(400).json({ message: "Password must be at least 6 characters" });

  const supabase = req.app.get("supabase");

  // Verify current password by trying to sign in
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: req.user.email,
    password: currentPassword
  });

  if (loginError)
    return res.status(400).json({ message: "Current password is incorrect" });

  // Update password
  const adminClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { error } = await adminClient.auth.admin.updateUserById(
    req.user.id,
    { password: newPassword }
  );

  if (error) return res.status(500).json({ message: error.message });
  res.json({ message: "Password changed successfully!" });
});

module.exports = router;