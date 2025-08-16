// Get the grid icon and the dropdown menu
const gridIcon = document.getElementById('gridIcon');
const gridDropdown = document.getElementById('gridDropdown');

// Function to toggle dropdown visibility
function toggleDropdown() {
    if (gridDropdown.style.display === 'block') {
        gridDropdown.style.display = 'none';
    } else {
        gridDropdown.style.display = 'block';
    }
}

// Event listener for clicking the grid icon
if (gridIcon) {
    gridIcon.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the click from immediately closing the dropdown via document click
        toggleDropdown();
    });
}

// Close the dropdown if the user clicks anywhere outside of it
document.addEventListener('click', (event) => {
    // Check if the click was outside the grid icon and outside the dropdown menu
    if (gridDropdown && gridIcon && !gridDropdown.contains(event.target) && !gridIcon.contains(event.target)) {
        gridDropdown.style.display = 'none';
    }
});

// Optional: Prevent closing when clicking inside the dropdown (if you have interactive elements)
if (gridDropdown) {
    gridDropdown.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent the document click listener from closing it
    });
}