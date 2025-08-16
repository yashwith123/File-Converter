// public/editor.js
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';

// Set the worker source for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';

// Get DOM elements
const pageThumbnailsContainer = document.getElementById('pageThumbnails');
const pdfEditorCanvas = document.getElementById('pdfEditorCanvas');
const ctx = pdfEditorCanvas.getContext('2d');

const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const annotateBtn = document.getElementById('annotateBtn');
const editBtn = document.getElementById('editBtn');
const addTextBtn = document.getElementById('addTextBtn');
const drawBtn = document.getElementById('drawBtn');
const addImageBtn = document.getElementById('addImageBtn');
const cropBtn = document.getElementById('cropBtn');
const highlightBtn = document.getElementById('highlightBtn');
const downloadEditedPdfBtn = document.getElementById('downloadEditedPdfBtn');

const prevPageBtn = document.getElementById('prevPageBtn');
const nextPageBtn = document.getElementById('nextPageBtn');
const currentPageNumSpan = document.getElementById('currentPageNum');
const totalPagesNumSpan = document.getElementById('totalPagesNum');
const zoomOutBtn = document.getElementById('zoomOutBtn');
const zoomInBtn = document.getElementById('zoomInBtn');
const zoomLevelSpan = document.getElementById('zoomLevel');
const fitToWidthBtn = document.getElementById('fitToWidthBtn');

const thumbnailsLoading = document.getElementById('thumbnailsLoading');
const mainCanvasLoading = document.getElementById('mainCanvasLoading');
const mainCanvasError = document.getElementById('mainCanvasError');

let pdfDoc = null; // Stores the PDF document object
let currentPageNum = 1; // Current page being viewed/edited
let currentZoom = 1.0; // Initial zoom level
const zoomSteps = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0]; // Predefined zoom steps

// --- UI State Management for Loading/Errors ---
function showLoading(element) {
    if (element) element.style.display = 'flex';
}

function hideLoading(element) {
    if (element) element.style.display = 'none';
}

function showError(element, message = '') {
    if (element) {
        element.style.display = 'flex';
        const msgElement = element.querySelector('p');
        if (msgElement) msgElement.textContent = message || 'An error occurred.';
    }
}

function hideError(element) {
    if (element) element.style.display = 'none';
}

// Function to render a specific PDF page onto the main canvas
async function renderPage(pageNum) {
    if (!pdfDoc) {
        console.error("PDF document not loaded.");
        showError(mainCanvasError, 'PDF not loaded.');
        return;
    }

    if (pageNum < 1 || pageNum > pdfDoc.numPages) {
        console.warn(`Attempted to render page ${pageNum} outside range [1, ${pdfDoc.numPages}]`);
        return;
    }

    currentPageNum = pageNum;
    currentPageNumSpan.textContent = pageNum;
    showLoading(mainCanvasLoading);
    hideError(mainCanvasError);

    try {
        const page = await pdfDoc.getPage(pageNum);
        let viewport = page.getViewport({ scale: currentZoom });

        pdfEditorCanvas.height = viewport.height;
        pdfEditorCanvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        await page.render(renderContext).promise;

        document.querySelectorAll('.thumbnail').forEach(thumb => {
            thumb.classList.remove('active');
        });
        const activeThumbnail = document.querySelector(`.thumbnail[data-page-num="${pageNum}"]`);
        if (activeThumbnail) {
            activeThumbnail.classList.add('active');
            activeThumbnail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

    } catch (error) {
        console.error('Error rendering page:', error);
        showError(mainCanvasError, 'Failed to render PDF page.');
    } finally {
        hideLoading(mainCanvasLoading);
    }
}

// *** CRITICAL FIX HERE ***
// Function to render all thumbnails in the sidebar using Promise.all for concurrency
async function renderThumbnails() {
    if (!pdfDoc) return;

    // Clear just the thumbnails, keep the loading message div
    const thumbnailsOnlyContainer = document.createElement('div');
    pageThumbnailsContainer.appendChild(thumbnailsOnlyContainer);
    
    showLoading(thumbnailsLoading);

    const thumbnailPromises = [];

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const promise = pdfDoc.getPage(i).then(page => {
            const viewport = page.getViewport({ scale: 0.2 });

            const thumbnailDiv = document.createElement('div');
            thumbnailDiv.className = `thumbnail ${i === currentPageNum ? 'active' : ''}`;
            thumbnailDiv.dataset.pageNum = i;

            const thumbnailCanvas = document.createElement('canvas');
            thumbnailCanvas.width = viewport.width;
            thumbnailCanvas.height = viewport.height;

            const thumbnailCtx = thumbnailCanvas.getContext('2d');
            const renderContext = {
                canvasContext: thumbnailCtx,
                viewport: viewport
            };

            // This promise will be fulfilled when the render is complete
            return page.render(renderContext).promise.then(() => {
                const pageNumSpan = document.createElement('span');
                pageNumSpan.textContent = i;

                thumbnailDiv.appendChild(thumbnailCanvas);
                thumbnailDiv.appendChild(pageNumSpan);

                thumbnailDiv.addEventListener('click', () => {
                    renderPage(i);
                });

                return thumbnailDiv;
            });
        }).catch(error => {
            console.error(`Error rendering thumbnail for page ${i}:`, error);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'thumbnail error-thumbnail';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle" style="font-size: 2em; color: red;"></i><span>Page ${i} Error</span>`;
            return errorDiv;
        });
        thumbnailPromises.push(promise);
    }

    // Wait for all thumbnail rendering promises to resolve
    const thumbnailElements = await Promise.all(thumbnailPromises);

    // Now append all the elements to the container at once
    thumbnailElements.forEach(element => {
        thumbnailsOnlyContainer.appendChild(element);
    });

    hideLoading(thumbnailsLoading);
}

