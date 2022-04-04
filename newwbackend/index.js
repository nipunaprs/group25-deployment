const express = require('express');
const cors = require("cors"); //cross origin
const app = express(); //express
const mysql = require('mysql'); //mysql
var axios = require("axios").default;


//
//
//
//


const URL = '104.197.238.91'

//
//
//

const bcrypt = require('bcrypt');
const saltrounds = 10;

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');

app.use(express.json());
app.use(express.urlencoded({extended: true}));



//WHEN DEPLOYING CHANGE THE ORIGIN TO "http://34.70.157.84" before deploying on GCP
//Note also need to change frontend --> components --> api and change the fetch ip there
// http://localhost:3000
app.use(cors({
    origin: ["http://104.197.238.91"],
    methods: ["GET", "POST", "DELETE"],
    credentials: true
    
}));

app.use(cookieParser());
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ 
   extended: true
}))


const db = mysql.createConnection({ //connection to the mysql database
    host: '34.122.225.135',
    user: 'root',
    password: 'root',
    database: 'algo'
});


app.use(session({
    key: "userId",
    secret: "algo",
    resave: false,
    saveUninitialized: false,
    cookie:{
        maxAge: 60*60*2400
    },
})
);
/* Commented out b/c no database for testing. Also commented out interval code in App.js..    
db.connect(function(err){ //connect
    if(err) throw err;
    console.log('Database connected'); 
});*/


/*
* THESE ARE USED FOR USER REGISTRATION AND LOGIN
*
*
*
 */

app.post('/api/register', (req,res) =>{
    const username = req.body.username;  //recieves form username
    const password = req.body.password; //recieves form password
    
    bcrypt.hash(password, saltrounds, (err, hash) =>{ //encrypt password before inserting
        if (err){
            console.log(err); //console log error is there is
        }
        
        db.query(`INSERT INTO users (username,password) VALUES('${username}', '${hash}');`, //inserting into mysql database for users
    
            (err, result) =>{
                if (err){
                    console.log(err);
                    res.send({message: "Error"});
                }
                else {
                    db.query(`INSERT INTO userLevel (username,currentLevel) VALUES('${username}', 1);`,
                        () =>{
                            res.send({message: "Registered"})

                        })
                    
                }

            }
        );
    })

});
   

app.post('/api/login', (req, res) =>{
    const username = req.body.username;  //recieves form username
    const password = req.body.password; //recieves form password

    db.query(`SELECT * FROM users WHERE username = '${username}';`,
    (err, result) =>{
        if (err){
            res.send({err: err})
        }

        if (result.length >0){//if there is a result password
            bcrypt.compare(password, result[0].password, (error, response) =>{ //compare password with the bcrypt variant
                if(response){
                    req.session.user = result;
                    res.send({login:"Logged In"});
                }
                else {
                    res.send({message: "Incorrect username or password."})
                }    
            });
        } 
        else {
            res.send({message: "Incorrect username or password."})
        }


    }
    )
});

app.get('/api/userLevel', (req,res) =>{
    if(req.session.user){
        db.query(`SELECT * FROM userLevel WHERE username = '${req.session.user[0].username}';`,
        (err, result) =>{
            if (err){
                res.send({err: err})
            }
            else{
                res.send(result);
            
            }
        })
    }   
})

app.get('/api/login', (req, res) =>{


    if (req.session.user){
        res.send({loggedIn: true, user: req.session.user}); //sends the loggedIn as true
    }
    else{
        res.send({loggedIn: false, user: req.session.user}); //sends the loggedIn as true
    }
    
});


/**
 * 
 * DEALING WITH TIME COMPLETION AND LOGS
 * 
 * 
 * 
 */

 app.post('/api/sendtime', (req,res)=>{
    const time = req.body.seconds;
    const level = req.body.level;


     if (req.session.user){ //checks for the cookie of the user (basically if he is logged in)
        const username = req.session.user[0].username;
        db.query(`SELECT * FROM usertimespent WHERE username = '${username}' AND level = '${level}' ;`, //checks if level complete
        (err, result) =>{ 
            if (err){
                res.send({err: err});
            }
            else{
                if(result === undefined || result.length == 0){ //continue if the level is not complete
                    db.query(`INSERT INTO usertimespent (username, level, timespent) VALUES ('${username}',  ${level}, ${time})`,
                    (err,result) =>{
                        if(err){
                            console.log(err);
                        }
                        else{
                            if (level == 5){
                                level = 4;
                            }
                            db.query(
                                    `UPDATE userLevel SET currentLevel = ${level + 1}  WHERE username = '${username}';`, 
                                    (err, result) =>{
                                    }
                                );
                            res.send({message: "Level " + level + " completed in " + time+"."}); 
                        }
                    });
                }
                else{
                    res.send({message: "Level already completed"})
                }


            }
        })

    }
    else{
        res.send({message: "Not logged in"});
   }
})

/** */

app.get('/api/signout', (req,res) =>{
    res.clearCookie('userId').send("Signed out"); //clears the cookie when you click on the signout
})


/** GET USER HISTORY AND LEVELS */

app.get('/api/getTime', (req,res) =>{
    if (req.session.user){ //checks for the cookie of the user (basically if he is logged in)
        const username = req.session.user[0].username;
        db.query(`SELECT * FROM usertimespent WHERE username = '${username}';`, 
        (err, result) =>{ 
            res.send(result);

        })
    }

})

app.get('/api/getLevel', (req,res) =>{
    if (req.session.user){ //checks for the cookie of the user (basically if he is logged in)
        const username = req.session.user[0].username;
        db.query(`SELECT * FROM userLevel WHERE username = '${username}';`, 
        (err, result) =>{ 
            res.send(result);
        })
    }

})
///////////////

app.post('/api/getStep', (req,res) =>{
    const d = req.body.depth;  //receive step
    const arr = req.body.arr;  //receive array
    
    console.log(d);
    console.log(arr);
    
    var depth = d;
    var sorting=[]
    var breakdown=[]

    function MergeSort(array)
    {
    if( depth > 0)
    {
        if(array.length<2 )
        {
        return array
        }
    
    
        var mid=Math.round(array.length/2)
        var left=array.slice(0,mid)
        var right=array.slice(mid,array.length)
    
        depth--
        var leftSorted=MergeSort(left)
        var rightSorted=MergeSort(right)
    
        return Merge(leftSorted,rightSorted)
    }
    else
    {
        breakdown.push(array)
        return array
    }
    
    }


    function Merge(leftArray,rightArray)
    {

    var num=0, num3=0, num2=0
    var array=[]

    while(num<leftArray.length && num2<rightArray.length)
    {
        if(leftArray[num]<= rightArray[num2])
        {
        array[num3++]=leftArray[num++]
        }
        else
        {
        array[num3++]=rightArray[num2++]
        }
    }

    while(num<leftArray.length)
    {
        array[num3++]=leftArray[num++]
    }
    while(num2<rightArray.length)
    {
        array[num3++]=rightArray[num2++]
    }
    sorting.push(array)

    return array

    
    }
    

    let fullArr = MergeSort(arr);


    res.send({"break": breakdown, "full": sorting});

});



app.listen(3001, ()=>{
    console.log("running on port 3001");
 }); //listen to 3001
