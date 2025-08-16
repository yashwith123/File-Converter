// Get references to your elements
const mergeFileInput = document.getElementById('mergeFileInput');
const chooseMergeFilesBtn = document.getElementById('chooseMergeFilesBtn');
const mergeFileListContainer = document.getElementById('mergeFileListContainer'); // Needed for rendering files
const startMergeBtn = document.getElementById('startMergeBtn'); // Needed for enabling/disabling

// --- Variables for Merge Functionality ---
let selectedMergeFiles = []; // Array to hold the File objects

// --- Helper Functions (These need to be in merge-script.js too!) ---

// Function to format file size for display
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Function to render the list of selected files for merging
function renderMergeFileList() {
    if (!mergeFileListContainer) return; // Exit if container doesn't exist

    mergeFileListContainer.innerHTML = ''; // Clear previous list
    if (selectedMergeFiles.length === 0) {
        mergeFileListContainer.style.display = 'none'; // Hide if no files
        startMergeBtn.disabled = true;
        return;
    }

    mergeFileListContainer.style.display = 'block'; // Show if files are present

    // Add a heading for the file list
    const listHeading = document.createElement('h5');
    listHeading.textContent = `Selected Files (${selectedMergeFiles.length}):`;
    mergeFileListContainer.appendChild(listHeading);

    // Create the list of files
    selectedMergeFiles.forEach((file, index) => {
        const fileItem = document.createElement('div');
        fileItem.className = 'merge-file-item';
        fileItem.draggable = true; // Make items draggable for reordering
        fileItem.dataset.index = index; // Store original index

        fileItem.innerHTML = `
            <span>${file.name}</span>
            <span class="file-size">(${formatBytes(file.size)})</span>
            <button class="remove-file-btn" data-index="${index}">&times;</button>
        `;
        mergeFileListContainer.appendChild(fileItem);
    });

    startMergeBtn.disabled = selectedMergeFiles.length < 2; // Enable only if 2 or more files
}

// Function to add files to the selectedMergeFiles array
function addMergeFiles(files) {
    Array.from(files).forEach(file => {
        // Optional: Add checks for file types if you only want to merge certain types (e.g., PDFs)
        // if (file.type === 'application/pdf') {
        //     selectedMergeFiles.push(file);
        // } else {
        //     alert(`File type not supported for merging: ${file.name}`);
        // }
        selectedMergeFiles.push(file); // Add all files for now
    });
    renderMergeFileList(); // Update the UI
}

// Function to remove a file from the selectedMergeFiles array
function removeMergeFile(index) {
    selectedMergeFiles.splice(index, 1); // Remove the file at the given index
    renderMergeFileList(); // Re-render the list
}

// --- Event Listeners ---

// Make the "Add Files" button trigger the hidden file input
if (chooseMergeFilesBtn && mergeFileInput) {
    chooseMergeFilesBtn.addEventListener('click', () => {
        mergeFileInput.click();
    });
}

// Handle files selected via the file input
if (mergeFileInput) {
    mergeFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            addMergeFiles(e.target.files);
            mergeFileInput.value = ''; // Clear input for re-selection
        }
    });
}

// Handle drag and drop for the upload box
const mergeUploadBox = document.querySelector('.merge-upload-box');
if (mergeUploadBox) {
    mergeUploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        mergeUploadBox.classList.add('drag-over');
    });

    mergeUploadBox.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        mergeUploadBox.classList.remove('drag-over');
    });

    mergeUploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        mergeUploadBox.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addMergeFiles(e.dataTransfer.files);
        }
    });
}

// Handle removing files from the list (event delegation)
if (mergeFileListContainer) {
    mergeFileListContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-file-btn')) {
            const indexToRemove = parseInt(e.target.dataset.index);
            removeMergeFile(indexToRemove);
        }
    });

    // --- Drag & Drop for reordering files in the list ---
    let draggedItem = null;

    mergeFileListContainer.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('merge-file-item')) {
            draggedItem = e.target;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', e.target.dataset.index); // Store original index
            setTimeout(() => {
                draggedItem.classList.add('dragging');
            }, 0);
        }
    });

    mergeFileListContainer.addEventListener('dragend', () => {
        if (draggedItem) {
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        }
    });

    mergeFileListContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        const target = e.target.closest('.merge-file-item');
        if (target && draggedItem && target !== draggedItem) {
            const boundingBox = target.getBoundingClientRect();
            const offset = e.clientY - boundingBox.top;
            const insertBefore = offset < boundingBox.height / 2;

            if (insertBefore) {
                mergeFileListContainer.insertBefore(draggedItem, target);
            } else {
                mergeFileListContainer.insertBefore(draggedItem, target.nextSibling);
            }
        }
    });

    mergeFileListContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        // After dropping and reordering the DOM, update the selectedMergeFiles array
        const reorderedFiles = [];
        Array.from(mergeFileListContainer.children).forEach(item => {
            if (item.classList.contains('merge-file-item')) {
                const originalIndex = parseInt(item.dataset.index);
                // Find the file based on its original index in the *original* selectedMergeFiles array
                // This is a bit tricky; a simpler approach might be to just re-read the DOM order
                // For simplicity, let's just re-read the order of the actual DOM elements
                // A more robust solution for large lists would involve direct array manipulation.
                // For now, let's assume the DOM reordering is enough and re-sync array after drop.
            }
        });
        // A more direct way to re-sync `selectedMergeFiles` after DOM reorder:
        const currentOrderElements = Array.from(mergeFileListContainer.querySelectorAll('.merge-file-item'));
        selectedMergeFiles = currentOrderElements.map(item => {
            const originalIndex = parseInt(item.dataset.index);
            return selectedMergeFiles.find((file, idx) => idx === originalIndex);
        }).filter(Boolean); // Filter out any undefined if re-mapping is complex
        renderMergeFileList(); // Re-render to update data-index attributes correctly
    });
}


