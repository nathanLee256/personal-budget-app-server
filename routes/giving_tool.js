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

        //extract query strings (with case sensitivity disabled)
        const userId = req.query.UserId || req.query.userId;
        const selectedYear = req.query.Year || req.query.year;

        //early exit return if query parameters are not as expected in the client-side GET request
        if (!userId || !selectedYear) {
            return res.status(400).json({ error: "Missing required query parameters: UserId and Year" });
        }


        //prepare a payload object
        const payloadObj = {
            IsData: null,
            userGifts: []  //data objects will be stored in this prop
        };

        /* 
            General knex syntax for the following query:

            SELECT * FROM table_name WHERE column1 = value1 AND column2 = value2;

            knex('table_name')
                .where('column1', value1)
                .andWhere('column2', value2)
        
        */

        //construct and execute the SQL query using knex
        req.db
            .from('gift_items')
            .select(
                "gift_type as giftType",
                "organisation_id as organisation",
                "amount",
                "date",
                "description",
                "receipt_url as receipt",
                "is_tax_deductable as dgr"
            )
            .where('user_id', userId)
            .andWhereRaw('YEAR(`date`) = ?', [selectedYear])

            //set up the Promise chain
            /* this query should return an array of data objects (gifts) in the form above*/
            .then((gifts) => {
                payloadObj.userGifts = gifts;
                payloadObj.IsData = gifts.length > 0; // dynamically assign IsData value (based on the length of userGifts[])
                return res.json(payloadObj);
                
            })
            .catch((error) => {
                console.error("❌ Database error:", error.message, "\n", error.stack);
                res.status(500).json({ error: "Internal server error", details: error.message });
            });

        


    });

//END ROUTE 1

//START ROUTE 2

    /* 
        route for handling GET requests from the useEffect in GivingTool.js which runs when the page renders, and requests
        an object in the following form which contains an array of DGR organisations
        data = {
            "IsData": true,
            "Organisations" : [
                {"entityName": "Salvation Army", "abn": 1234567, "orgId": 1},
                {"entityName": "Red Cross", "abn": 2345678, "orgId": 2}
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
                "organisation_abn as abn",
                "organisation_id as orgId"
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

//START ROUTE 3

    /* 
        this route handles POST requests from the handleSubmit() function in GivingTool.js. It receives the userSelections
        state object (i.e. a newGift object) which is stored in the NewGift property of the payload (req.body). Then it 
        updates the gift_items table by inserting the new gift object into table. Then it selects all data objects (gifts)
        from the updated table, and sends them back to the client (which uses them to update the userGifts state). 

        //payload obj structure
        const payload = {
            UserId: userId,
            NewGift: {
                giftType: "offering",
                organisation: {organisation},
                amount: 50,
                date:"2025-06-27",    
                description: "Red shield appeal",
                receipt: "/uploads/receipts/myfile.pdf"
            }
        };
    */
    router.post("/update_gift_items", (req, res) => {

        //extract the userId and newGift
        const { UserId, NewGift } = req.body;

        //construct the following db query using knex query builder

        /* 
            INSERT INTO gift_items(user_id, gift_type, organisation_id, amount, date, description, receipt_url)
            VALUES(UserId, NewGift.giftType, NewGift.organisation.orgId, NewGift.amount, NewGift.date, NewGift.description, NewGift.receipt.name );
        */


        
    });


//END ROUTE 3


// Export the router for use in other parts of the application
module.exports = router;