// Function to load PDF from a URL (e.g., from your server)
async function loadPdf(pdfUrl) {
    if (!pdfjsLib) {
        showError(mainCanvasError, 'PDF.js library not loaded.');
        return;
    }

    showLoading(mainCanvasLoading);
    hideError(mainCanvasError);

    try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        pdfDoc = await loadingTask.promise;

        totalPagesNumSpan.textContent = pdfDoc.numPages;

        await renderThumbnails();
        await renderPage(currentPageNum);

    } catch (error) {
        console.error('Error loading PDF:', error);
        showError(mainCanvasError, 'Failed to load PDF. Please ensure the file exists and is accessible.');
    } finally {
        hideLoading(mainCanvasLoading);
    }
}

// --- Editing Functionality Placeholders ---
function setupEditingTools() {
    // Add event listeners to buttons but note that they are not implemented yet
    undoBtn.addEventListener('click', () => console.log('Undo clicked'));
    redoBtn.addEventListener('click', () => console.log('Redo clicked'));
    annotateBtn.addEventListener('click', () => console.log('Annotate tool activated'));
    editBtn.addEventListener('click', () => console.log('Edit tool activated'));
    addTextBtn.addEventListener('click', () => console.log('Add Text tool activated'));
    drawBtn.addEventListener('click', () => console.log('Draw tool activated'));
    addImageBtn.addEventListener('click', () => console.log('Add Image tool activated'));
    cropBtn.addEventListener('click', () => console.log('Crop tool activated'));
    highlightBtn.addEventListener('click', () => console.log('Highlight tool activated'));
}

downloadEditedPdfBtn.addEventListener('click', async () => {
    alert('Downloading edited PDF requires complex server-side or advanced client-side PDF manipulation library (e.g., pdf-lib) to merge canvas changes back into a PDF. This is a placeholder.');
    console.log('Download Edited PDF clicked');
});

// --- Page Navigation and Zoom Controls ---
prevPageBtn.addEventListener('click', () => {
    if (currentPageNum > 1) {
        renderPage(currentPageNum - 1);
    }
});

nextPageBtn.addEventListener('click', () => {
    if (pdfDoc && currentPageNum < pdfDoc.numPages) {
        renderPage(currentPageNum + 1);
    }
});

zoomInBtn.addEventListener('click', () => {
    const currentIndex = zoomSteps.indexOf(currentZoom);
    if (currentIndex < zoomSteps.length - 1) {
        currentZoom = zoomSteps[currentIndex + 1];
        zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
        renderPage(currentPageNum);
    }
});

zoomOutBtn.addEventListener('click', () => {
    const currentIndex = zoomSteps.indexOf(currentZoom);
    if (currentIndex > 0) {
        currentZoom = zoomSteps[currentIndex - 1];
        zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
        renderPage(currentPageNum);
    }
});

fitToWidthBtn.addEventListener('click', async () => {
    if (!pdfDoc) return;
    try {
        const page = await pdfDoc.getPage(currentPageNum);
        const originalViewport = page.getViewport({ scale: 1 });
        const editorAreaWidth = pdfEditorCanvas.parentElement.clientWidth;
        const desiredWidth = editorAreaWidth - 40;
        currentZoom = desiredWidth / originalViewport.width;
        zoomLevelSpan.textContent = `${Math.round(currentZoom * 100)}%`;
        renderPage(currentPageNum);
    } catch (error) {
        console.error("Error fitting to width:", error);
    }
});

// --- Initial Load Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const fileId = urlParams.get('fileId');

    if (fileId) {
        const pdfUrl = `/download-pdf-for-edit/${fileId}`;
        loadPdf(pdfUrl);
    } else {
        console.error('No fileId found in URL. Cannot load PDF for editing.');
        showError(mainCanvasError, 'No PDF selected. Please go back to the upload page.');
    }

    setupEditingTools();
});
