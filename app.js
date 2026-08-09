require('dotenv').config();  
const logger = require("./utils/logger");                             

const express = require('express');                        

// Route files
const authRoutes = require('./routes/auth');   
const commentRoutes = require('./routes/comments');  
const orderRoutes = require('./routes/orders');              
const reviewRoutes = require('./routes/reviews');
const userRoutes = require('./routes/users');

// Middleware
const errorHandler = require('./middleware/errorHandler');         

const app = express(); 

// Parse incoming JSON request bodies.
app.use(express.json());

// express.urlencoded() reads URL-encoded data from the incoming request,
// parses it, and assigns the resulting JavaScript object to req.body.
// extended: true allows more complex nested form data.
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public folder.
app.use(express.static('public'));

// -------------------- API ROUTES --------------------

// Authentication routes
app.use('/api/auth', authRoutes);

// Comment routes
app.use('/api/comments', commentRoutes);

// Order routes
app.use('/api/orders', orderRoutes);

// Review routes
app.use('/api/reviews', reviewRoutes);

// User routes
app.use('/api/users', userRoutes);

// -------------------- HEALTH CHECK --------------------

// Confirm that the API is running.
app.get('/api/health', function (req, res) {
  res.json({ 
    status: 'ok' 
  });
});

// -------------------- 404 HANDLER --------------------

// Handle requests that do not match an existing route.
// Detects an unmatched route and creates a 404 error.
app.use(function (req, res, next) {
  if (req.originalUrl.startsWith("/.well-known/")) {
    return res.sendStatus(404);
  }

  logger.info(`UNMATCHED REQUEST: ${req.method} ${req.originalUrl}`);

  const err = new Error("Route not found");
  err.status = 404;

  // Forward the error to the centralized error handler.
  next(err);
});

// -------------------- ERROR HANDLER --------------------

// Register the errorHandler function to the middleware chain.
app.use(errorHandler);

module.exports = app;
