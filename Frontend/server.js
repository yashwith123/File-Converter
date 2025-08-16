// C:\xampp\htdocs\filconv\Frontend\server.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const { Document, Packer, Paragraph, ImageRun } = require('docx');

const compressRoutes = require('./routes/compressRoutes');
const splitRoutes = require('./routes/splitRoutes');

const uploadDir = path.join(__dirname, 'uploads');
const compressedDir = path.join(__dirname, 'compressed');
const downloadsDir = path.join(__dirname, 'downloads');
const editorUploadsDir = path.join(__dirname, 'uploads', 'pdfs_for_edit');

[uploadDir, compressedDir, downloadsDir, editorUploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storageConfigs = {
    singleFile: multer.diskStorage({
        destination: 'uploads/',
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s/g, '_'))
    }),
    mergeFile: multer.memoryStorage(),
    editorPdf: multer.diskStorage({
        destination: editorUploadsDir,
        filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
    })
};

const uploadMiddlewares = {
    single: multer({ storage: storageConfigs.singleFile }),
    multiple: multer({ storage: storageConfigs.mergeFile }),
    editor: multer({
        storage: storageConfigs.editorPdf,
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/pdf') cb(null, true);
            else {
                req.fileValidationError = 'Only PDF files are allowed for editing!';
                cb(null, false);
            }
        },
        limits: { fileSize: 50 * 1024 * 1024 }
    })
};

// ✅ This is the main function you need
function setupFrontendRoutes(app) {
    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // Basic page routes
    app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
    app.get('/compress.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'compress.html')));
    app.get('/compress-preview.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'compress-preview.html')));
    app.get('/compress-download.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'compress-download.html')));
    app.get('/edit.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'edit.html')));
    app.get('/editor.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'editor.html')));
    app.get('/merge.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'merge.html')));

    // API Routes
    app.use('/api', compressRoutes);
    app.use('/api', splitRoutes);

    // Download endpoints
    app.get('/download/compressed/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(compressedDir, filename);
        handleFileDownload(res, filePath, filename);
    });

    app.get('/download/split/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(__dirname, 'split', filename);
        handleFileDownload(res, filePath, filename);
    });

    app.get('/downloads/:filename', (req, res) => {
        const filename = req.params.filename;
        const filePath = path.join(downloadsDir, filename);
        handleFileDownload(res, filePath, filename);
    });

    app.get('/download-pdf-for-edit/:fileId', (req, res) => {
        const fileId = req.params.fileId;
        const filePath = path.join(editorUploadsDir, fileId);
        if (fs.existsSync(filePath)) res.sendFile(filePath);
        else res.status(404).send('File not found for editing.');
    });

    // File processing routes
    app.post('/api/convert', uploadMiddlewares.single.single('file'), async (req, res) => {
        if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

        const inputFile = req.file;
        const outputFormat = req.body.outputFormat;
        const originalFileNameWithoutExt = path.parse(inputFile.originalname).name;
        const outputFileName = `${originalFileNameWithoutExt}.${outputFormat}`;

        const formData = new FormData();
        formData.append('file', fs.createReadStream(inputFile.path));
        formData.append('outputFormat', outputFormat);

        try {
            console.log(`[LOG] Sending conversion request to backend for ${inputFile.originalname}`);
            const backendResponse = await fetch('http://localhost:3000/api/convert', { // Ensure this URL is correct for your backend server
                method: 'POST',
                body: formData
            });

            if (!backendResponse.ok) {
                const errorData = await backendResponse.json();
                fs.unlink(inputFile.path, err => err && console.error(`Error deleting temp file:`, err)); // Clean up temp file on error
                return res.status(backendResponse.status).json(errorData);
            }

            const responseData = await backendResponse.json();
            fs.unlink(inputFile.path, err => err && console.error(`Error deleting temp file:`, err));

            res.json({
                success: true,
                downloadUrl: responseData.downloadUrl,
                originalFileName: inputFile.originalname
            });

        } catch (error) {
            console.error('Conversion error:', error);
            fs.unlink(inputFile.path, err => err && console.error(`Error deleting temp file:`, err)); // Clean up temp file on error
            res.status(500).json({ message: 'File conversion failed.', error: error.message });
        }
    });


    app.post('/merge-files', uploadMiddlewares.multiple.array('filesToMerge'), async (req, res) => {
        if (!req.files || req.files.length < 2) return res.status(400).json({ message: 'Please upload at least two files to merge.' });

        try {
            const mergedPdf = await PDFDocument.create();
            for (const file of req.files) {
                if (file.mimetype !== 'application/pdf') return res.status(400).json({ message: `Only PDFs are supported for merging.` });
                const pdfDoc = await PDFDocument.load(file.buffer);
                const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
                copiedPages.forEach(page => mergedPdf.addPage(page));
            }

            const mergedPdfBytes = await mergedPdf.save();
            const mergedFileName = `merged_document_${Date.now()}.pdf`;
            const outputFilePath = path.join(downloadsDir, mergedFileName);
            await fs.promises.writeFile(outputFilePath, mergedPdfBytes);
            res.json({ success: true, downloadUrl: `/downloads/${mergedFileName}`, fileName: mergedFileName });
        } catch (error) {
            console.error('Merge error:', error);
            res.status(500).json({ message: 'File merge failed.', error: error.message });
        }
    });

    app.post('/upload-for-edit', uploadMiddlewares.editor.single('pdfFile'), (req, res) => {
        if (req.file) res.json({ message: 'PDF uploaded successfully!', fileId: req.file.filename });
        else res.status(400).json({ message: req.fileValidationError || 'No PDF file uploaded.' });
    });

    // General error handling
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something broke!');
    });

    // File download helper
    function handleFileDownload(res, filePath, filename) {
        if (fs.existsSync(filePath)) {
            res.download(filePath, filename, (err) => {
                if (err) console.error(`Download error for ${filename}:`, err);
                else {
                    console.log(`File ${filename} downloaded.`);
                    fs.unlink(filePath, (unlinkErr) => unlinkErr && console.error(`Delete error: ${unlinkErr}`));
                }
            });
        } else res.status(404).send('File not found.');
    }
}

// Export the function
module.exports = setupFrontendRoutes;
