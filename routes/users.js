var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt'); // edit
const jwt = require("jsonwebtoken"); //edit
const verifyToken = require('../middleware/authorise.js');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

// Define a route for handling POST requests to "/register"
router.post("/register", function (req, res) {
  // Extract email and password from the request body
  const email = req.body.email;
  const password = req.body.password;

  // Check if email or password is missing in the request body
  if (!email || !password) {
    return res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password required."
    });
  }

  // Query the "users" table in the database to check if the user already exists
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);

  // Execute the database query
  queryUsers
    .then((users) => {
      // Check if there are users with the specified email
      if (users.length > 0) {
        console.log("User already exists");
        // Send response indicating that the user already exists
        res.status(400).json({
          error: true,
          message: "User already exists"
        });
        // Return a rejected promise to stop further execution
        return Promise.reject();
      }

      // If no matching users were found, you can proceed with user registration logic here
      console.log("No matching users");
      // You might want to insert the new user into the database at this point.
      const saltRounds = 10;
      const hash = bcrypt.hashSync(password, saltRounds);
      return req.db.from("users").insert({ email, hash });
    })
    .then(() => {
      res.status(201).json({
        success: true,
        message: "User successfully created!"
      });
    })
    .catch((err) => {
      // Only send a response if an error occurred that wasn't due to the user already existing
      if (err) {
        console.error(err);
        res.status(500).json({ error: true, message: "Internal server error" });
      }
    });
});

//second route for HTTP POST requests to /users/login
router.post("/login", function (req, res) {
  // Extract email and password from the request body
  const email = req.body.email;
  const password = req.body.password;

  //check they have been succesfully extracted
  if(!email || !password)
  {
    res.status(400).json({
      error: true,
      message: "Request body incomplete- email and password needed.",
    });
    // Return a rejected promise to stop further execution
    return Promise.reject();
  }
  //construct an SQL query using knex query builder object
  const queryUsers = req.db
    .from("users")
    .select("*")
    .where("email", "=", email);
  
  //execute the query
  queryUsers //SQL query is executed here. async operation
    .then((users) => {    //starts a Promise chain which begins when the SQL query is executed. Users is an array of user objects returned from SQL query
      if(users.length === 0)
      {
        console.log("User does not exist. You are the weakest link. Goodbye.");
        // Return a rejected promise to stop further execution
        return res.status(400).json({
          error: true,
          message: "User does not exist. You are the weakest link. Goodbye.",
        });
      }

      const user = users[0];  //assigns the user object returned from the SQL query to user
      const userId = user.user_id;
      console.log("✅ Found User ID:", userId);

      return bcrypt.compare(password, user.hash).then((match) => {
        if (!match) {
          console.log("Passwords do not match. Consult medical professional.");
          return res.status(400).json({
            error: true,
            message: "Passwords do not match. Consult medical professional.",
          });
        }

        // ✅ Generate and send JWT only if password is correct
        const secretKey = "secret key"; // Use environment variables for security
        const expires_in = 60 * 60 * 24; // 1 day
        const exp = Math.floor(Date.now() / 1000) + expires_in; // Convert to Unix timestamp

        const tokenPayload = {
          id: userId,
          email: email,
          exp: exp
        };

        const token = jwt.sign(tokenPayload, secretKey);
        return res.status(200).json({
          user_id: userId,
          token_type: "Bearer",
          token,
          expires_in,
          message: "Successful login.",
        });
      });
    })
    .catch((error) => {
      console.error("Server error:", error);
      res.status(500).json({ error: true, message: "Internal server error." });
    }); 
});

/* 

  Route 3: Handles POST requests to extend user session.
  1. Extract the current JWT string from the 'Authorization' header 
  2. Verify the token using the server's secret key to ensure it hasn't been tampered with.
  3. Extract the user payload data (e.g., userId) from that verified token.
  4. Generate a brand-new token with a fresh expiration time (e.g., 12m) using that payload data.
  5. Send a JSON response back to the client containing the new token string.

*/
router.post("/refresh_jwt", verifyToken, function (req, res){

  try {
    // Because of the middleware, we know the token is valid.
    // 1-Extract the current JWT string from the 'Authorization' header
    const userPayload = {
        id: req.user.id,
        email: req.user.email
        // Include any other fields you originally encoded into your login token
    };

    // Sign a brand new token with a fresh 24hr expiration window
    const newToken = jwt.sign(userPayload, "secret key", { expiresIn: '24h' }); // change to '24h' after testing

    // Send it right back to the client
    res.json({
        success: true,
        token: newToken
    });

  } catch (error) {
    console.error("Error in refresh_jwt route handler:", error);
    res.status(500).json({ success: false, message: "Server error refreshing token" });
  }

})



// Export the router for use in other parts of the application
module.exports = router;
