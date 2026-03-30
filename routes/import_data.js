var express = require('express');
var router = express.Router();
/* When you require multer, you get a function (multer.()) that you can call with options to configure it. 
The result is middleware that you can use in your routes to handle file uploads.*/
const multer = require('multer');
const path = require('path');
const { exec } = require('child_process'); // Add this line to import exec
const { spawn } = require('child_process');
const fs = require('fs');

/* This line below creates an instance of the multer() middleware function (upload). 
When a file is uploaded in the client-side code,  upload will automatically handle saving the file to 
the uploads/ directory and generate a unique filename for it. The multer() paramater is an options 
object which  specifies the folder where the uploaded files should be stored*/
const upload = multer({ dest: 'uploads/' }); 


/* This file contains all server routes which handle requests from the ImportData.js page in the client */

//START ROUTE 1: 

    /* 
        Server route for handling POST requests from the <SelectFile/> component within the <ImportData/> page.
        This is where the user selects a .csv file from the fs and uploads it, which triggers a POST request
        to the server and sends it the file in the multi part body. The server route receives the file, then 
        executes a python script to parse the .csv data into a list of transactions which that is sent back to 
        the client (I recall as a JSON object), which displays the transactions in a table.
        
    */

    /* This function deletes the uploaded file when an error occurs(in route 1). It is called just before the return statements of the 
    if and catch block of the exec callback which runs when an error occurs executing the python command, script, 
    or parsing the script output*/
    function deleteFile(file_path) {
      fs.unlink(file_path, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err.message}`);
        } else {
          console.log(`File deleted: ${file_path}`);
        }
      });
    }

    router.post("/upload_2", upload.single('file'), (req, res) => {
      if (!req.file) {
        console.error('No file uploaded');
        return res.status(400).json({ error: 'No file uploaded' });
      }
    
      // Adjust the file path to point to the correct uploads directory
      const filePath = path.join(__dirname, '..', 'uploads', req.file.filename);
      console.log(`File uploaded to: ${filePath}`); // Debugging information
    
      // Log the contents of the uploads directory
      fs.readdir(path.join(__dirname, '..', 'uploads'), (err, files) => {
        if (err) {
          console.error('Unable to scan directory:', err);
          return res.status(500).json({ error: 'Unable to scan directory', details: err.message });
        } else {
          console.log('Directory contents:', files);
        }
    
        // Check if the file exists
        fs.access(filePath, fs.constants.F_OK, (err) => {
          if (err) {
            console.error(`File not found at path: ${filePath}`);
            return res.status(500).json({ error: 'File not found', details: err.message });
          }
    
          console.log(`File exists at path: ${filePath}`);
    
          // Ensure the file is readable
          fs.access(filePath, fs.constants.R_OK, (err) => {
            if (err) {
              console.error(`File is not readable: ${filePath}`);
              return res.status(500).json({ error: 'File is not readable', details: err.message });
            }
    
            console.log(`File is readable: ${filePath}`);
    
            // Add a small delay for debugging purposes (optional)
            setTimeout(() => {
              exec(`python data_prep_2.py ${filePath}`, (error, stdout, stderr) => { //modification on this line-to revert changes simply change the python script to data_prep.py
                if (error) {
                  console.error(`Error executing Python script: ${error.message}`);
                  console.error(`Error details: ${stderr}`);
                  console.error(`Standard Output: ${stdout}`);
                  return res.status(500).json({ error: 'Error executing Python script', details: stderr });
                }
                if (stderr) {
                  console.error(`Python stderr: ${stderr}`);
                  deleteFile(filePath);
                  return res.status(500).json({ error: 'Error in Python script', details: stderr });
                }
    
                console.log(`Python script output: ${stdout}`); // Log raw output
    
                let result;
                try {
                  result = JSON.parse(stdout);
                } catch (jsonError) {
                  console.error(`Error parsing JSON: ${jsonError.message}`);
                  deleteFile(filePath);
                  return res.status(500).json({ error: 'Error parsing JSON', details: jsonError.message });
                }
    
                res.json(result);
    
                // Delete the uploaded file after processing
                fs.unlink(filePath, (err) => {
                  if (err) console.error(`Error deleting file: ${err.message}`);
                });
              });
            }, 1000); // 1 second delay for debugging
          });
        });
      });
      // use JSON data to define tables in database and add 1 row of data
    });
//END ROUTE 1

//START ROUTE 2
  /*
      This is the server route for handling POST requests from the event handler function of the 
      'Save Budget Data' Button within the JSX of the <ImportData/> page. This button is located at the 
      bottom of the table which displays the list of user transactions for a selected month. It is enabled
      when the user has selected a budget item category for each transaction in the table. 
  
  */
  router.post("/save_budget_data", async (req, res) => {

    //START HELPER FUNCTIONS- here we define a number of helper functions to perform a variety of tasks 
      //HELPER 1- checks if there is a userId value in the req.body. Throws an error to the catch-block if it doesn't
      // also checks the month and year params
        function validatePayload(userID, mnth, yr) {
          if (!userID) {
            throw new Error("Missing user_id in request body.");
          }
          if (!mnth) {
            throw new Error("Missing month in request body.");
          }
          if (!yr) {
            throw new Error("Missing year in request body.");
          }
        }
      //END HELPER 1

      //HELPER 2- async function which transforms each object in the newItems array into an object with properties that match the columns from
      // the 'current_budget_items' table that the new budget item values are then inserted into. 
      /*
        newBItems is expected to be an array of objects in the following form: 
        { 
          item: "Christmas Gifts", 
          amount: 0, 
          frequency: "", 
          total: 0,
          primaryCat: "Expenditure",
          secondaryCat: "Giving",
          tertiaryCat: "Giving"  
        }
       
      */
        async function insertNewBudgetItems(newBItems, userID) {
          //first check if newBItems is truthy
          if (!Array.isArray(newBItems) || newBItems.length === 0) {
            throw new Error("No new budget items provided for insertion.");
          }
          //then process the array of objects 
          
            const parsedNewItems = newBItems.map((obj) => ({
              user_id: userID,
              primary_category: obj.primaryCat,
              secondary_category: obj.secondaryCat,
              tertiary_category: obj.tertiaryCat,
              item_name: obj.item,
              current_amount: obj.amount,
              frequency: obj.frequency,
            }));
            //extract the names of each new budget item from each object into an array of names
            const newItemNames = parsedNewItems.map((obj) => obj.item_name);

            //if there are any existing items in the table where the current user has already created an item with the same name, delete them (this code is likely redundant)
            await req.db("current_budget_items")
              .where({ user_id: userID })
              .whereIn("item_name", newItemNames)
              .del();

            //then insert new items (insert new budget items in the "current_budget_items" table)
            const insertedRows = await req.db("current_budget_items").insert(parsedNewItems);

            // If no rows were inserted, throw an error to be caught by the catch block of the client code
            if (!insertedRows || insertedRows.length === 0) {
              throw new Error("Failed to insert new budget items.");
            }

            return {
              message: "Existing records deleted, new data inserted successfully",
              insertedRows: insertedRows.length,
            };
          
        }
      //END HELPER 2

      //START HELPER 3- a function to extract the budget_item_id value of each transaction object in the map function below, using its itemName
        async function FindBItemId(bItemName, userId) {
          try {
            // Perform the query and store the result in a variable
            const result = await req.db("current_budget_items")
              .select("id")
              .where({
                item_name: bItemName,
                user_id: userId
              })
              .first(); // Assuming there will be only one matching row, we limit the result to the first row.

            // Extract the budget_item_id
            const budgetItemId = result ? result.id : null;
            
            //throw an error if no matching budget item was found for the given itemName
            if (!budgetItemId) {
              throw new Error(`Budget item not found for itemName: ${bItemName}`);
            }
            
            // Log the value for debugging
            console.log("Retrieved budget_item_id:", budgetItemId);

            // Return the value
            return budgetItemId;
          } catch (error) {
            console.error("❌ Database error:", error.message, "\n", error.stack);
            throw new Error("Internal server error mapping id from item_name");
          }
        }

      //END HELPER 3

      //START HELPER 4 - async function which  inserts the uploaded trnasactions into the db- to do this we call another async helper function
      // from within the Promise.all()
      /* 
        transacts is expected to be an array of objects in the following form:
      
        {
          id: 2,
          Date: "24/12/2024",
          Balance: -65,
          Description: "INDEPAL PTY LTD BRISBANE CITYAU",
          Amount: 1149.59,
          itemName: "Salary"
        }
      */
        // Transactions processing as a helper function
        async function processInsertTransactions(transacts, userID) {
          //first check if transacts is truthy and an array
          if (!Array.isArray(transacts) || transacts.length === 0) {
            throw new Error("No valid budget items found in request body");
          }
          //then process transactions
          const processedTransactions = await Promise.all(
            transacts.map(async (transObj) => ({
              user_id: userID,
              budget_item_id: await FindBItemId(transObj.itemName, userID),
              amount: transObj.Amount,
              description: transObj.Description,
              date: new Date(transObj.Date).toISOString().slice(0, 10), // Format YYYY-MM-DD,
            }))
          );

          const insertedTrans = await req.db("user_transactions").insert(processedTransactions);

          // If no rows were inserted, throw an error to be caught by the catch block of the client code
          if (!insertedTrans || insertedTrans.length === 0) {
            throw new Error("Failed to insert new transactions.");
          }

          return {
            message: "User transactions inserted successfully",
            insertedRows: insertedTrans.length,
          };
        }

      //END HELPER 4


    //END HELPER FUNCTIONS

    //ROUTE CLIENT CODE
      // first destructure payload- expected to be an object in the following form
      /* 
        {
          userId: userId,
          month: selectedMonth,
          year: selectedYear,
          transactions: parsedPayload,
          newItems: newBudgetItems
        };
      */
      const data = req.body;
      const{ userId, month, year, transactions, newItems } = data;

      //then use 1 try-catch block which calls the helpder functions to perform the unique tasks
      try {
        // Task 1: Validate User ID
        validatePayload(userId, month, year);

        // Task 2: Insert new budget items (if applicable)
        let insertItemsMessage = null;
        if (newItems) {
          insertItemsMessage = await insertNewBudgetItems(newItems, userId);
        }

        // Task 3: Process and insert transactions
        const insertTransactionsMessage = await processInsertTransactions(transactions, userId);

        // Send the success response
        res.json({
          ...(insertItemsMessage && {
            newItems: insertItemsMessage.message,
            newItemsInserted: insertItemsMessage.insertedRows,
          }),
          newTransactions: insertTransactionsMessage.message,
          newTransInserted: insertTransactionsMessage.insertedRows,
        });
      } catch (error) {
        console.error("❌ Route failure:", error.message);
        res.status(500).json({ error: "Internal server error: " + error.message });
      }
    //END CLIENT CODE
  });
    
//END ROUTE 2

    

    

// Export the router for use in other parts of the application
module.exports = router;