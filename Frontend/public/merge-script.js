// Get references to your elements (ensure all are defined here if used globally in this script)
const mergeFileInput = document.getElementById('mergeFileInput');
const chooseMergeFilesBtn = document.getElementById('chooseMergeFilesBtn');
const mergeFileListContainer = document.getElementById('mergeFileListContainer');
// CRITICAL FIX: Ensure you have a <ul> with id="mergeFileList" inside mergeFileListContainer in your HTML.
// If mergeFileListContainer contains just comments, mergeFileList will be null.
const mergeFileList = document.getElementById('mergeFileList');
const startMergeBtn = document.getElementById('startMergeBtn');
const mergeUploadBox = document.querySelector('.merge-upload-box');

const mergeProgressContainer = document.getElementById('mergeProgressContainer');
const mergeProgressText = document.getElementById('mergeProgressText');
const mergeSuccessState = document.getElementById('mergeSuccessState');
const mergeErrorState = document.getElementById('mergeErrorState');
const downloadMergedFileBtn = document.getElementById('downloadMergedFileBtn');
const mergeMoreFilesBtn = document.getElementById('mergeMoreFilesBtn');
const retryMergeBtn = document.getElementById('retryMergeBtn');
const mergeOutputFormat = document.getElementById('mergeOutputFormat');

// --- Variables for Merge Functionality ---
let selectedMergeFiles = []; // Array to hold the File objects

console.log("--- Initial DOM Element Check ---");
console.log("mergeFileListContainer:", mergeFileListContainer);
console.log("mergeFileList:", mergeFileList); // This MUST NOT be null for list to render!
console.log("chooseMergeFilesBtn:", chooseMergeFilesBtn);
console.log("mergeFileInput:", mergeFileInput);
console.log("---------------------------------");


// --- Helper Functions ---

// Function to format file size for display
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Function to add files to the selectedMergeFiles array
function handleSelectedMergeFiles(files) {
    console.log("handleSelectedMergeFiles called. Files received:", files);
    Array.from(files).forEach(file => {
        selectedMergeFiles.push(file);
    });
    console.log("selectedMergeFiles array after addition:", selectedMergeFiles);
    renderMergeFileList();
    updateMergeButtonState();
}

// Function to render the list of selected files for merging
function renderMergeFileList() {
    console.log("renderMergeFileList function started.");
    if (!mergeFileList) {
        console.error("ERROR: mergeFileList element (UL) not found! Please check merge.html.");
        return; // Exit if the element is missing
    }

    mergeFileList.innerHTML = ''; // Clear current list items

    if (selectedMergeFiles.length === 0) {
        // Hide the container if no files are selected
        if (mergeFileListContainer) {
            mergeFileListContainer.style.display = 'none';
            console.log("No files selected. Hiding mergeFileListContainer.");
        }
        if (startMergeBtn) {
            startMergeBtn.disabled = true; // Disable merge button if less than 2 files
        }
        return;
    }

    // Add a heading for the file list (moved from HTML to JS for dynamic control)
    // You can remove the <h3> from merge.html if you want this controlled by JS
    const listHeading = document.createElement('h5');
    listHeading.textContent = `Selected Files (${selectedMergeFiles.length}):`;
    // Prepend or append the heading as desired
    if (mergeFileListContainer.firstChild !== listHeading) { // Avoid adding multiple headings
         mergeFileListContainer.prepend(listHeading);
    }


    selectedMergeFiles.forEach((file, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'merge-file-item'; // Use the class for styling
        listItem.draggable = true; // Make items draggable
        listItem.dataset.originalIndex = index; // Store original index for re-mapping
        // Use a more robust unique ID for removal/reordering if needed, e.g., timestamp + filename
        listItem.dataset.fileUniqueId = `${file.name}-${file.size}-${file.lastModified}`;

        // FIX: Corrected template literal syntax for file.name and file.size
        listItem.innerHTML = `
            <span>${file.name} (${formatBytes(file.size)})</span>
            <button class="remove-file-btn" data-file-unique-id="${listItem.dataset.fileUniqueId}">&times;</button>
        `;
        mergeFileList.appendChild(listItem);
        console.log(`Appended file: ${file.name} to mergeFileList.`);
    });

    // Show the container after rendering, if it was hidden
    if (mergeFileListContainer) {
        mergeFileListContainer.style.display = 'block';
        console.log("mergeFileListContainer displayed.");
    }

    // Re-attach event listeners for remove buttons (important for dynamically added elements)
    // Use event delegation on the container for efficiency
    mergeFileListContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('remove-file-btn')) {
            const uniqueIdToRemove = event.target.dataset.fileUniqueId;
            removeMergeFile(uniqueIdToRemove);
            console.log(`Removed file with ID: ${uniqueIdToRemove}.`);
        }
    });

    // Re-attach drag and drop listeners for list items
    addDragAndDropListenersForList(); // Call this here to apply to new list items
}