// --- Simulate Merge Process (Placeholder) ---
const mergeProgressContainer = document.getElementById('mergeProgressContainer');
const mergeProgressText = document.getElementById('mergeProgressText');
const mergeSuccessState = document.getElementById('mergeSuccessState');
const mergeErrorState = document.getElementById('mergeErrorState');
const downloadMergedFileBtn = document.getElementById('downloadMergedFileBtn');
const mergeMoreFilesBtn = document.getElementById('mergeMoreFilesBtn');
const retryMergeBtn = document.getElementById('retryMergeBtn');
const mergeOutputFormat = document.getElementById('mergeOutputFormat');

if (startMergeBtn) {
    startMergeBtn.addEventListener('click', () => {
        if (selectedMergeFiles.length < 2) {
            alert('Please select at least two files to merge.');
            return;
        }

        // Hide upload area, show progress
        mergeUploadBox.style.display = 'none';
        mergeFileListContainer.style.display = 'none'; // Hide list during merge
        startMergeBtn.style.display = 'none'; // Hide button during merge
        mergeProgressContainer.style.display = 'block';
        mergeSuccessState.style.display = 'none';
        mergeErrorState.style.display = 'none';

        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            if (progress <= 100) {
                mergeProgressText.textContent = `${progress}%`;
                mergeProgressContainer.querySelector('.progress-bar').style.width = `${progress}%`;
            } else {
                clearInterval(interval);
                mergeProgressContainer.style.display = 'none';

                // Simulate success or error randomly for demonstration
                const success = Math.random() > 0.3; // 70% chance of success
                if (success) {
                    mergeSuccessState.style.display = 'block';
                    // Set a dummy download URL (replace with actual merged file URL)
                    const dummyBlob = new Blob(["This is your merged file content."], { type: "application/pdf" });
                    const dummyUrl = URL.createObjectURL(dummyBlob);
                    downloadMergedFileBtn.href = dummyUrl;
                    downloadMergedFileBtn.download = `merged_files.${mergeOutputFormat.value}`;
                } else {
                    mergeErrorState.style.display = 'block';
                }
            }
        }, 300); // Progress updates every 300ms
    });
}

// Reset UI for merging more files
if (mergeMoreFilesBtn) {
    mergeMoreFilesBtn.addEventListener('click', () => {
        resetMergeUI();
    });
}

// Retry merge
if (retryMergeBtn) {
    retryMergeBtn.addEventListener('click', () => {
        resetMergeUI(); // Or re-initiate merge process if specific retry logic is needed
    });
}

function resetMergeUI() {
    selectedMergeFiles = [];
    renderMergeFileList(); // Will hide the list and disable button
    mergeUploadBox.style.display = 'block';
    startMergeBtn.style.display = 'block'; // Show the button again
    mergeProgressContainer.style.display = 'none';
    mergeSuccessState.style.display = 'none';
    mergeErrorState.style.display = 'none';
}

// --- Modals (Login/Signup) ---
// This part should be in a general script that loads on both index.html and merge.html
// Or duplicated in both if you don't have a shared script.
// Assuming it's in a shared script or you will copy it to both.

const loginHeaderBtn = document.getElementById('loginHeaderBtn');
const signupHeaderBtn = document.getElementById('signupHeaderBtn');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const closeButtons = document.querySelectorAll('.modal .close-button');
const switchToSignupLink = document.getElementById('switchToSignup');
const switchToLoginLink = document.getElementById('switchToLogin');

function openModal(modal) {
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeModal(modal) {
    if (modal) {
        modal.style.display = 'none';
    }
}

if (loginHeaderBtn) {
    loginHeaderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(loginModal);
    });
}

if (signupHeaderBtn) {
    signupHeaderBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openModal(signupModal);
    });
}

closeButtons.forEach(button => {
    button.addEventListener('click', () => {
        closeModal(loginModal);
        closeModal(signupModal);
    });
});

window.addEventListener('click', (e) => {
    if (e.target === loginModal) {
        closeModal(loginModal);
    }
    if (e.target === signupModal) {
        closeModal(signupModal);
    }
});

if (switchToSignupLink) {
    switchToSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(loginModal);
        openModal(signupModal);
    });
}

if (switchToLoginLink) {
    switchToLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(signupModal);
        openModal(loginModal);
    });
}

// Handle form submissions (placeholder)
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');

if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Login form submitted!'); // Replace with actual login logic
        closeModal(loginModal);
    });
}

if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Signup form submitted!'); // Replace with actual signup logic
        closeModal(signupModal);
    });
}

// Initial render call when the script loads
document.addEventListener('DOMContentLoaded', () => {
    renderMergeFileList(); // Ensure the file list is correctly rendered on page load
});