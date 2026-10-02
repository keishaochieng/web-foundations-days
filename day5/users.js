const USERS_URL = "https://jsonplaceholder.typicode.com/users";

const loadButton = document.querySelector("#load-users");
const filterInput = document.querySelector("#filter-input");
const statusMessage = document.querySelector("#status");
const usersList = document.querySelector("#users-list");

let allUsers = [];

// Draws any array of users into the list
function renderUsers(list) {
  usersList.textContent = "";

  if (list.length === 0) {
    const message = document.createElement("li");
    message.textContent = "No users match your filter.";
    usersList.appendChild(message);
    return;
  }

  for (const user of list) {
    const li = document.createElement("li");

    const name = document.createElement("strong");
    name.textContent = user.name;

    const email = document.createElement("div");
    email.textContent = `Email: ${user.email}`;

    const city = document.createElement("div");
    city.textContent = `City: ${user.address.city}`;

    const company = document.createElement("div");
    company.textContent = `Company: ${user.company.name}`;

    li.append(name, email, city, company);
    usersList.appendChild(li);
  }
}

// Fetches the users once and stores them
async function loadUsers() {
  statusMessage.textContent = "Loading users...";
  loadButton.disabled = true;

  try {
    const response = await fetch(USERS_URL);

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    allUsers = await response.json();
    renderUsers(allUsers);
    statusMessage.textContent = `Loaded ${allUsers.length} users.`;
  } catch (error) {
    console.error(error);
    statusMessage.textContent = "Could not load users. Please try again.";
  } finally {
    loadButton.disabled = false;
  }
}

// Filters the stored array without making a new request
filterInput.addEventListener("input", () => {
  if (allUsers.length === 0) {
    return;
  }
  const query = filterInput.value.trim().toLowerCase();
  const matches = allUsers.filter((user) =>
    user.name.toLowerCase().includes(query)
  );
  renderUsers(matches);
});

loadButton.addEventListener("click", loadUsers);