// Function to remove a file from the selectedMergeFiles array based on a unique ID
function removeMergeFile(uniqueIdToRemove) {
    selectedMergeFiles = selectedMergeFiles.filter(file => {
        return `${file.name}-${file.size}-${file.lastModified}` !== uniqueIdToRemove;
    });
    renderMergeFileList(); // Re-render the list after removal
    updateMergeButtonState(); // Update button state
}


function updateMergeButtonState() {
    console.log("updateMergeButtonState called. selectedMergeFiles.length:", selectedMergeFiles.length);
    if (startMergeBtn) {
        startMergeBtn.disabled = selectedMergeFiles.length < 2;
        console.log("Start Merge Button disabled:", startMergeBtn.disabled);
    }
}

function resetMergeUI() {
    selectedMergeFiles = [];
    renderMergeFileList(); // This will now hide the container if selectedMergeFiles is empty
    if (mergeUploadBox) mergeUploadBox.style.display = 'block';
    if (startMergeBtn) startMergeBtn.style.display = 'block';
    if (mergeProgressContainer) mergeProgressContainer.style.display = 'none';
    if (mergeSuccessState) {
        if (downloadMergedFileBtn && downloadMergedFileBtn.href.startsWith('blob:')) {
            URL.revokeObjectURL(downloadMergedFileBtn.href);
            downloadMergedFileBtn.href = '#';
        }
        mergeSuccessState.style.display = 'none';
    }
    if (mergeErrorState) mergeErrorState.style.display = 'none';
    console.log("UI Reset.");
}


// --- MAIN EVENT LISTENERS ---

// Make the "Add Files" button trigger the hidden file input
if (chooseMergeFilesBtn && mergeFileInput) {
    chooseMergeFilesBtn.addEventListener('click', () => {
        mergeFileInput.click();
        console.log("Choose Files button clicked. Triggering file input click.");
    });
}

// Handle files selected via the file input
if (mergeFileInput) {
    mergeFileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        console.log("File input change event. Files selected:", files);
        if (files.length > 0) {
            handleSelectedMergeFiles(files);
        }
        event.target.value = ''; // Clear the input
    });
}

// Handle drag and drop for the upload box
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
            handleSelectedMergeFiles(e.dataTransfer.files); // Use handleSelectedMergeFiles here too
        }
    });
}

// --- Drag & Drop for reordering files in the list ---
let draggedItem = null;

function addDragAndDropListenersForList() {
    const fileItems = mergeFileListContainer.querySelectorAll('.merge-file-item');

    fileItems.forEach(item => {
        item.addEventListener('dragstart', (e) => {
            draggedItem = item;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', item.dataset.fileUniqueId); // Use unique ID
            setTimeout(() => item.classList.add('dragging'), 0);
        });

        item.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
            syncSelectedMergeFilesWithDOMOrder(); // Re-sync array after drag ends
        });

        item.addEventListener('dragover', (e) => {
            e.preventDefault();
            const target = e.target.closest('.merge-file-item');
            if (target && draggedItem && target !== draggedItem && target.parentNode === mergeFileList) { // Corrected target.parentNode to mergeFileList
                const boundingBox = target.getBoundingClientRect();
                const offset = e.clientY - boundingBox.top;
                const center = boundingBox.height / 2;

                if (offset > center) {
                    mergeFileList.insertBefore(draggedItem, target.nextSibling);
                } else {
                    mergeFileList.insertBefore(draggedItem, target);
                }
            }
        });

        item.addEventListener('drop', (e) => {
            e.preventDefault();
            // Drop is handled by dragover for reordering the DOM visually
        });
    });
}

// Function to re-sync selectedMergeFiles array based on current DOM order
function syncSelectedMergeFilesWithDOMOrder() {
    const currentOrderElements = Array.from(mergeFileList.querySelectorAll('.merge-file-item')); // Query inside mergeFileList (UL)
    const reorderedFiles = [];
    currentOrderElements.forEach(domItem => {
        const fileUniqueId = domItem.dataset.fileUniqueId;
        const foundFile = selectedMergeFiles.find(file => `${file.name}-${file.size}-${file.lastModified}` === fileUniqueId);
        if (foundFile) {
            reorderedFiles.push(foundFile);
        }
    });
    selectedMergeFiles = reorderedFiles;
    console.log("selectedMergeFiles re-synced with DOM order:", selectedMergeFiles.map(f => f.name));
    renderMergeFileList(); // Re-render to update data-index attributes consistently if needed (optional)
}


