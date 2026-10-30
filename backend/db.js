// since we imported dot env we will use import it here so that it can find the files and configure it 
import "dotenv/config";

// we wiil import postressql into our application 
import pg from "pg";


// we actually use pool to handle multplue queries rather than handling mulitple database connections
const {Pool} = pg; 

// now we create the nw pool information to connect our database to our server 
 const db = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 5432, 
    database: process.env.DB_NAME || "course_help", 
    user: process.env.DB_USER || "ken1",
    password: process.env.DB_PASSWORD
 });

 // we are export our db connection for other files to use it 

 export {
    db
 }

