// Get DOM elements for split functionality
const splitDropArea = document.getElementById('splitDropArea');
const addSplitFileBtn = document.getElementById('addSplitFileBtn');
const splitFileInput = document.getElementById('splitFileInput');
const splitFileListContainer = document.getElementById('splitFileListContainer');
const splitFileList = document.getElementById('splitFileList');
const startSplitBtn = document.getElementById('startSplitBtn');
const splitSuccessState = document.getElementById('splitSuccessState');
const downloadSplitFileBtn = document.getElementById('downloadSplitFileBtn');
const splitAnotherFileBtn = document.getElementById('splitAnotherFileBtn');
const splitErrorState = document.getElementById('splitErrorState');
const splitErrorMessage = document.getElementById('splitErrorMessage');
const trySplitAgainBtn = document.getElementById('trySplitAgainBtn');
const splitMethodSelect = document.getElementById('splitMethod'); // New for split options

let selectedSplitFile = null; // To store the single file for splitting

// --- Helper Functions ---
function displaySplitFile(file) {
    splitFileList.innerHTML = ''; // Clear previous file
    const listItem = document.createElement('li');
    listItem.textContent = `${file.name} (${(file.size / 1024).toFixed(2)} KB)`;

    const removeBtn = document.createElement('span');
    removeBtn.textContent = 'x';
    removeBtn.classList.add('remove-file');
    removeBtn.onclick = () => {
        selectedSplitFile = null;
        splitFileListContainer.style.display = 'none';
        splitFileList.innerHTML = '';
        resetSplitUI(); // Reset UI when file is removed
    };
    listItem.appendChild(removeBtn);
    splitFileList.appendChild(listItem);
    splitFileListContainer.style.display = 'block';
}

function resetSplitUI() {
    splitDropArea.style.display = 'block';
    splitFileListContainer.style.display = 'none';
    startSplitBtn.style.display = 'block'; // Show split button again
    splitSuccessState.style.display = 'none';
    splitErrorState.style.display = 'none';
    splitErrorMessage.textContent = '';
    selectedSplitFile = null; // Clear selected file
    splitFileList.innerHTML = ''; // Clear file list display
}

function showSplitError(message) {
    if (splitErrorState) splitErrorState.style.display = 'block';
    if (splitErrorMessage) splitErrorMessage.textContent = message;
    if (splitSuccessState) splitSuccessState.style.display = 'none';
    if (startSplitBtn) startSplitBtn.style.display = 'none'; // Hide split button on error
    if (splitDropArea) splitDropArea.style.display = 'none'; // Hide drop area on error
    if (splitFileListContainer) splitFileListContainer.style.display = 'none'; // Hide file list on error
}

// --- Event Listeners ---

// Drag and drop functionality
splitDropArea.addEventListener('dragover', (e) => {
    e.preventDefault(); // Prevent default to allow drop
    splitDropArea.classList.add('drag-over');
});

splitDropArea.addEventListener('dragleave', () => {
    splitDropArea.classList.remove('drag-over');
});

splitDropArea.addEventListener('drop', (e) => {
    e.preventDefault();
    splitDropArea.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        selectedSplitFile = files[0];
        displaySplitFile(selectedSplitFile);
    } else {
        alert('Please drop a single PDF file.');
        selectedSplitFile = null;
    }
});

// Click to add file
addSplitFileBtn.addEventListener('click', () => {
    splitFileInput.click(); // Trigger the hidden file input
});

splitFileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
        selectedSplitFile = files[0];
        displaySplitFile(selectedSplitFile);
    } else {
        alert('Please select a single PDF file.');
        selectedSplitFile = null;
        splitFileListContainer.style.display = 'none';
        splitFileList.innerHTML = '';
    }
});

// Start Split Button
startSplitBtn.addEventListener('click', async () => {
    if (!selectedSplitFile) {
        alert('Please select a PDF file to split.');
        return;
    }

    startSplitBtn.disabled = true; // Disable button during processing
    startSplitBtn.textContent = 'Splitting...';
    showSplitError(''); // Clear any previous errors

    const formData = new FormData();
    formData.append('fileToSplit', selectedSplitFile); // 'fileToSplit' should match multer field name
    formData.append('splitMethod', splitMethodSelect.value); // Send selected split method

    try {
        const response = await fetch('/split-pdf', { // Your new split endpoint
            method: 'POST',
            body: formData,
        });

        if (response.ok) {
            const result = await response.json();
            const downloadUrl = result.downloadUrl;
            const zipFileName = result.fileName;

            if (splitSuccessState) splitSuccessState.style.display = 'block';
            if (downloadSplitFileBtn) {
                downloadSplitFileBtn.href = downloadUrl;
                downloadSplitFileBtn.download = zipFileName; // Name for the downloaded ZIP
            }
            startSplitBtn.style.display = 'none'; // Hide split button on success
            splitDropArea.style.display = 'none'; // Hide drop area
            splitFileListContainer.style.display = 'none'; // Hide file list
            console.log("Download button href set to:", downloadSplitFileBtn.href);
            console.log("Download button download attribute set to:", downloadSplitFileBtn.download);

        } else {
            const errorResult = await response.json();
            showSplitError(`Error: ${errorResult.message || 'An unknown error occurred.'}`);
        }
    } catch (error) {
        console.error('Error during split operation:', error);
        showSplitError(`Network error or server unreachable: ${error.message}`);
    } finally {
        startSplitBtn.disabled = false; // Re-enable button
        startSplitBtn.textContent = 'Split File Now';
    }
});

// Split Another File Button
splitAnotherFileBtn.addEventListener('click', () => {
    resetSplitUI();
});

// Try Again Button (for errors)
trySplitAgainBtn.addEventListener('click', () => {
    resetSplitUI();
});

// Initial UI reset
resetSplitUI();