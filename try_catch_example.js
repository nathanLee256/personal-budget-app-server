/* 
    this file shows the general syntax for the nested try-catch blocks to use in server routes to display custom error messages
    for a number of scenarios 
*/

try {

    //try 1
    try {
        // ... Perform your first operation here (e.g., DB query, external API call, etc.) ...

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
        // ... Perform your second operation here ...
    } catch (secondErr) { 
        console.error('Try 2 failed:', secondErr);
        const ERROR_TRY_2 = 'failure in try 2: ' + secondErr.message;
        throw new Error(ERROR_TRY_2);   
    }


} catch (outerErr) {
    //outerErr will be the error object thrown from one of the inner try blocks. It will contain the custom message we assigned to it in the inner catch
    // then we create the error message to send back to client by concatentating the error messages from the inner try with some additional text
    const FINAL_ERROR = 'Error occurred due to' + outerErr;

    //and just log the outerErr.message to the console to indicate where the error occured
    console.error(FINAL_ERROR); //e.g. "Error occurred due to failure in try 1: Cannot read property 'x' of undefined "

    //finally handle error however your app needs
    res.status(500).json({ error: FINAL_ERROR });
}