//Treehouse Techdegree Project 9
//Code adapted from Treehouse REST API example projects

'use strict';

const { sequelize } = require('./db');


const express = require('express');
const routes = require('./routes.js');


// Create the Express app.
const app = express();

// Setup request body JSON parsing.
app.use(express.json());



console.log('Testing the connection to the database...');

(async () => {
  try {

    // Test the connection to the database
    console.log('Connection to the database successful!');
    await sequelize.authenticate();

  } catch(error) {
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      console.error('Validation errors: ', errors);
    } else {
      throw error;
    }
  }
})();



// Add routes.
app.use('/api', routes);


// Send 404 if no other route matched.
app.use((req, res) => {
  res.status(404).json({
    message: 'Route Not Found',
  });
});

// Setup a global error handler.
app.use((err, req, res, next) => {
  console.error(`Global error handler: ${JSON.stringify(err.stack)}`);

  res.status(500).json({
    message: err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err,
  });
});

// Set our port.
app.set('port', process.env.PORT || 5000);

// Start listening on port.
const server = app.listen(app.get('port'), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});


