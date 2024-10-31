const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv/config');
const cors = require('cors');

// Middleware for CORS and body parsing
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Async middleware to dynamically import chalk for colored logs
const loggingMiddleware = async (req, res, next) => {
    const { default: chalk } = await import('chalk');

    const colorizeMethod = (method) => {
        switch (method.trim()) {  // Ensuring method is 6 characters
            case 'GET': return chalk.blue(method);
            case 'POST': return chalk.green(method);
            case 'PUT': return chalk.yellow(method);
            case 'DELETE': return chalk.red(method);
            default: return method;
        }
    };

    const colorizeStatusCode = (statusCode) => {
        if (statusCode >= 200 && statusCode < 300) {
            return chalk.green(statusCode); // Successful responses
        } else if (statusCode >= 300 && statusCode < 400) {
            return chalk.yellow(statusCode); // Redirects
        } else {
            return chalk.red(statusCode); // Errors
        }
    };

    const statusMeaning = (statusCode) => {
        switch (statusCode) {
            case 200: return "OK"; // The request has succeeded.
            case 201: return "Created"; // The request has been fulfilled and has resulted in the creation of a new resource.
            case 204: return "No Content"; // The server has successfully processed the request, but is not returning any content.
            case 400: return "Bad Request"; // The server cannot process the request due to a client error (e.g., malformed request syntax).
            case 401: return "Unauthorized"; // The request requires user authentication.
            case 403: return "Forbidden"; // The server understands the request but refuses to authorize it.
            case 404: return "Not Found"; // The server can't find the requested resource.
            case 409: return "Conflict"; // The request could not be completed due to a conflict with the current state of the resource.
            case 500: return "Internal Server Error"; // The server encountered an unexpected condition that prevented it from fulfilling the request.
            case 503: return "Service Unavailable"; // The server is not ready to handle the request, typically due to temporary overloading or maintenance of the server.
            default: return "Unknown Status"; // Fallback for any undefined status codes.
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
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});