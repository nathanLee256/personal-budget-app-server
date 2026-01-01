//imports
var express = require('express');
var router = express.Router();
const { spawn } = require('child_process');



/*
  The following lines import the route modules defined in separate files,
  and "mount" them so they can be accessed through this file (index.js).
  
  For example:
  - All routes defined in users.js will now be available at paths that start with /users
  - All routes defined in gifts.js will now be available at paths that start with /gifts
*/

const userRoutes = require('./users.js');       // import users.js
router.use('/users', userRoutes);            // mount users.js under /users

const givingToolRoutes = require('./giving_tool.js');       // import giving_tool.js
router.use('/giving_tool', givingToolRoutes);            // mount giving_tool.js under /gifts

const worksheetRoutes = require('./worksheet.js'); //import /worksheet.js
router.use('/worksheet', worksheetRoutes);      // mount worksheet.js under /worksheet

const importDataRoutes = require('./import_data.js');   //import import_data.js
router.use('/import_data', importDataRoutes);   //mount import_data.js under /import_data


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

