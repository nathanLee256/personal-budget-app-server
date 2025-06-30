var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const swaggerUI = require('swagger-ui-express'); 
const swaggerDocument = require('./docs/swagger.json');
const cors = require('cors'); // Import cors




// imports the object exported from knexfile which contains database connection information
// initializes an object called knex using the options object imported from the knexfile.js 
const options = require("./database/knexfile.js");
const knex = require("knex")(options);

var app = express();
// Use cors middleware
app.use(cors());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

//customize the morgan logging output by defining your own tokens

logger.token('req', (req, res) => JSON.stringify(req.headers));
logger.token('res', (req, res) => {   
  const headers = {}; 
  res.getHeaderNames().map(h => headers[h] = res.getHeader(h))     
  return JSON.stringify(headers) 
});  

/* middleware function which makes the knex database connection object accessible within route handlers 
by attaching it to the req object */
app.use((req, res, next) => {
  req.db = knex;
  next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* 
  This line tells Express: Whenever a GET request comes in (from the client) with a URL that starts with /uploads, 
  go look inside the uploads/ folder and try to find a matching file — and serve that file directly to the browser.” */
  app.use('/uploads', express.static('uploads'));


//application route is created to handle HTTP GET requests to the /knex path.
// route handler performs a simple SQL query which returns the current mySQL version and logs 
//it to the console, before displaying a message in the browser to indicate success. 
// This route just tests whether everything we have added so far is working.
app.get("/knex", function (req, res){
  req.db
    .raw("SELECT VERSION()")
    .then((version) => console.log(version[0]))
    .catch((err) => {
      console.log(err);
      throw err;
    });
  res.send("Version logged successfully!");
});

// START import and then activate all  app routes contained within index.js (the central hub for all app routes)
  var indexRouter = require('./routes/index');
  /* 
    the line above says "Take all routes defined in index.js (which includes users, gifts, etc.) and make them accessible 
    from the server app root path (/)."
  */
  app.use('/', indexRouter);
//END import

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

