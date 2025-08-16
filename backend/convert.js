// C:\xampp\htdocs\filconv\backend\convert.js

const CloudConvert = require('cloudconvert');
const fs = require('fs');
const path = require('path');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();

const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

function isOfficeDocument(filePath) {
    const fileExtension = path.extname(filePath).toLowerCase();
    const officeExtensions = ['.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.odt', '.ods', '.odp', '.rtf', '.csv', '.txt'];
    return officeExtensions.includes(fileExtension);
}

async function convertFile(inputPath, outputFormat) {
    if (!process.env.CLOUDCONVERT_API_KEY) {
        throw new Error('Missing CloudConvert API Key in .env');
    }

    console.log(`[LOG] Attempting CloudConvert conversion: file from ${inputPath} to ${outputFormat}`);

    try {
        const fileExtension = path.extname(inputPath).slice(1);
        console.log(`[DEBUG] Detected input format: ${fileExtension}`);

        const job = await cloudConvert.jobs.create({
            tasks: {
                'import-my-file': {
                    operation: 'import/upload'
                },
                'convert-my-file': {
                    operation: 'convert',
                    input: 'import-my-file',
                    // The API automatically detects the input format from the file upload.
                    // We've removed the explicit 'input_format' to avoid conflicts.
                    output_format: outputFormat,
                    ...(isOfficeDocument(inputPath) && { engine: 'office' })
                },
                'export-my-file': {
                    operation: 'export/url',
                    input: 'convert-my-file'
                }
            }
        });

        const uploadTask = job.tasks.find(task => task.name === 'import-my-file');
        const fileStream = fs.createReadStream(inputPath);
        await cloudConvert.tasks.upload(uploadTask, fileStream);

        const completedJob = await cloudConvert.jobs.wait(job.id);
        const exportTask = completedJob.tasks.find(task => task.name === 'export-my-file');

        if (!exportTask || !exportTask.result || !exportTask.result.files || exportTask.result.files.length === 0) {
            throw new Error('Conversion failed: No output file was generated.');
        }

        const fileUrl = exportTask.result.files[0].url;
        console.log('✅ Conversion successful. Download URL:', fileUrl);
        return fileUrl;

    } catch (error) {
        console.error('CloudConvert API Error:', error.message);
        throw new Error(`Conversion failed: ${error.message}`);
    }
}

module.exports = convertFile;
