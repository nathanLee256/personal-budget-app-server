/* 
    Dedicated middleware function which will be run when (before) the /users/login and 
    users/refresh_jwt route handlers run. Its job is to intercept incoming requests, 
    extract the token from the header, and check if it is authentic. 
    If the token is valid, it calls next(), which passes control along to your actual route logic.

*/
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const authorization = req.headers.authorization;
    let token = null;

    if (authorization && authorization.split(" ").length === 2) {
        token = authorization.split(" ")[1];
    } else {
        console.log("Unauthorized user: Missing token format");
        // 💥 FIX: Send an HTTP 401 status to the frontend
        return res.status(401).json({ success: false, message: "Unauthorized access" });
    }

    try {
        // Verify the token and decode its payload
        const decoded = jwt.verify(token, "secret key");
        
        // 💥 FIX: jsonwebtoken's verify() already checks expiration automatically. 
        // If it was expired, it would have already jumped straight to the catch block!
        
        // Attach the decoded user data to the request object so your routes can use it
        req.user = decoded; 
        
        next(); // Move on to your route handler
    } catch (err) {
        console.log("Token is not valid or expired.", err);
        // 💥 FIX: Send an HTTP 401 status to the frontend
        return res.status(401).json({ success: false, message: "Token is not valid or expired" });
    }
};