//requireing all modules that are required
const express = require("express");
const mariadb = require('mariadb');
const bodyParser = require("body-parser");
let alert = require('alert'); 

// const db = require('./db')


//declaring express app
const app = express()


app.set('view engine', 'ejs');

//using body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));



// the UI that the user gets when opens localhost:3000/
app.get("/" , function(req,res){
    res.render("index.ejs", {
      cluster: "xy",
      lag : "xy",
      node1 : "xy",
      node2 : "xy",
      node3 : "xy",
      slaves : "xy",
    })
});


// the USer data is sent using post
app.post('/', async (req, res) => {
  try {


// getting the ip that the user entered
      node_name = req.body.node
      cluster_name = req.body.cluster_name
      console.log(node_name, cluster_name)

      var region = node_name.split(".")[2]


      if (ValidateNodeName(node_name)){

          // Create a connection pool
        const pool = mariadb.createPool({
          host: node_name,
          user: 'praveen',
          password: 'password',
          port: 3306
        });



  // Expose a method to establish connection with MariaDB SkySQL
        module.exports = Object.freeze({
          pool: pool
        });


        const result = await pool.query("SHOW VARIABLES LIKE 'wsrep_cluster_name'");
        console.log(result)



  // finding all nodes of cluster 
        const result2 = await pool.query("SHOW STATUS LIKE 'wsrep_incoming_addresses'");
        // res.write("All the nodes belonging to the cluster are:          " + result2[0].Value + "\n");
        console.log(result2[0])

        const resultt = await pool.query("SELECT host FROM information_schema.PROCESSLIST ");
        // res.write("All the nodes belonging to the cluster are:          " + result2[0].Value + "\n");
        // console.log(resultt[0])


// this if-else is used to check for nodes that exist and have "praveen" user installed, but dont belong to a cluster
        if (result2[0] == undefined){
          // res.sendFile(__dirname + "/index.html")
          alert("The entered node is not part of any cluster...")
          // res.send('<button type="reset">reset</button>')

        }

        else{
         

  // variable to store all the IPs+port of the nodes in the cluster
        split_ip = result2[0].Value.split(",")
        
  // ip+port => ip         ips stores all IPs in a array.. 
        var ips = []
        split_ip.forEach(element => {
          ips.push(element.split(":")[0])
        });
        var all_nodes = []


// connecting to  praveen DB in stg-manasareddy002

        const poolo = mariadb.createPool({
          host: "stg-manasareddy002.phonepe.nb6",
          user: 'praveen',
          password: 'password',
          port: 3306, 
          database: "praveen"
        });



        // Expose a method to establish connection with MariaDB SkySQL
          module.exports = Object.freeze({
            poolo: poolo
          });

        // here we find no of rows in all_nodes table.. this will reflect how many comparisons (of the node_name) need to be made..
          var rowsnum = await poolo.query("SELECT count(*) as NUM from all_nodes")
          rowsnum = rowsnum[0].NUM

          // finding list of all the nodes in all the clusters that have been onboarded already
          const resu = await poolo.query("select all_nodes from all_nodes" )
          var flag = 0

          //  comparing each node already inside the cluster with node_name, to find if the cluster containing the node_name has already been onboarded 
          for(let i= 0; i< rowsnum; i++){
            if (node_name == resu[i].all_nodes){
              flag +=1
            }
          }

          // this if_else is used to either onboard the cluster or give a msg that a cluster has alreadty been onboarded
          if(flag >0){
            alert("The cluster has already been onboarded on the dashboard.")
          }
          else{
          const resultm = await poolo.query("insert into clusters (nodes) values (?)", node_name );
          }


          


// connecting to all nodes in cluster, in a loop, to find theri node names and push it into all_nodes table

        active_nodes = ips.length;
        hostnames = []
        hostnames.length = active_nodes

        for(let i =0; i< active_nodes; i++){
           // Create a connection pool
           const poolm = mariadb.createPool({
            host: ips[i],
            user: 'praveen',
            password: 'password',
            port: 3306, 
          });
    
    
    
      // Expose a method to establish connection with MariaDB SkySQL
            module.exports = Object.freeze({
              poolm: poolm
            });
    
    
      // finding node name of the given node
            const resultm = await poolm.query("select @@hostname");
            hostnames[i] = Object.values(resultm[0])
            const insert_nodes = await poolo.query("insert into all_nodes (all_nodes) values (?)", (hostnames[i] + ".phonepe." + region) );        // in this line we push values into all_nodes table
          }

        console.log(hostnames);



  // getting the node with highest IP, as that will serve as the 3rd node, and to that the async slaves are connected
        ip = ips.sort().reverse()[0]

  // creating connection with the 3rd node of the cluster
        const pool2 = mariadb.createPool({
          host: ip,
          user: 'praveen',
          password: 'password',
          port: 3306, 
        });


        module.exports = Object.freeze({
          pool2: pool2
        });

  // Finding the list of async slaves
        const result3 = await pool2.query("SELECT host FROM information_schema.PROCESSLIST AS p WHERE p.COMMAND = 'Binlog Dump'")
        added = "The async slaves of the cluster are:          " + result3[0].host + "\n"
        slave = result3[0].host
        // res.render("dashboard" , {slaves : result3[0].host})
        slaves = slave.split(":")[0]
       

  // in these lines we break all the slaves into individual slaves..
        brek = slave.split(",")
        brek1 = []
        brek.forEach(element => {
          brek1.push(element.split(":")[0])
        });

        console.log(brek1);

        slave_count = brek1.length;

  //  taking multiple slaves... by connecting to each slave in a loop...
        var seconds_behind = []
        seconds_behind.length = slave_count
        var i = 0
        for (const element of brek1){
            const pool3 = mariadb.createPool({
              host: element,
              user: 'praveen',
              password: 'password',
              port: 3306, 
            });

            module.exports = Object.freeze({
              pool3: pool3
            });

            const result4 = await pool3.query("show slave status");        
            
            lag = result4[0].Seconds_Behind_Master

            if( lag == null) {
              lag = "null"
            }

            seconds_behind[i] = lag;
            i++;

        }








//  rendering the dashboard.ejs file
        res.render("index" , {
          cluster: cluster_name,
          lag : seconds_behind[0],
          node1 : hostnames[0],
          node2 : hostnames[1],
          node3 : hostnames[2],
          slaves : slaves
        })

          
  //  just to check if all is right
        console.log(split_ip)
        console.log(all_nodes)
        // console.log(result4[0].Seconds_Behind_Master)
        
        }
  
        }

      else{
        alert( "entered node has invalid format.. use the format 'stg-<name><sequence>.phonepe.nb6' where sequence is a 3 digit number (except 000).. eg stg-praveen001.phonepe.nb6")
      }

      // closing the connection
      res.end();


      
  } catch (err) {
    // res.status(500)                                        // for now all the errors that could arise is dealt with  res.send wala message below...
    // res.write(                                             // yahan se uthaya solution...    https://github.com/GoogleCloudPlatform/nodejs-docs-samples/blob/HEAD/cloud-sql/mysql/mysql/index.js#:~:text=err)%3B-,res,.end()%3B,-%7D
    //   'Unable to load page. Please check the application logs for more details. \n' 
    // )
    // res.write(
    //   'To be sure from your end, check whether the VPN is working fine, or the right node-name has been entered '
    // )
    alert("Unable to load page. Please check the application logs for more details. \nTo be sure from your end, check whether the VPN is working fine, or the right node-name has been entered")
    
    res.sendFile(__dirname + "/index.html")
    
    // res.end();
      throw err;
  }


});

