// Load Express framework module
const express = require('express')

// Load express-session in order to support sessions
const session = require('express-session')

// DB handler
const Sequelize = require('sequelize')

// Load bcrypt for password hashing - compare password with stored and encrypted password
const bcrypt = require('bcrypt')

// Load Joi module for validation
const Joi = require('joi')

// Load unsplash-source-node
const unsplash = require('unsplash-source-node')

// Import database
const db = require('./config/database.js')

// Create app by making an instance of express
const app = express()

// Enable handling of JSON requests
app.use(express.json())

// Setup express-session
const expressSession = session({
    secret: 'audl2018'
})

// Use the above settings
app.use(expressSession)

// Load Socket.io and set it up
const http = require('http').Server(app)
const io = require('socket.io')(http)

// Share sessions between Express and Socket.io
const ioSession = require('express-socket.io-session')

// Setup session sharing between Express and Socket.io
io.use(ioSession(expressSession, {
    autoSave: true
}))

// METHOD: When a user (socket) connects to the site, do stuff
io.on('connection', socket => {
    // Take the user object from the session which contains the user's ID and username
    let { user } = socket.handshake.session

    console.log('Socket connected! Socket id:', socket.id)

    socket.emit('debug message', 'Socket connected to server!')
})

// Set up templates
app.engine('html', require('ejs').renderFile)
app.set('view engine', 'html')

// Serve static files
app.use(express.static('public'))


// FUNCTION: Authentication middleware
const requireAuthentication = (req, res, next) => {
    if (!req.session.user) {
        return res.json({
            status: 'ERROR',
            message: 'Authentication required!'
        })
    }

    next()
}

// METHOD: Check if user is logged in 
app.get('/', (req, res) => {
    // If user not logged in, redirect to signin.html
    if (!req.session.user) {
        return res.redirect('/signin.html')
    }

    // Else, send user to front page of app
    res.render('app.ejs', {
        'id': req.session.user.id,
        'username': req.session.user.username
    });
})

// METHOD: Handle user authentication
app.post('/api/auth', (req, res) => {
    let { username, password } = req.body

    // Make sure username and password are present
    let schema = {
        username: Joi.string().alphanum().required(),
        password: Joi.string().required()
    }

    // Validate using Joi
    let result = Joi.validate(req.body, schema)

    // If validation failed, return an error
    if (result.error !== null) {
        return res.status(422).json({
            message: 'Validation failed!'
        })
    }

    // Build query for looking up the user
    let query = {
        where: {
            username
        }
    }

    //METHOD: Query database for matching username
    db.User.findOne(query)
    .then(user => {
        // If matching username was not found, then return an error 
        if (!user) {
            return res.status(422).json({
                status: 'ERROR',
                message: 'Invalid credentials!'
            })
        }

        // Compare the found user's password with the submitted password
        bcrypt.compare(password, user.password) // bcrypt encrypts password

        .then(result => {
            // If the comparison fails, then return an error
            if (!result) {
                return res.status(422).json({
                    status: 'ERROR',
                    message: 'Invalid credentials!'
                })
            }

            // Else, set the session with the user's details
            req.session.user = {
                id: user.id,
                username: user.username
            }

            // Send a response
            res.json({
                status: 'OK',
                message: 'You have been authenticated!'
            })
        })
    })
})

// METHOD: Check authentication
app.get('/api/authed', (req, res) => {
    if (typeof req.session.user !== 'undefined' && req.session.user !== null) {
        res.send('OK');
    }
    else {
        res.send('UNAUTH');
    }
})

// METHOD: Sign out
app.post('/api/signout', (req, res) => {
    delete req.session.user;

    res.json({
        status: 'OK',
        message: 'You have been signed out!'
    })
})

/////////////////////  CRUD USER  /////////////////////

// METHOD: Create a new user
app.post('/api/users', (req, res) => {
    let { username, password } = req.body

    // Set rules for the password and username 
    let schema = {
        // string, only numbers and letters, 3-50 characters, must be filled out
        username: Joi.string().alphanum().min(3).max(50).required(),
        // string, 8 characters, must be filled out        
        password: Joi.string().min(8).max(50).required()
    }

    // If input is valid, then error will be null, else it will be an Error object.
    const result = Joi.validate(req.body, schema)

    // If error, then return error message
    if (result.error !== null) {
        // HTTP 422 = Unprocessable entity
        return res.status(422).json({
            status: 'ERROR',
            message: 'Validation failed! (Username: 3-50 characters, alphanumerical. Password: 8-50 characters.)'
        })
    }

    // Create the new user
    db.User.create({
        username,
        password
    })
    .then(user => {
        // HTTP 201 = Created
        res.status(201).json({
            status: 'OK',
            message: 'User created!'
        })
    })
    .catch(error => {
        console.log(error);
        // HTTP 422
        res.status(422).json({
            status: 'ERROR',
            message: 'Error creating user!'
        })
    })
})


