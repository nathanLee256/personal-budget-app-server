var express = require('express');
var router = express.Router();

/* This file contains all server routes which handle requests from the GivingTool.js page in the client */

//START ROUTE 1

    /* 
        server route for handling GET requests from the GivingTool.js page. On this page, the request occurs whenever the user toggles
        a folder tab and when this occurs, the userId and selectedYear values are sent in the url. This route will recive the url params
        and use them to construct a SQL query to the database which SELECTS all rows in the gift_items table WHERE user_id == UserId
        AND date == selectedYear. The returned rows then need to be parse into an object in the form below, and the gift object is sent 
        back to the client.

        Example Gift Record:
            {
            type: "One-off",
            organisation: "Salvation Army",
            amount: 50,
            date: "23/05/2025",
            description: "Red shield appeal",
            receipt: "{url_path}"
            }
    */
    router.get("/retrieve_gift_items", (req, res) => {
        //extract query strings
        const userId = req.query.UserId; 
        const year = req.query.Year;
        


    });

//END ROUTE 1

//START ROUTE 2

    /* 
        route for handling GET requests from the useEffect in GivingTool.js which runs when the page renders, and requests
        an object in the following form which contains an array of DGR organisations
        data = {
            "IsData": true,
            "Organisations" : [
                {"entityName": "Salvation Army", "abn": 1234567},
                {"entityName": "Red Cross", "abn": 2345678}
            ]
        }
     */
    router.get("/retrieve_orgs", (req, res) => {
        //prepare payload object
        const payloadObj = {
            IsData: true,
            Organisations: []
        };

        //construct and execute the SQL query
        req.db
            .from("organisations")
            .select(
                "entity_name as entityName",
                "organisation_abn as abn"
            ) //select 2 columns and map them here to their respective properties in the payloadObj object
            /* NB: This will give us exactly the structure our frontend expects, so no mapping required in the frontend */


            /* this query should return an array of data objects (items) in the form above */
            .then((items) => {
                payloadObj.Organisations = items;
                return res.json(payloadObj);
                
            })
            .catch((error) => {
                console.error("❌ Database error:", error.message, "\n", error.stack);
                res.status(500).json({ error: "Internal server error", details: error.message });
            });
    });


//END ROUTE 2


// Export the router for use in other parts of the application
module.exports = router;