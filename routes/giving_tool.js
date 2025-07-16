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
            .join("organisations", "gift_items.organisation_id", "organisations.organisation_id")
            .select(
                "id as id",
                "gift_type as giftType",
                "organisations.entity_name as organisation",
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
    router.post("/update_gift_items", async (req, res) => {

        //extract the userId and newGift
        const { UserId, NewGift } = req.body;

        // next we need to perform 2 successive db queries using knex query builder. We'll use a nested try/catch implementation
        try{
            try{
                /* 
                    Q1: insert new values into gift_items
                    INSERT INTO gift_items(user_id, gift_type, organisation_id, amount, date, description, receipt_url)
                    VALUES(UserId, NewGift.giftType, NewGift.organisation.orgId, NewGift.amount, NewGift.date, NewGift.description, NewGift.receipt.name );
                */
                 await req.db
                    .from("gift_items") //table
                    .insert({
                        user_id: UserId,                                // required value: userId of the giver
                        gift_type: NewGift.giftType,                    // required: type of gift (e.g., donation, item, etc.)
                        organisation_id: NewGift.organisation.orgId,    // optional: organisation ID (can be null if not provided)
                        amount: NewGift.amount,                         // required: gift amount
                        date: NewGift.date,                             // required: date string (ensure format is acceptable to DB)
                        description: NewGift.description || null,       // optional: gift description (null if none provided)
                        receipt_url: NewGift.receipt  ? NewGift.receipt : null, // optional: URL or filename of receipt (null if uploading later)
                        is_tax_deductable: NewGift.organisation.orgId ? true : false // insert value derived from the organisation_id column value
                    })

            }catch (q1Err){
                console.error('Error occurred during INSERT query:', q1Err);
                //the line below creates a new Error object and assigns it the 'INSERT query failed:' as its .message prop
                //then we throw the new Error object to the outer catch block which will display the q1Err.message 
                // appended to the general error message
                throw new Error('INSERT query failed: ' + q1Err.message);
            };

            try{
                /* 
                    Q2: select and return all rows (with user_id === UserId) from updated table 
                    SELECT * FROM gift_items WHERE user_id = <UserId>
                */

                //Q2 resolves (successfully) to an array of data objects (giftObjects)
                const giftObjects = await req.db
                    .from("gift_items")
                    .join("organisations", "gift_items.organisation_id", "organisations.organisation_id")
                    .where("gift_items.user_id", UserId)
                    .select(
                        "gift_items.id as id",
                        "gift_items.gift_type as giftType",
                        "organisations.entity_name as organisation",
                        "gift_items.amount as amount",
                        "gift_items.date as date",
                        "gift_items.description as description",
                        "gift_items.receipt_url as receipt",
                        "gift_items.is_tax_deductable as tax"  
                    );

                //send data back to client
                res.json(giftObjects);

            }catch(q2Err){
                console.error('Error occurred during SELECT query:', q2Err);
                throw new Error(q2Err.message); // throw to the outer catch
            }
        
        //catches the new Error object thrown by either of the inner try blocks
        }catch(err){
            //runs if either Promise (Q1 or Q2) resolves to an error object
            //e.g. if Q1 inner catch runs, line 213 will output: 'Error occurred in one of the SQL queries: INSERT query failed' 
            console.error('Error occurred in one of the SQL queries:', err);
            res.status(500).json({ error: 'Something went wrong while processing your request.' });
        }; 
    });

//END ROUTE 3

//START ROUTE 4

    /* 
        Handles POST requests from the handleFileChange() function in GivingTool which runs when the user selects a file
        from the fs. Server receives the file, and stores it in the /uploads folder. Server sends back the string url path 
        which references the file (and the location it is stored on the server). Here we set up a middleware chain 
        consisting of 4 functions and they are written below in the order that they are called when a request is made to this route.
    */
   //import multer
   const multer = require('multer'); //needed to handle the file upload

   // Middleware 2- Configure storage for multer
    const storage = multer.diskStorage({

        //Middleware 2
        destination: function (req, file, cb) {
            cb(null, './uploads/'); // folder to save in
        },
        //Middleware 3
        filename: function (req, file, cb) {
            cb(null, file.originalname); // save with original name
        }
    });

    // Initialize multer with this storage
    const upload = multer({ 
        storage: storage,

        //Middleware 1
        fileFilter: function (req, file, cb) {

            // Accept .png, .jpeg, .pdf, .heic
            const allowedTypes = [
                'image/png',
                'image/jpeg',
                'application/pdf',
                'image/heic'
            ];

            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true); // accept
            } else {
                cb(new Error('Only .png, .jpeg, .pdf, or .heic files are allowed!'));
            }
        }
    });

    

    //middleware 4- the callback function 
    router.post("/upload_receipt", upload.single("receipt"), (req, res) => {

        // `multer` puts file info in `req.file`
        if (!req.file) {
            return res.status(400).json({ error: "No file uploaded." });
        }

        // Build file path to return
        const fileUrl = `/uploads/${req.file.filename}`;

        // Send back file URL to client
        res.json({ fileUrl: fileUrl });
    });

//END ROUTE 4

//START ROUTE 5
    /* 
        This route handles HTTP DELETE requests from the handleDelete() button in the GivingTool page which runs when
        the user clicks one of the '-delete item' buttons in the final column of the top table (to delete a gift object)
    */
    router.post("/delete_gift", async (req, res) => {

        //extract query string (with case sensitivity disabled)
        const giftId = req.query.GiftID || req.query.giftId; //stores the id of gift_item (PK which references object in gift_items)
        
        //construct and execute the following query
        //DELETE FROM gift_items WHERE id = ?;

        knex('gift_items')
            .where({ id: giftId })
            .del()
    });

//END ROUTE 5


// Export the router for use in other parts of the application
module.exports = router;