/* // METHOD Read all users with guest relationship to wishlist
app.get('api/users', (req, res) => { 
    db.User.findAll({
        where: { 
            relationship: guest //Only with guest relationship to specific wishlist
        }
    }) 
    .then(users => {
    res.json(users);
    });
  }); */


app.put('/api/user', (req, res) => {
    const id = req.session.user.id;
    const updates = req.body;

    const updateArr = {};

    // Only update if fields have been filled out, to avoid updating to undefined or empty
    if (typeof updates.newusername !== 'undefined' && updates.newusername != '') {
        updateArr.username = updates.newusername;
    }

    if (typeof updates.newpassword !== 'undefined' && updates.newpassword != '') {
        updateArr.password = updates.newpassword;
    }
    console.log(updateArr);
    db.User.find({
      where: { 
          id: req.session.user.id  
        }
    })
    .then(user => {
    return user.updateAttributes(updateArr)
    })
    .then(updatedUser => {
    if (typeof updates.newusername !== 'undefined' && updates.newusername != '') {
        req.session.user.username = updates.newusername;
    }

    res.json(updatedUser);
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured'
        })
    })
  });

// METHOD: Delete a user by id from session
app.delete('/api/user', (req, res) => {
    const id = req.session.user.id;
    db.User.destroy({
      where: { 
          id: req.session.user.id 
        }
    })
      .then(deletedUser => {
        delete req.session.user;
        res.send('OK');
      })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured'
        })
    })
  });


/////////////////////  CRUD WISHLIST  /////////////////////

// METHOD: Create a wishlist
// Require that user is logged in
app.post('/api/wishlists', requireAuthentication, async (req, res) => {
    let { listname } = req.body

    const randomImage = await unsplash({random: true, redirectURL: true});
    console.log(randomImage);

    // Set rules for the list name
    let schema = {
        // string, 3-50 characters, must be filled out
        listname: Joi.string().min(3).max(16).required()
    }

    let result = Joi.validate(req.body, schema)

    if (result.error !== null) {
        return res.status(422).json({
            status: 'ERROR',
            message: 'You must give your wishlist a name (3-50 characters)'
        })
    }

    // Create the wishlist and take the userId from the session
    // Adding the userId associates the wishlist with the user
    db.Wishlist.create({
        listname,
        themeimage: randomImage, // themeimage from external API
        userId: req.session.user.id
    }, {
        include: [{
            model: db.User, // Only select the username column
            attributes: ['username']
        }]
    })
    .then(wishlist => {
        // Select the wishlist again with the associated user
        return wishlist.reload()
    })
    .then(wishlist => {
        db.UserWishlist.create({
            wishlistId: wishlist.id,
            userId: req.session.user.id,
            relation: 'owner' // When creatin a wishlist, set session user owner
        }, {
            include: [{
                model: db.User, // Only select the username column
                attributes: ['username']
            }]
        })
        .then(() => {
            // Emit the newly created wishlist to all sockets
            io.emit('new wishlist', wishlist)

            // Return a HTTP 201 response
            return res.status(201).json({
                status: 'OK',
                message: 'Wishlist created!'
            })
        })
        .catch(error => {
            console.log(error);
            res.status(422).json({
                status: 'ERROR',
                message: 'An error occured when creating new wishlist'
            })
        })
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured when creating new wishlist'
        })
    })
})


// METHOD: Read all wishlists where user is owner
app.get('/api/wishlists', requireAuthentication, (req, res) => {
    db.UserWishlist.findAll({
        where: {
            userId: req.session.user.id,
            relation: ['owner', 'guest']
        },
        include: [{
            model: db.Wishlist,
            attributes: ['listname']
        },{
            model: db.User,
            attributes: ['username']
        }]
    })
    .then(wishlists => {
        res.json(wishlists)
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured when getting wishlists',
            trace: error
        })
    })
})

// METHOD: Read all wishlists where user is guest
/*app.get('/api/wishlists', requireAuthentication, (req, res) => {
    // Include the user related to the wishlists
    let options = {
        where: { 
            userid: req.session.user.id,
            relationship: 'guest'
        },
        include: [{
            model: db.User,
            attributes: ['username'] // Only select the username column
        }]
    }
    
    db.Wishlist.findAll(options)
    .then(wishlists => {
        res.json(wishlists)
    })
})
*/

