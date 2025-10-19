/* This file establishes a connection to our database server and exports an object 
which stores all of our connection information  */

// the code below has been copied and pasted from my knexWorld app. Replace these
// property values below with updated values once I have installed mySQL and
// created my database server on this pc

module.exports = {
    client: "mysql2",
    connection: {
        host: 'localhost',
        database: 'budget_app',
        user: 'nathan_a',
        password: '(!nathan)',
    },
};