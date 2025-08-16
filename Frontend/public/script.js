// C:\xampp\htdocs\filconv\Frontend\public\script.js

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const chooseFileBtn = document.getElementById('chooseFileBtn');
    const uploadArea = document.querySelector('.upload-area');
    const uploadForm = document.getElementById('uploadForm');
    const uploadBox = document.querySelector('.upload-box');
    let selectedFile = null;
    let selectedOutputFormat = null;
    let currentUIState = 'initial';

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function renderUIState(state, downloadUrl = null, newFileName = null) {
        currentUIState = state;
        uploadBox.innerHTML = '';

        if (state === 'initial') {
            const initialUploadArea = document.createElement('div');
            initialUploadArea.className = 'upload-area';
            initialUploadArea.innerHTML = `
                <div class="upload-icon">⬆️</div>
                <p>Drag your file here to upload.</p>
                <div class="divider">OR</div>
                <label class="file-label">
                    <input type="file" id="fileInput" name="file" hidden />
                    <button type="button" class="file-button" id="chooseFileBtn">Choose File</button>
                </label>
                <p id="fileName" class="note">Up to 250MB</p>
            `;
            uploadBox.appendChild(initialUploadArea);
            
            // Re-attach listeners for initial state elements
            const newFileInput = initialUploadArea.querySelector('#fileInput');
            const newChooseFileBtn = initialUploadArea.querySelector('#chooseFileBtn');
            newChooseFileBtn.addEventListener('click', () => newFileInput.click());
            newFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    selectedFile = e.target.files[0];
                    renderUIState('fileSelected');
                } else if (currentUIState !== 'initial') {
                    renderUIState('initial');
                }
            });
            // Re-attach drag-and-drop listeners
            initialUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                initialUploadArea.classList.add('drag-over');
                initialUploadArea.querySelector('#fileName').textContent = 'Drop your file here!';
            });
            initialUploadArea.addEventListener('dragleave', () => {
                initialUploadArea.classList.remove('drag-over');
                initialUploadArea.querySelector('#fileName').textContent = 'Up to 250MB';
            });
            initialUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                initialUploadArea.classList.remove('drag-over');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    newFileInput.files = files;
                    newFileInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            
            selectedFile = null;
            selectedOutputFormat = null;
        } else if (state === 'fileSelected') {
            const fileSizeFormatted = formatBytes(selectedFile.size);
            uploadBox.innerHTML = `
                <div class="conversion-options-state">
                    <div class="selected-file-container">
                        <span class="file-icon">📄</span>
                        <div class="file-info">
                            <span class="file-name">${selectedFile.name}</span>
                            <span class="file-size">(${fileSizeFormatted})</span>
                        </div>
                        <span class="remove-file" title="Remove file">✖</span>
                    </div>
                    <p class="convert-to-text">Convert To</p>
                    <div class="custom-select-wrapper">
                        <div class="selected-format-display" tabindex="0">
                            Select / Search for Format <span class="arrow-icon">▾</span>
                        </div>
                        <div class="format-options-dropdown" style="display: none;"></div>
                    </div>
                    <div class="convert-now-button-container">
                        <button type="button" class="file-button convert-now-button" disabled>Convert Now</button>
                    </div>
                </div>
            `;
            attachEventListenersForFileSelectedState();
            populateFormatOptions();
            updateConvertButtonState();
        } else if (state === 'processing') {
             const fileSizeFormatted = formatBytes(selectedFile.size);
            uploadBox.innerHTML = `
                <div class="uploading-state">
                    <div class="selected-file-container">
                        <span class="file-icon">📄</span>
                        <div class="file-info">
                            <span class="file-name">${selectedFile.name}</span>
                            <span class="file-size">(${fileSizeFormatted})</span>
                        </div>
                    </div>
                    <p class="progress-info">Processing...</p>
                    <div class="loading-spinner"></div>
                    <button type="button" class="file-button uploading-button" disabled>
                        Processing...
                    </button>
                </div>
            `;
        } else if (state === 'conversionSuccess') {
            uploadBox.innerHTML = `
                <div class="success-state">
                    <div class="success-icon">✅</div>
                    <h2>Conversion Successful!</h2>
                    <p>Your file is ready for download.</p>
                    <button type="button" class="file-button download-button" data-download-url="${downloadUrl}">${newFileName}</button>
                    <button type="button" class="file-button convert-another-button">Convert Another File</button>
                </div>
            `;
            attachEventListenersForSuccessState();
        }
    }

    function attachEventListenersForFileSelectedState() {
        const removeFileButton = uploadBox.querySelector('.remove-file');
        const selectedFormatDisplay = uploadBox.querySelector('.selected-format-display');
        const formatOptionsDropdown = uploadBox.querySelector('.format-options-dropdown');
        const convertNowButton = uploadBox.querySelector('.convert-now-button');

        removeFileButton.addEventListener('click', () => renderUIState('initial'));
        selectedFormatDisplay.addEventListener('click', () => {
            formatOptionsDropdown.style.display = formatOptionsDropdown.style.display === 'none' ? 'block' : 'none';
            selectedFormatDisplay.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (currentUIState === 'fileSelected' &&
                !selectedFormatDisplay.contains(e.target) &&
                !formatOptionsDropdown.contains(e.target)) {
                formatOptionsDropdown.style.display = 'none';
                selectedFormatDisplay.classList.remove('active');
            }
        });

        convertNowButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (!selectedFile) {
                alert('Please select a file first!');
                return;
            }
            if (!selectedOutputFormat) {
                alert('Please select an output format!');
                return;
            }
            handleConversion();
        });
    }

    function attachEventListenersForSuccessState() {
        const downloadButton = uploadBox.querySelector('.download-button');
        const convertAnotherButton = uploadBox.querySelector('.convert-another-button');

        downloadButton.addEventListener('click', () => {
             // The server will handle the download, we just need to submit the form
             const formData = new FormData();
             formData.append('file', selectedFile);
             formData.append('outputFormat', selectedOutputFormat);

             fetch(uploadForm.action, {
                 method: 'POST',
                 body: formData,
             })
             .then(response => {
                 if (response.ok) {
                     return response.blob();
                 } else {
                     throw new Error('Conversion failed on the server.');
                 }
             })
             .then(blob => {
                 const url = window.URL.createObjectURL(blob);
                 const a = document.createElement('a');
                 a.style.display = 'none';
                 a.href = url;
                 a.download = downloadButton.textContent.replace('Download ', '');
                 document.body.appendChild(a);
                 a.click();
                 window.URL.revokeObjectURL(url);
             })
             .catch(error => {
                 console.error('Download error:', error);
                 alert('An error occurred during download. Please try again.');
             });
        });

        convertAnotherButton.addEventListener('click', () => renderUIState('initial'));
    }

    const allFormats = {
        Document: ['PDF', 'DOCX', 'TXT', 'RTF', 'ODT', 'XPS'],
        Drawing: ['SVG', 'EPS', 'AI', 'DXF'],
        Ebook: ['EPUB', 'MOBI', 'AZW3', 'FB2'],
        Image: ['JPG', 'PNG', 'WEBP', 'GIF', 'BMP', 'TIFF', 'PPM', 'XPM', 'TGA', 'DDS', 'CUR', 'PBM', 'XBM', 'RGB', 'FAX', 'HDR', 'EXR', 'PAL', 'G4', 'PCD', 'JP2', 'PFM', 'PCX', 'MNG', 'PNM'],
        Video: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM', 'FLV', 'WMV', 'MPEG', 'TS', 'OGV', 'M4V', 'MTS', 'MPG', 'RM', '3GP', 'ASF', 'MXF', 'M2TS', 'M2V', 'HEVC', '3G2', 'F4V', 'RMVB', 'DIVX', 'VOB'],
        Audio: ['MP3', 'WAV', 'OGG', 'FLAC', 'AAC', 'WMA'],
        Archive: ['ZIP', 'RAR', '7Z', 'TAR'],
        Spreadsheet: ['XLSX', 'CSV', 'ODS'],
        Presentation: ['PPTX', 'ODP', 'PPS'],
        CAD: ['DWG', 'DXF', 'STL']
    };

    function populateFormatOptions() {
        const formatOptionsDropdown = uploadBox.querySelector('.format-options-dropdown');
        if (!formatOptionsDropdown) return;

        formatOptionsDropdown.innerHTML = '';
        for (const category in allFormats) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'format-category';
            categoryDiv.innerHTML = `<h3>${category}</h3><div class="format-list"></div>`;
            const formatListDiv = categoryDiv.querySelector('.format-list');

            allFormats[category].forEach(format => {
                const optionSpan = document.createElement('span');
                optionSpan.className = 'format-option';
                optionSpan.textContent = format;
                optionSpan.dataset.format = format.toLowerCase();
                formatListDiv.appendChild(optionSpan);

                optionSpan.addEventListener('click', () => {
                    selectedOutputFormat = optionSpan.dataset.format;
                    const selectedFormatDisplay = uploadBox.querySelector('.selected-format-display');
                    selectedFormatDisplay.textContent = optionSpan.textContent + ' ';
                    const arrowSpan = document.createElement('span');
                    arrowSpan.className = 'arrow-icon';
                    arrowSpan.textContent = '▾';
                    selectedFormatDisplay.appendChild(arrowSpan);
                    formatOptionsDropdown.style.display = 'none';
                    selectedFormatDisplay.classList.remove('active');
                    uploadBox.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('selected'));
                    optionSpan.classList.add('selected');
                    updateConvertButtonState();
                });
            });
            formatOptionsDropdown.appendChild(categoryDiv);
        }
    }

    function updateConvertButtonState() {
        const convertNowButton = uploadBox.querySelector('.convert-now-button');
        if (convertNowButton) {
            convertNowButton.disabled = !(selectedFile && selectedOutputFormat);
        }
    }

    chooseFileBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedFile = e.target.files[0];
            renderUIState('fileSelected');
        } else if (currentUIState !== 'initial') {
            renderUIState('initial');
        }
    });

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (currentUIState === 'initial') {
            uploadArea.classList.add('drag-over');
            const fileNameNote = uploadArea.querySelector('#fileName');
            if (fileNameNote) fileNameNote.textContent = 'Drop your file here!';
        }
    });

    uploadArea.addEventListener('dragleave', () => {
        if (currentUIState === 'initial') {
            uploadArea.classList.remove('drag-over');
            const fileNameNote = uploadArea.querySelector('#fileName');
            if (fileNameNote) fileNameNote.textContent = 'Up to 250MB';
        }
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        if (currentUIState === 'initial') {
            uploadArea.classList.remove('drag-over');
            const fileNameNote = uploadArea.querySelector('#fileName');
            if (fileNameNote) fileNameNote.textContent = 'Up to 250MB';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                fileInput.files = files;
                const changeEvent = new Event('change', { bubbles: true });
                fileInput.dispatchEvent(changeEvent);
            }
        }
    });

    async function handleConversion() {
        renderUIState('processing');
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('outputFormat', selectedOutputFormat);
    
        try {
            const response = await fetch('/upload-convert', {
                method: 'POST',
                body: formData,
            });
    
            if (response.ok) {
                // Get the file name from the Content-Disposition header
                const contentDisposition = response.headers.get('Content-Disposition');
                const filenameMatch = contentDisposition && contentDisposition.match(/filename="(.+)"/);
                const newFileName = filenameMatch ? filenameMatch[1] : `converted-file.${selectedOutputFormat}`;
    
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
    
                // Update the UI state with the new download information
                renderUIState('conversionSuccess', downloadUrl, newFileName);
    
            } else {
                const errorText = await response.text();
                alert(`Conversion failed: ${errorText}`);
                console.error('Conversion error:', errorText);
                renderUIState('initial');
            }
        } catch (error) {
            console.error('Network or unexpected error during conversion:', error);
            alert('An error occurred during conversion. Please try again.');
            renderUIState('initial');
        }
    }
    
    renderUIState('initial');
});

// Login/Signup Modal and form submission logic
document.querySelector('.login').addEventListener('click', function() {
    document.getElementById('loginModal').style.display = 'block';
});
document.querySelector('.signup').addEventListener('click', function() {
    document.getElementById('signupModal').style.display = 'block';
});
document.querySelectorAll('.close-button').forEach(function(btn) {
    btn.addEventListener('click', function() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('signupModal').style.display = 'none';
    });
});
document.getElementById('switchToSignup').addEventListener('click', function() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('signupModal').style.display = 'block';
});
document.getElementById('switchToLogin').addEventListener('click', function() {
    document.getElementById('signupModal').style.display = 'none';
    document.getElementById('loginModal').style.display = 'block';
});
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('signupModal').style.display = 'none';
    }
};
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const response = await fetch('/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`
    });
    if (response.redirected) {
        window.location.href = response.url;
    } else {
        const text = await response.text();
        alert(text);
    }
});