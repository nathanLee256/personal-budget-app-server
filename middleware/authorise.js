/* In this file we are defining a route-level middleware function which will run only for the /api/update route 
to authenticate a user so they can update the database */
const jwt = require("jsonwebtoken");

module.exports = function (req, res, next){
    const authorization = req.headers.authorization;
    let token = null;

    if (authorization && authorization.split(" ").length == 2)
    {
        token = authorization.split(" ")[1];
        console.log(token);
    }
    else
    {
        console.log("Unauthorised user");
        return;
    }
    try
    {
        const decoded = jwt.verify(token, "secret key");
        if(decoded.exp < Date.now())
        {
            console.log("Token has expired.");
            return;
        }
        next();
    } 
    catch (err)
    {
        console.log("Token is not valid.", err);
    }
};