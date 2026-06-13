const API = "http://localhost:5000/api";
const token = localStorage.getItem("token");

// Redirect to login if not logged in
if (!token) window.location.href = "login.html";

let foods = [];
let editIndex = null;

// ── DOM Elements ──────────────────────────────────────────
const foodTableBody = document.getElementById("foodTableBody");
const foodModal     = document.getElementById("foodModal");
const openModalBtn  = document.getElementById("openModalBtn");
const closeBtn      = document.getElementById("closeBtn");
const saveBtn       = document.getElementById("saveBtn");
const foodName      = document.getElementById("foodName");
const foodPrice     = document.getElementById("foodPrice");
const modalTitle    = document.getElementById("modalTitle");
const clearBtn      = document.getElementById("clearBtn");

// ── Load Foods from Supabase ──────────────────────────────
async function loadFoods() {
  try {
    foodTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:30px; color:#888;">
          Loading foods...
        </td>
      </tr>`;

    const res = await fetch(`${API}/foods`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "login.html";
      return;
    }

    foods = await res.json();
    displayFoods();

  } catch (err) {
    foodTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:30px; color:#dc3545;">
          ❌ Cannot connect to server. Make sure it is running.
        </td>
      </tr>`;
  }
}

// ── Display Foods in Table ────────────────────────────────
function displayFoods() {
  if (foods.length === 0) {
    foodTableBody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center; padding:30px; color:#888;">
          No foods yet. Click "+ Add Food" to get started!
        </td>
      </tr>`;
    return;
  }

  foodTableBody.innerHTML = "";
  foods.forEach((food, index) => {
    foodTableBody.innerHTML += `
      <tr>
        <td>${food.name}</td>
        <td>₦${food.price}</td>
        <td>
          <button class="edit-btn" onclick="editFood(${index})">Edit</button>
          <button class="delete-btn" onclick="deleteFood(${index})">Delete</button>
        </td>
      </tr>`;
  });
}

// ── Open Modal to Add Food ────────────────────────────────
openModalBtn.addEventListener("click", () => {
  foodModal.style.display = "flex";
  modalTitle.innerText    = "Add Food";
  foodName.value          = "";
  foodPrice.value         = "";
  editIndex               = null;
});

// ── Close Modal ───────────────────────────────────────────
closeBtn.addEventListener("click", () => {
  foodModal.style.display = "none";
});

// ── Save Food (Add or Edit) ───────────────────────────────
saveBtn.addEventListener("click", async () => {
  const name  = foodName.value.trim();
  const price = foodPrice.value;

  if (!name || !price) {
    alert("Please fill all fields");
    return;
  }

  saveBtn.textContent = "Saving...";
  saveBtn.disabled    = true;

  try {
    if (editIndex !== null) {
      // ── EDIT existing food ──
      const food = foods[editIndex];
      const res  = await fetch(`${API}/foods/${food.id}`, {
        method:  "PUT",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`
        },
        body: JSON.stringify({ name, price: Number(price) })
      });

      if (!res.ok) throw new Error("Failed to update food");

      const updated  = await res.json();
      foods[editIndex] = updated;

    } else {
      // ── ADD new food ──
      const res = await fetch(`${API}/foods`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${token}`
        },
        body: JSON.stringify({ name, price: Number(price) })
      });

      if (!res.ok) throw new Error("Failed to add food");

      const newFood = await res.json();
      foods.push(newFood);
    }

    foodModal.style.display = "none";
    displayFoods();

  } catch (err) {
    alert("❌ Error saving food. Make sure the server is running.");
  } finally {
    saveBtn.textContent = "Save Food";
    saveBtn.disabled    = false;
  }
});

// ── Edit Food ─────────────────────────────────────────────
function editFood(index) {
  editIndex               = index;
  foodModal.style.display = "flex";
  modalTitle.innerText    = "Edit Food";
  foodName.value          = foods[index].name;
  foodPrice.value         = foods[index].price;
}

// ── Delete Food ───────────────────────────────────────────
async function deleteFood(index) {
  const confirmDelete = confirm("Delete this food item?");
  if (!confirmDelete) return;

  try {
    const food = foods[index];
    const res  = await fetch(`${API}/foods/${food.id}`, {
      method:  "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Failed to delete food");

    foods.splice(index, 1);
    displayFoods();

  } catch (err) {
    alert("❌ Error deleting food. Make sure the server is running.");
  }
}

// ── Clear All Foods ───────────────────────────────────────
clearBtn.addEventListener("click", async () => {
  const confirmClear = confirm("Clear ALL food items? This cannot be undone.");
  if (!confirmClear) return;

  try {
    // Delete all foods one by one
    await Promise.all(
      foods.map(food =>
        fetch(`${API}/foods/${food.id}`, {
          method:  "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        })
      )
    );

    foods = [];
    displayFoods();

  } catch (err) {
    alert("❌ Error clearing foods. Make sure the server is running.");
  }
});

// ── Logout ────────────────────────────────────────────────
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    localStorage.removeItem("token");
    localStorage.removeItem("userName");
    localStorage.removeItem("userEmail");
    window.location.href = "login.html";
  }
}

// ── Start ─────────────────────────────────────────────────
loadFoods();