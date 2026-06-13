const API = "https://student-meal-planner-api.onrender.com";
const token = localStorage.getItem("token");

// Redirect to login if not logged in
if (!token) window.location.href = "login.html";

let foods = [];

// ── Load foods from Supabase when page opens ──────────────
async function loadFoods() {
  try {
    const res = await fetch(`${API}/foods`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    foods = await res.json();

  } catch (err) {
    console.error("Could not load foods:", err);
    foods = [];
  }
}

// ── Generate Meal Plan ────────────────────────────────────
function generatePlan() {
  const allowance  = parseInt(document.getElementById('allowance').value) || 10000;
  const mealCount  = parseInt(document.querySelector('input[name="meal"]:checked').value);
  const btn        = document.getElementById('generateBtn');

  if (foods.length === 0) {
    alert("No foods available. Please add some on the Food List page first.");
    return;
  }

  btn.textContent = "Generating...";
  btn.disabled    = true;

  setTimeout(() => {
    const mealLabels = mealCount === 2
      ? ["Breakfast", "Lunch"]
      : ["Breakfast", "Lunch", "Dinner"];

    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    function pickFood(lastName) {
      if (foods.length === 1) return foods[0];
      let pick;
      do {
        pick = foods[Math.floor(Math.random() * foods.length)];
      } while (pick.name === lastName);
      return pick;
    }

    let totalCost = 0;
    let lastFood  = null;

    const weekPlan = days.map(day => {
      const dayMeals = mealLabels.map(label => {
        const food  = pickFood(lastFood?.name);
        lastFood    = food;
        totalCost  += Number(food.price);
        return { label, food };
      });
      return { day, meals: dayMeals };
    });

    // Render grid
    const grid = document.getElementById('planGrid');
    grid.innerHTML = weekPlan.map(({ day, meals }) =>
      `<div class="plan-day">
        <div class="plan-day-name">${day}</div>
        ${meals.map(({ label, food }) =>
          `<div class="plan-meal-item">
            <span class="plan-meal-label">${label}</span>
            <span>${food.name}</span>
            <span class="plan-meal-price">₦${Number(food.price).toLocaleString()}</span>
          </div>`
        ).join('')}
      </div>`
    ).join('');

    // Budget bar
    const pct        = Math.min(100, Math.round((totalCost / allowance) * 100));
    const overBudget = totalCost > allowance;

    document.getElementById('budgetSpend').textContent =
      `₦${totalCost.toLocaleString()} / ₦${allowance.toLocaleString()}`;

    document.getElementById('budgetFill').style.width      = pct + '%';
    document.getElementById('budgetFill').style.background = overBudget ? '#dc3545' : '#138c2f';

    document.getElementById('planner').style.display = 'block';

    btn.textContent = "Regenerate Plan";
    btn.disabled    = false;
  }, 600);
}

// ── Logout ────────────────────────────────────────────────
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "login.html";
  }
}

// ── Start — load foods and profile preferences ────────────
async function init() {
  await loadFoods();
  await loadProfilePreferences();
}

init();
// Load profile preferences and pre-fill the form
async function loadProfilePreferences() {
  try {
    const res = await fetch(`${API}/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) return; // silently fail — don't block the page

    const profile = await res.json();

    // Pre-fill budget with default from profile
    if (profile.default_budget) {
      document.getElementById("allowance").value = profile.default_budget;
    }

    // Pre-select meal count from profile
    if (profile.default_meals) {
      const radio = document.querySelector(
        `input[name="meal"][value="${profile.default_meals}"]`
      );
      if (radio) radio.checked = true;
    }

  } catch (err) {
    console.log("Could not load profile preferences:", err);
  }
}