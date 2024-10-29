const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 3000;
const musicFolder = 'uploads';

// Ensure the uploads folder exists
if (!fs.existsSync(musicFolder)) {
    fs.mkdirSync(musicFolder, { recursive: true });
}

app.use(express.json());
app.use('/uploads', express.static(musicFolder));

// Multer setup for file uploads with independent unique identifiers
const storage = multer.diskStorage({
    destination: musicFolder,
    filename: (req, file, cb) => {
        const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// In-memory mapping of music to icons
const musicIconMap = {};

// Endpoint to upload music and icon files
app.post('/api/upload', 
    upload.fields([{ name: 'musicFile' }, { name: 'iconFile' }]), 
    (req, res) => {
        const musicFile = req.files['musicFile'] ? req.files['musicFile'][0] : null;
        const iconFile = req.files['iconFile'] ? req.files['iconFile'][0] : null;

        if (!musicFile || !iconFile) {
            return res.status(400).json({ message: 'Both music and icon files are required.' });
        }

        // Store the association of music file and icon file
        musicIconMap[musicFile.filename] = iconFile.filename;

        // Response includes the URLs for each uploaded file
        res.json({
            message: 'Files uploaded successfully',
            musicFile: musicFile.filename,
            iconFile: iconFile.filename,
            musicUrl: `/uploads/${musicFile.filename}`,
            iconUrl: `/uploads/${iconFile.filename}` // Access icons from the uploads directory
        });
    }
);

// Endpoint to get list of music files with their associated icons
app.get('/api/music', (req, res) => {
    fs.readdir(musicFolder, (err, musicFiles) => {
        if (err) return res.status(500).send('Error loading music files');

        const musicList = musicFiles
            .filter(file => file.endsWith('.mp3') || file.endsWith('.mp4'))
            .map(musicFile => {
                // Find the associated icon for the music file
                const iconFile = musicIconMap[musicFile];
                const iconUrl = iconFile ? `/uploads/${iconFile}` : '/path/to/default-placeholder.png';

                return {
                    id: musicFile,
                    name: musicFile,
                    url: `/uploads/${musicFile}`,
                    iconUrl: iconUrl
                };
            });

        res.json(musicList);
    });
});

// Endpoint to delete a music file
app.delete('/api/delete/:id', (req, res) => {
    const filePath = path.join(musicFolder, req.params.id);
    fs.unlink(filePath, err => {
        if (err) return res.status(500).send('File not found');
        
        // Remove the icon association if the music file is deleted
        delete musicIconMap[req.params.id];
        
        res.json({ message: 'File deleted successfully' });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// Serve static files from the "public" directory
app.use(express.static('public'));

// Serve files in the "uploads" directory
app.use('/uploads', express.static(path.join(__dirname, musicFolder)));
