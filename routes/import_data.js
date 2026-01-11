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

    /*
      the payload is a JSON object in the following form:

      const payload = {
        userId: userId,
        month: selectedMonth,
        year: selectedYear,
        transactions: parsedPayload,
        newItems: newBudgetItems
      };

      payload.transactions is an array of objects in the following form:
      
        {
          id: 2,
          Date: "24/12/2024",
          Balance: -65,
          Description: "INDEPAL PTY LTD BRISBANE CITYAU",
          Amount: 1149.59,
          itemName: "Salary"
        }

      payload.newItems is an array of objects in the following form: { 
        item: "Christmas Gifts", 
        amount: 0, 
        frequency: "", 
        total: 0,
        primaryCat: "Expenditure",
        secondaryCat: "Giving",
        tertiaryCat: "Giving"  
      }


    */

    //destructure payload
    const data = req.body;
    const{ userId, month, year, transactions, newItems } = data;

    //we will use a nested try-catch block since we need to perform 2 separate SQL operations

    try {

      //try 1
      try {
        //check the userId first
        if(!userId){
          throw new Error("Missing user_id in request body");
        }

      } catch (firstErr) { 
          /* 
              firstErr is the error object created when and error occured in the first inner try. It is either assigned:
              1- An empty string if no message was provided in the inner try (e.g., throw new Error())
              2- or a standard JS error message as its .message (when a standard error occurs e.g., "Cannot read property 'x' of undefined")
          */
          
          //log the .message of the firstErr to the console for debugging
          console.error('Try 1 failed:', firstErr);

          //create a custom error message for the inner try
          const ERROR_TRY_1 = 'failure in try 1: ' + firstErr.message

          //create and throw a new Error object (with the custom message) to be caught by the outer catch
          throw new Error(ERROR_TRY_1);   
      }
      //try 2
      try {
        // insert new budget items
        if(Array.isArray(newItems) && newItems.length > 0){
          /*  
          1- process objects in newItems array. Each object needs to be in the following form:
          {
            user_id: userId, 
            primary_category: primaryCategory, 
            secondary_category: formattedSecondaryCategory,
            tertiary_category: formattedTertiaryCategory,  // Correct ENUM value
            item_name: obj.item,
            current_amount: obj.amount,
            frequency: obj.frequency,
          }
        
          */
          const parsedNewItems = newItems.map((obj)=>{

            //prepare and return a new object
            const processedObj = {
              user_id: userId, 
              primary_category: obj.primaryCat, 
              secondary_category: obj.secondaryCat,
              tertiary_category: obj.tertiaryCat,  
              item_name: obj.item,
              current_amount: obj.amount,
              frequency: obj.frequency,
            };
            return processedObj;

          })

          //2- select rows where the user may have previously entered a budget item with the same name (shouldn't happen but just to be thorough)
          let newItemNames = parsedNewItems.map((obj)=> obj.item_name)

          // Delete only those records for the user and one of the new item names
          await req.db('current_budget_items')
            .where({ user_id: userId })
            .whereIn('item_name', newItemNames)
            .del();

          //3-  insert the new budget items into 'current_budget_items' table
          await req.db('current_budget_items').insert(parsedNewItems);

          //construct a message to send back in the JSON of the res object
          const insertItemsMessage = {
            message: "Existing records deleted, new data inserted successfully",
            insertedRows: newData.length 
          }
        }
      } catch (secondErr) { 
        console.error('Try 2 failed:', secondErr);
        const ERROR_TRY_2 = 'Insert Budget Item operation failed: ' + secondErr.message;
        throw new Error(ERROR_TRY_2);   
      }

      //try 3
      try {
        //first check the transactions prop from the payload
        if (transactions.length === 0) {
          return res.status(400).json({ error: "No valid budget items found in request body" });  
        }
        //then insert transactions (process then insert)

      } catch (thirdErr) { 
        console.error('Try 3 failed:', thirdErr);
        const ERROR_TRY_3 = 'Insert Transactions operation failed: ' + thirdErr.message;
        throw new Error(ERROR_TRY_3);   
      }

    //outer catch 
    } catch (outerErr) {
        //outerErr will be the error object thrown from one of the inner try blocks. It will contain the custom message we assigned to it in the inner catch
        // then we create the error message to send back to client by concatentating the error messages from the inner try with some additional text
        const FINAL_ERROR = 'Error occurred due to' + outerErr;

        //and just log the outerErr.message to the console to indicate where the error occured
        console.error(FINAL_ERROR); //e.g. "Error occurred due to failure in try 1: Cannot read property 'x' of undefined "

        //finally handle error however your app needs
        res.status(500).json({ error: FINAL_ERROR });
    } 
  });
//END ROUTE 2


// Export the router for use in other parts of the application
module.exports = router;