// METHOD: Read one wishlist by id
app.get('/api/wishlist/:id', requireAuthentication, (req, res) => {
    const id = req.params.id;
    db.UserWishlist.find({
        where: { 
            wishlistId: id,
            userId: req.session.user.id
        },
        include: [{
            model: db.Wishlist,
            attributes: ['listname', 'themeimage']
        }]
    })
      .then(wishlist => {
        res.json(wishlist);
      });
  });


// METHOD: Update a wishlist by id
app.patch('/api/wishlists/:id', requireAuthentication, (req, res) => {
    const id = req.params.id;
    const updates = req.body.updates;
    db.Wishlist.find({
      where: { 
          id: id 
        }
    })
    .then(user => {
    return wishlist.updateAttributes(updates)
    })
    .then(updatedWishlist => {
    res.json(updatedWishlist);
    });
  });

// METHOD: Delete a wishlist by id
app.delete('/api/wishlists/:id', requireAuthentication, (req, res) => {
    const id = req.params.id;
    db.Wishlist.destroy({
      where: { 
          id: id 
        }
    })
    .then(deletedWishlist => {
    res.send('OK');
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured'
        })
    })
  });



/////////////////////  CRUD WISH  /////////////////////

// METHOD: Create a new wish
// Require that user is logged in
app.post('/api/wishes', requireAuthentication, (req, res) => {
    let { wishname, wishinfo, wishprice, wishlistId } = req.body

    // Set rules for the wishname, wishinfo and wishprice
    let schema = {
        // string, 3-30 characters, must be filled out
        wishname: Joi.string().min(3).max(150).required(),
        wishinfo: Joi.string().min(3).max(150).required(),
        wishprice: Joi.number().min(0).required(),
        wishlistId: Joi.number().min(1),
    }

    let result = Joi.validate(req.body, schema)

    if (result.error !== null) {
        return res.status(422).json({
            status: 'ERROR',
            message: 'You must fill out all of the fields (price: numbers only. name & info: 3-150 characters)'
        })
    }

    // Create the wish and take the wishlistid from the session
    // Adding the wishlistid associates the wish with the wishlist
    db.Wish.create({
        wishname,
        wishinfo,
        wishprice,
        wishlistId: wishlistId,
        userId: req.session.user.id
    })
    .then(wish => {
        // Select the wish again
        return wish.reload()
    })
    .then(wish => {
        // Emit the newly created wishlist to all sockets
        io.emit('new wish', wish)

        // Return a HTTP 201 response
        return res.status(201).json({
            status: 'OK',
            message: 'Wish created!'
        })
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured when creating new wish'
        })
    })
})


// METHOD Read one wish by id
app.get('/wish/:id', requireAuthentication, (req, res) => {
    const id = req.params.id;
    db.Wish.find({
      where: { 
          id: id 
        }
    })
    .then(wish => {
        res.json(wish)
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured'
        })
    })
  });

// METHOD: Read all wishes belonging to a wishlist
app.get('/api/wishes', requireAuthentication, (req, res) => {
    // Include the user related to the wishlists
    const id = req.param('id');

    let options = {
        where: { 
            wishlistId: id
        },
        include: [{
            model: db.User,
            attributes: ['username'] // Only select the username column
        }]
    }

    db.Wish.findAll(options)
    .then(wishes => {
        res.json(wishes)
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured when getting wishes'
        })
    })
});

// METHOD: Update a wish by id
app.patch('/api/wishes/:id', requireAuthentication, (req, res) => {
    const id = req.params.id;
    const updates = req.body.updates;
    
    db.Wish.find({
      where: { id: id }
    })
    .then(wish => {
    return wish.updateAttributes(updates)
    })
    .then(updatedWish => {
    res.json(updatedWish);
    })
    .catch(error => {
    console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured'
        })
    })
  });

// METHOD: Delete a wish by id
app.delete('/api/wishes/:id', requireAuthentication, (req, res) => {
    const id = req.params.id;
    db.Wish.destroy({
      where: { id: id }
    })
    .then(deletedWish => {
    res.send('OK');
    })
    .catch(error => {
        console.log(error);
        res.status(422).json({
            status: 'ERROR',
            message: 'An error occured'
        })
    })
});



/////////////////////  DATABASE  /////////////////////

// Synchronize database models
db.sequelize.sync({ force: false })
    .then(() => { //Force: false = saves all data
    console.log('Database synchronized..')

    http.listen(3000, () => {
        console.log('Web server started..')
    })
});