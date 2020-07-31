//Treehouse Techdegree Project 9
//Code adapted from Treehouse REST API example projects
'use strict';

const { sequelize, models } = require('./db');

const { User, Course } = models;
const express = require('express');
const { check, validationResult } = require('express-validator');


const path = require('path');
const bcrypt = require('bcryptjs');
const auth = require('basic-auth');


// Construct a router instance.
const router = express.Router();


/* Handler function to wrap each route. */
function asyncHandler(cb){
  return async(req, res, next) => {
    try {
      await cb(req, res, next)
    } catch(error){
      res.status(500).send(error);
    }
  }
}




/**Adapted from Treehouse REST API Authentication with Express Example Project
 * Middleware to authenticate the request using Basic Authentication. (Adapted from )
 * @param {Request} req - The Express Request object.
 * @param {Response} res - The Express Response object.
 * @param {Function} next - The function to call to pass execution to the next middleware.
 */
const authenticateUser = async (req, res, next) => {
  let message = null;

  // Get the user's credentials from the Authorization header.
  const credentials = auth(req);

  if (credentials) {
    // Look for a user whose `username` matches the credentials `name` property.
    const user = await User.findOne({
      where: {
        emailAddress: credentials.name
      }
    });
    

    if (user) {
      const authenticated = bcrypt
        .compareSync(credentials.pass, user.password);
      if (authenticated) {
        console.log(`Authentication successful for username: ${user.username}`);

        // Store the user on the Request object.
        req.currentUser = user;
      } else {
        message = `Authentication failure for username: ${user.username}`;
      }
    } else {
      message = `User not found for username: ${credentials.name}`;
    }
  } else {
    message = 'Auth header not found';
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: 'Access Denied' });
  } else {
    next();
  }
};


// Returns the currently authenticated user.
router.get('/users', authenticateUser, (req, res) => {
  const user = req.currentUser;

  res.json({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    emailAddress: user.emailAddress
  });
});

// Route that creates a new user.
router.post('/users', [
  check('firstName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "firstName"'),
  check('lastName')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "lastName"'),
  check('emailAddress')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "emailAddress"')
    .isEmail()
    .withMessage('Please provide a valid email address for "emailAddress"'),
  check('password')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "password"')
    .isLength({ min: 8, max: 20 })
    .withMessage('Please provide a value for "password" that is between 8 and 20 characters in length')
], asyncHandler(async(req, res) => {
  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  const errorMessages = errors.array().map(error => error.msg);

  let userEmailMatch = null;

  try{
        userEmailMatch = await User.findOne({where: {emailAddress: req.body.emailAddress}});
      }
  catch{}

  if (userEmailMatch !== null)
  {
    errorMessages.push('Email address is already in use.');

  }
  
  // If there are validation errors...
    if (errorMessages.length > 0) {

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });
  } else {


    var salt = bcrypt.genSaltSync(10);
    var hash = bcrypt.hashSync(req.body.password, salt);

    
        await User.create({
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          emailAddress: req.body.emailAddress,
          password: hash
        });
    
    
    res.location('/');

    // Set the status to 201 Created and end the response.
    res.status(201).end();
    
  }
}));




//returns a list of courses
router.get('/courses', asyncHandler(async (req, res) => {
  
  const courses = await Course.findAll({ attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId'], order: [["createdAt", "DESC"]] });

  const coursesJSON = JSON.parse(JSON.stringify(courses));

  const coursesWithUser = await Promise.all(coursesJSON.map(async(course) => {
    
    const courseUser = await User.findByPk(course.userId);

    let courseUserString = "";

    if (courseUser === null)
    {
      courseUserString = "(Instructor Information Not Available)";
    }
    else
    {
      courseUserString = courseUser.firstName + " " + courseUser.lastName;
    }

    course.user = courseUserString;

    return course;
  
  }));

  res.json(coursesWithUser);
  
}));




//returns the course for the provided id
router.get('/courses/:id', asyncHandler(async (req, res) => {
  
  const course = await Course.findByPk(req.params.id, { attributes: ['id', 'title', 'description', 'estimatedTime', 'materialsNeeded', 'userId']});

  if(course === null)
  {
    res.status(400).json({ error: "No course exists with the given ID." });
  }
  else
  {
    const courseUser = await User.findByPk(course.userId);

    const courseJSON = course.toJSON();

    let courseUserString;

    if (courseUser === null)
    {
      courseUserString = "(Instructor Information Not Available)";
      
    }
    else
    {
      courseUserString = courseUser.firstName + " " + courseUser.lastName;
    }

    courseJSON.user = courseUserString;

    res.json(courseJSON);
  }
}));


//posts a new course and returns no content
router.post('/courses', authenticateUser, [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"')
  
], asyncHandler(async(req, res) => {
  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  // If there are validation errors...
  if (!errors.isEmpty()) {

    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });
  } else {

  
    const course = await Course.create(req.body);

    const id = course.id;

    res.location('/api/courses/' + id.toString());

    // Set the status to 201 Created and end the response.
    res.status(201).end();
    
    
  }
}));


//Updates a course and returns no content
router.put('/courses/:id', [
  check('title')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "title"'),
  check('description')
    .exists({ checkNull: true, checkFalsy: true })
    .withMessage('Please provide a value for "description"')
  
], authenticateUser, asyncHandler(async(req, res) => {
 
  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  const user = req.currentUser;

  const course = await Course.findByPk(req.params.id);

  if (course.userId != user.id)
  {
    
    res.status(403).json({
      message: "The current user is not permitted to delete this course. Users may only modify or delete courses for which they are listed as the instructor.",
    });
  }

  // If there are validation errors...
  else if (!errors.isEmpty()) {

    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });
  } else {
    
    await Course.update({
      title: req.body.title,
      description: req.body.description,
      estimatedTime: req.body.estimatedTime,
      materialsNeeded: req.body.materialsNeeded,
      userId: req.body.userId
    }, 
    {
      where: {id: req.params.id}
    });

    // Set the status to 201 Created and end the response.
    res.status(204).end();
  }

  
}));


//Deletes a course and returns no content
router.delete('/courses/:id', authenticateUser, asyncHandler(async(req, res) => {

  // Attempt to get the validation result from the Request object.
  const errors = validationResult(req);

  const user = req.currentUser;

  const course = await Course.findByPk(req.params.id);

  if (course.userId != user.id)
  {
    
    res.status(403).json({
      message: "The current user is not permitted to delete this course. Users may only modify or delete courses for which they are listed as the instructor.",
   
    });
   
  }

  // If there are validation errors...
  else if (!errors.isEmpty()) {

    // Use the Array `map()` method to get a list of error messages.
    const errorMessages = errors.array().map(error => error.msg);

    // Return the validation errors to the client.
    res.status(400).json({ errors: errorMessages });
  } else {
   
    await Course.destroy(
    {
      where: {id: req.params.id}
    });

    // Set the status to 201 Created and end the response.
    res.status(204).end();
  }
}));

module.exports = router;