// --- Start Merge Process (Actual Server Call) ---
if (startMergeBtn) {
    startMergeBtn.addEventListener('click', async () => { // Make it async
        if (selectedMergeFiles.length < 2) {
            alert('Please select at least two files to merge.');
            return;
        }

        syncSelectedMergeFilesWithDOMOrder(); // Ensure array order matches UI before sending

        // Hide upload area, show progress
        if (mergeUploadBox) mergeUploadBox.style.display = 'none';
        if (mergeFileListContainer) mergeFileListContainer.style.display = 'none';
        if (startMergeBtn) startMergeBtn.style.display = 'none';
        if (mergeProgressContainer) mergeProgressContainer.style.display = 'block';
        if (mergeSuccessState) mergeSuccessState.style.display = 'none';
        if (mergeErrorState) mergeErrorState.style.display = 'none';
        if (mergeProgressText) mergeProgressText.textContent = '0%';
        const progressBar = mergeProgressContainer ? mergeProgressContainer.querySelector('.progress-bar') : null;
        if (progressBar) progressBar.style.width = '0%';

        // Use FormData to send files
        const formData = new FormData();
        selectedMergeFiles.forEach(file => {
            formData.append('filesToMerge', file); // 'filesToMerge' must match the field name in multer.array()
        });

        // Add the desired output format to the FormData
        const outputFormat = mergeOutputFormat ? mergeOutputFormat.value : 'pdf';
        formData.append('outputFormat', outputFormat);


        // Simulate progress for UI feedback during actual upload
        let currentProgress = 0;
        const uiInterval = setInterval(() => {
            if (currentProgress < 90) { // Simulate up to 90% before completion from server
                currentProgress += 5; // Increment by 5% every 100ms
                if (mergeProgressText) mergeProgressText.textContent = `${currentProgress}%`;
                if (progressBar) progressBar.style.width = `${currentProgress}%`;
            }
        }, 100);


        try {
            const response = await fetch('/merge-files', {
                method: 'POST',
                body: formData, // No Content-Type header needed for FormData
            });

            clearInterval(uiInterval); // Stop UI simulation once fetch response is received

            if (mergeProgressText) mergeProgressText.textContent = `100%`; // Ensure 100% on success/failure
            if (progressBar) progressBar.style.width = `100%`;

            if (response.ok) {
                // Get the blob data from the response
                const result = await response.json(); // Server now sends JSON with downloadUrl
                const downloadUrl = result.downloadUrl;
                const mergedFileName = result.fileName;

                if (mergeSuccessState) mergeSuccessState.style.display = 'block';
                if (downloadMergedFileBtn) {
                    downloadMergedFileBtn.href = downloadUrl;
                    downloadMergedFileBtn.download = mergedFileName; // Use the filename from the server
                }

                // Clean up the URL when the "Merge More Files" button is clicked or page is navigated
                if (mergeMoreFilesBtn) {
                    // Using `once: true` means this listener is automatically removed after it fires once
                    mergeMoreFilesBtn.addEventListener('click', () => {
                        // For server-served files, revoking the URL here might not be necessary
                        // as the browser handles the download from a network URL.
                        // However, if downloadUrl was a client-side Blob URL, you'd revoke it.
                        resetMergeUI();
                    }, { once: true });
                }
            } else {
                const errorResult = await response.text(); // Or response.json() if your server sends JSON errors
                console.error('Merge failed:', errorResult);
                if (mergeErrorState) {
                    mergeErrorState.style.display = 'block';
                    mergeErrorState.querySelector('p').textContent = `Merge Failed! ${errorResult}`; // Show server error
                }
            }
        } catch (error) {
            clearInterval(uiInterval); // Stop UI simulation on error
            console.error('Network or merge error:', error);
            if (mergeProgressText) mergeProgressText.textContent = `Error`;
            if (progressBar) progressBar.style.width = `0%`; // Reset progress bar on error

            if (mergeErrorState) {
                mergeErrorState.style.display = 'block';
                mergeErrorState.querySelector('p').textContent = `An error occurred during merging: ${error.message}. Please try again.`;
            }
        } finally {
            // Hide progress container after process finishes (success or error)
            if (mergeProgressContainer) mergeProgressContainer.style.display = 'none';
        }
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


// --- Modals (Login/Signup) ---
// This part handles your login/signup modals. Make sure these elements exist in your HTML.
const loginHeaderBtn = document.getElementById('loginHeaderBtn');
const signupHeaderBtn = document.getElementById('signupHeaderBtn');
const loginModal = document.getElementById('loginModal');
const signupModal = document.getElementById('signupModal');
const closeButtons = document.querySelectorAll('.modal .close-button');
const switchToSignupLink = document.getElementById('switchToSignup');
const switchToLoginLink = document.getElementById('switchToLogin');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');


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
