const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv/config');
const cors = require('cors');

// Middleware for CORS and body parsing
const app = express();
app.use(cors({
    origin: '*', // Adjust this to allow only specific origins if needed
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed methods
}));
app.use(bodyParser.json());

// Async middleware to dynamically import chalk for colored logs
const loggingMiddleware = async (req, res, next) => {
    const { default: chalk } = await import('chalk');

    const colorizeMethod = (method) => {
        switch (method.trim()) {
            case 'GET': return chalk.blue(method);
            case 'POST': return chalk.green(method);
            case 'PUT': return chalk.yellow(method);
            case 'DELETE': return chalk.red(method);
            default: return method;
        }
    };

    const colorizeStatusCode = (statusCode) => {
        if (statusCode >= 200 && statusCode < 300) {
            return chalk.green(statusCode);
        } else if (statusCode >= 300 && statusCode < 400) {
            return chalk.yellow(statusCode);
        } else {
            return chalk.red(statusCode);
        }
    };

    const statusMeaning = (statusCode) => {
        switch (statusCode) {
            case 200: return "OK";
            case 201: return "Created";
            case 204: return "No Content";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 409: return "Conflict";
            case 500: return "Internal Server Error";
            case 503: return "Service Unavailable";
            default: return "Unknown Status";
        }
    };

    res.on('finish', () => {
        const logInfo = `${colorizeMethod(req.method)} ${req.originalUrl} - Status: ${colorizeStatusCode(res.statusCode)} (${statusMeaning(res.statusCode)})`;
        
        // Log errors only if they exist
        if (res.statusCode >= 400) {
            console.error(logInfo);
        } else {
            console.log(logInfo);
        }
    });
    next();
};

// Apply logging middleware
app.use(loggingMiddleware);

// Import and use routes
const authRoute = require("./routes/auth");
app.use('/api/user', authRoute);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

// Connect to MongoDB
async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }
}
main();

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
