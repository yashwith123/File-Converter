// authUI.js

// Add CSS styles for icons
const style = document.createElement("style");
style.innerHTML = `
.user-profile .user-icon,
.grid-icon {
    color: black !important;
}
`;
document.head.appendChild(style);

document.addEventListener("DOMContentLoaded", async () => {
    // Step 0: Check server boot ID
    try {
        const res = await fetch("/boot-id"); // You must create this endpoint in server.js
        const { bootId } = await res.json();

        const savedBootId = localStorage.getItem("bootId");

        if (savedBootId !== bootId.toString()) {
            // Server restarted OR first time visit
            localStorage.removeItem("loggedInUser");
            localStorage.setItem("bootId", bootId);
        }
    } catch (err) {
        console.warn("Could not fetch boot ID:", err);
    }

    // Step 1: Check if already logged in
    let username = localStorage.getItem("loggedInUser");

    // Step 2: If not, check URL for ?username=... and save it
    if (!username) {
        const params = new URLSearchParams(window.location.search);
        const urlUsername = params.get("username");

        if (urlUsername) {
            localStorage.setItem("loggedInUser", urlUsername);
            // Remove ?username=... from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            username = urlUsername;
        }
    }

    // Step 3: If we have a username, update UI
    if (username) {
        // Hide login and signup buttons
        const loginBtn = document.querySelector(".user-actions .login");
        const signupBtn = document.querySelector(".user-actions .signup");
        if (loginBtn) loginBtn.remove();
        if (signupBtn) signupBtn.remove();

        // Show user profile
        const userActions = document.querySelector(".user-actions");
        if (userActions) {
            userActions.innerHTML = ''; // Clear anything before

            // Create profile block
            const profile = document.createElement("div");
            profile.className = "user-profile";
            profile.innerHTML = `
              <div class="user-icon">👤</div>
              <div class="dropdown">
                <span>${username}</span>
                <ul>
                  <li><a href="#">Account settings</a></li>
                  <li><a href="#">Signatures</a></li>
                  <li><a href="#">Upgrade to Premium</a></li>
                  <li><a href="#" onclick="logout()">Log out</a></li>
                </ul>
              </div>
            `;
            userActions.appendChild(profile);

            // Create grid icon AFTER profile
            const menuIcon = document.createElement("div");
            menuIcon.className = "grid-icon";
            menuIcon.innerHTML = `⋮⋮<br/>⋮⋮`;
            userActions.appendChild(menuIcon);
        }
    }
});

function logout() {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
}
