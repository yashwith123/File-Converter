// C:\xampp\htdocs\filconv\backend\server.js

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const convertFile = require('./convert');
const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();

const setupFrontendRoutes = require('../Frontend/server.js');
setupFrontendRoutes(app);

// At the top of authui
const bootId = Date.now(); // Unique for each server start

// Route to send bootId
app.get("/boot-id", (req, res) => {
    res.json({ bootId });
});

// ✅ NEW: Create the directories if they don't exist
const downloadsDir = path.join(__dirname, 'downloads');
const uploadsDir = path.join(__dirname, 'uploads');
[downloadsDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Define the custom storage configuration
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        const originalExtension = path.extname(file.originalname);
        const originalNameWithoutExt = path.parse(file.originalname).name;
        // This ensures the saved file has its original extension.
        cb(null, `${originalNameWithoutExt}-${Date.now()}${originalExtension}`);
    }
});

// Create the multer middleware using your custom storage
const upload = multer({ storage: storage });

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'Frontend', 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'Frontend', 'public', 'index.html'));
});

// The core endpoint that your frontend calls
app.post('/upload-convert', upload.single('file'), async (req, res) => {
    if (!req.file || !req.body.outputFormat) {
        return res.status(400).send('No file uploaded or output format selected.');
    }

    const outputFormat = req.body.outputFormat;
    const inputPath = req.file.path; // The full path now includes the correct extension
    const originalFileName = req.file.originalname;
    const originalFileExtension = path.extname(originalFileName);

    console.log(`[DEBUG] Original file name: ${originalFileName}`);
    console.log(`[DEBUG] Original file extension: ${originalFileExtension}`);
    console.log(`[DEBUG] Desired output format: ${outputFormat}`);

    const outputFileName = `${path.basename(originalFileName, originalFileExtension)}.${outputFormat}`;
    const outputPath = path.join(__dirname, 'downloads', outputFileName);

    try {
        const fileUrl = await convertFile(inputPath, outputFormat);
        const response = await fetch(fileUrl);

        // Fix the deprecated buffer() method
        const buffer = await response.arrayBuffer();
        fs.writeFileSync(outputPath, Buffer.from(buffer)); // Use Buffer.from() to write the array buffer

        res.download(outputPath, outputFileName, (err) => {
            if (err) {
                console.error('Error sending file:', err);
            }
            fs.unlink(inputPath, (err) => {
                if (err) console.error('Error deleting uploaded file:', err);
            });
            fs.unlink(outputPath, (err) => {
                if (err) console.error('Error deleting converted file:', err);
            });
        });
    } catch (error) {
        console.error('Conversion failed:', error);
        fs.unlink(inputPath, (err) => {
            if (err) console.error('Error deleting uploaded file after conversion failure:', err);
        });
        res.status(500).json({ error: 'Conversion failed', message: error.message });
    }
});

// Signup and Login routes remain the same
app.post('/signup', (req, res) => {
    const { username, email, password } = req.body;
    const hashed = bcrypt.hashSync(password, 10);
    const sql = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
    db.query(sql, [username, email, hashed], (err, result) => {
        if (err) return res.status(500).send('Signup failed');
        res.redirect(`/register-success.html?username=${username}`);
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return res.status(500).send('Server error');
        if (results.length === 0) return res.status(401).send('No user found');
        const user = results[0];
        const valid = bcrypt.compareSync(password, user.password);
        if (!valid) return res.status(401).send('Invalid password');
        res.redirect(`/index.html?username=${user.username}`);
    });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
