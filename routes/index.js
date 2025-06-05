//imports
var express = require('express');
var router = express.Router();
const path = require('path');
const { exec } = require('child_process'); // Add this line to import exec
const { spawn } = require('child_process');
const fs = require('fs');
const auth = require("../middleware/authorise.js");

/*
  The following lines import the route modules defined in separate files,
  and "mount" them so they can be accessed through this file (index.js).
  
  For example:
  - All routes defined in users.js will now be available at paths that start with /users
  - All routes defined in gifts.js will now be available at paths that start with /gifts
*/

const userRoutes = require('./users.js');       // import users.js
router.use('/users', userRoutes);            // mount users.js under /users

const giftRoutes = require('./giving_tool.js');       // import giving_tool.js
router.use('/gifts', giftRoutes);            // mount giving_tool.js under /gifts

const worksheetRoutes = require('./worksheet.js'); //import /worksheet.js
router.use('/worksheet', worksheetRoutes);      // mount worksheet.js under /worksheet


/* When you require multer, you get a function (multer.()) that you can call with options to configure it. 
The result is middleware that you can use in your routes to handle file uploads.*/
const multer = require('multer');

/* This function deletes the uploaded file when an error occurs. It is called just before the return statements of the 
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


/* This line below creates an instance of the multer() middleware function (upload). 
When a file is uploaded in the client-side code,  upload will automatically handle saving the file to 
the uploads/ directory and generate a unique filename for it. The multer() paramater is an options 
object which  specifies the folder where the uploaded files should be stored*/
const upload = multer({ dest: 'uploads/' }); 

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

/* Test route to test connection to database server. This route executes a simple SQL command
which inserts a row of data into my income table */
// Define routes
router.get('/test', async (req, res) => {
  try {
    const results = await req.db.select('*').from('income');
    res.json(results);
  } catch (err) {
    res.status(500).send('Error querying the database');
  }
});
/* Add route here which handles HTTP POST requests to the /importCSV API endpoint 
This route receives th .csv file, processes the file using a python function, and returns a 
JSON object containing monthly budget statistics*/

router.post('/upload', upload.single('file'), (req, res) => {
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
          exec(`python data_prep.py ${filePath}`, (error, stdout, stderr) => { //modification on this line-to revert changes simply change the python script to data_prep.py
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

// route for handling HTTP POST requests from Sbar. This route-level middleware receives a JSON object sent from the client in 
// req.body, and passes the JSON string to a python script which executes and transforms the data, returning a JSON representation 
// of an array of data objects. 
router.post('/transform',  (req, res) => {
  try{
    // Get JS object from request body
    const inputData = req.body;

    // convert the JS object into JSON string
    const inputString = JSON.stringify(inputData);

    // Spawn a child process to execute the Python script
    const pythonProcess = spawn('python', ['data_transform.py']);

    // Send the input string to the Python script
    pythonProcess.stdin.write(inputString);
    pythonProcess.stdin.end();

    let data = '';
    let errorData = '';

    // Collect data from the Python script
    pythonProcess.stdout.on('data', (chunk) => {
        data += chunk;
    });

    // Collect error messages from the Python script
    pythonProcess.stderr.on('data', (chunk) => {
        errorData += chunk;
    });

    // Handle the end of the Python script execution
    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python script exited with code ${code}`);
            console.error(`stderr: ${errorData}`);
            res.status(500).send('Error processing data');
        } else {
            try {
                const transformedData = JSON.parse(data);
                res.json(transformedData);
            } catch (error) {
                console.error(`Error parsing JSON: ${error}`);
                res.status(500).send('Error processing data');
            }
        }
    });

  } catch (error){
      console.error(`Server error: ${error}`);
      res.status(500).send('Server error');
  };

});



module.exports = router;

