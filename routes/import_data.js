var express = require('express');
var router = express.Router();
/* When you require multer, you get a function (multer.()) that you can call with options to configure it. 
The result is middleware that you can use in your routes to handle file uploads.*/
const multer = require('multer');

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
    router.post('/upload_2', upload.single('file'), (req, res) => {
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

        //TBA
        
    });


//END ROUTE 2


// Export the router for use in other parts of the application
module.exports = router;