// defining on what port does the server listen to
    app.listen(3000, function(){
      console.log("server is listening at port 3000")
    });





function ValidateIPaddress(ip) 
{
  re = (/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/)
  if (re.test(ip))
  {
    return (true)
  }
return (false)
}



// this function will check for node names entered on the form... eg: stg-praveen001.phonepe.nb6 .... this regex will keep "stg-", ".phonepe.nb6" parts common
// and will only check any changes in "praveen001" part, where it will accept any length of lower case name  eg praveen, manasareddy, shamanth, abc, etc
// followed a 3 digit no ranging from 001 to 999 
function ValidateNodeName(node)
{
  re = /(^(stg-[a-z]+((?!000)\d{3}).phonepe.nb6))|(^(prd-[a-z]+((?!000)\d{3}).phonepe.nb1))|(^(prd-[a-z]+((?!000)\d{3}).phonepe.nm5))/
  if (re.test(node))
  {
    return true
  }
  return false
}







//          notes
//    * This website is tested only for nb6 as of (05/06/2022)  ... infact the regex check of node-name will only allow nodes of nb6  
//    * the node name entered has to be of format given above ValidateNodeName function ....
//    * i have to include some output for when the connection times out.. for example when the node name satisfies the format, but doesnt belong to any node..
//    * have to include regex for cluster name validation
//    * have made use of "alert" package of npm, that asks for system events permission.. allow the same.. it will work fine
//    * if want to log the error on the server, use throw(err) in  catch section 





//                                                        EDGE-CASES 
//    * node-name in wrong format, including sequence as 000      (DONE)      (using regex)
//    * node-name belongs to a node that is not part of any galera cluster, but has mariadb and "praveen" user installed ( eg async slaves).. eg stg-manasareddy001      (DONE)     (at around line 66)
//    * node-name belongs to a node that is not part of any galera cluster, and "praveen" user not installed... (it will give connection timeout error)   eg stg-praveen002.phonepe.nb6
//    * node-name wala node not exists.. eg: stg-manasareddy999.phonepe.nb6   (will give connection timeout error)
//    * Connection timeout
//    * async slaves > 1   (har slave ko inlude karne k liye loop chalane par async/await wala issue aa raha tha.. ki await works only in async function.. upanshu suggested to use promises)





