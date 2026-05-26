const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const patientRoutes = require('./src/PatientRoutes/index');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// API Routes - THIS MUST COME BEFORE static files
app.use('/api/patients', patientRoutes);

// Serve static files from Patient-managment folder
app.use(express.static(path.join(__dirname, 'Patient-managment')));

// Handle all other routes - send to index.html for client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'Patient-managment', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API endpoints available at http://localhost:${PORT}/api/patients`);
    console.log(`Frontend available at http://localhost:${PORT}`);
});