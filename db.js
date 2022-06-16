// Use the MariaDB Node.js Connector
var mariadb = require('mariadb');

var ip = "10.57.58.225"

// Create a connection pool
var pool = mariadb.createPool({
    host: ip,
    user: 'praveen',
    password: 'password',
    port: 3306,
  });
 
// Expose a method to establish connection with MariaDB SkySQL
module.exports = Object.freeze({
  pool: pool
});









