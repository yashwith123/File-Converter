// In a <script> block in compress.html or a linked JS file
document.addEventListener('DOMContentLoaded', () => {
    const compressDropArea = document.getElementById('compressDropArea');
    const addCompressFileBtn = document.getElementById('addCompressFileBtn');
    const compressFileInput = document.getElementById('compressFileInput');

    let selectedFile = null; // To store the single selected file

    // Handle button click to open file dialog
    addCompressFileBtn.addEventListener('click', () => {
        compressFileInput.click(); // Programmatically click the hidden file input
    });

    // Handle file input change event (when user selects a file)
    compressFileInput.addEventListener('change', (event) => {
        const files = event.target.files;
        if (files.length > 0) {
            selectedFile = files[0]; // Get the first selected file
            displayFilePreviewAndCompressButton(selectedFile);
        }
    });

    // Handle drag and drop events
    compressDropArea.addEventListener('dragover', (event) => {
        event.preventDefault(); // Prevent default to allow drop
        compressDropArea.classList.add('drag-over'); // Add visual feedback
    });

    compressDropArea.addEventListener('dragleave', () => {
        compressDropArea.classList.remove('drag-over'); // Remove visual feedback
    });

    compressDropArea.addEventListener('drop', (event) => {
        event.preventDefault();
        compressDropArea.classList.remove('drag-over');
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            selectedFile = files[0];
            displayFilePreviewAndCompressButton(selectedFile);
        }
    });

    // Function to handle displaying the file and navigating to the preview page
    function displayFilePreviewAndCompressButton(file) {
        // Use FileReader to read the file as a Data URL (base64)
        // This allows us to pass the file content to the next page via sessionStorage.
        // NOTE: For very large files, consider uploading directly to backend here
        // and passing a file ID instead of the full Data URL.
        const reader = new FileReader();
        reader.onload = (e) => {
            // Store file details and its Data URL in sessionStorage
            sessionStorage.setItem('fileToCompress', JSON.stringify({
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: e.target.result // Base64 representation of the file
            }));
            // Redirect to the new preview page
            window.location.href = '/compress-preview.html';
        };
        reader.readAsDataURL(file); // Start reading the file
    }
});