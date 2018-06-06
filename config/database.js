const Sequelize = require('sequelize')
const bcrypt = require('bcrypt')

const sequelize = new Sequelize('sqlite:./data/database.sqlite', { //Path to database
    logging: false //Logging true = shows sql requests
})

// Custom function to hash password attribute on User model
const hashPassword = (user, options) => {
    console.log(options);
    if (options.fields.indexOf('password') !== -1 && typeof user.password !== 'undefined' && user.password !== null && user.password !== '') {
        return bcrypt.hash(user.password, 10)
        .then(hash => {
            user.password = hash
        })
        .catch(error => {
            console.log(error);
            throw new Error(error)
        })
    }
}

// Creating database object
const db = {}

// Define User
db.User = sequelize.define('user', {
    username: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    }
})

// Define Wishlist
db.Wishlist = sequelize.define('wishlist', {
    listname: {
        type: Sequelize.STRING,
        allowNull: false,
    },
    themeimage: {
        type: Sequelize.STRING, //url from external api
        allowNull: false,
    }
})

// Define ownership relation
db.UserWishlist = sequelize.define('userwishlist', {
    wishlistId: {
        type: Sequelize.INTEGER,
    },
    userId: {
        type: Sequelize.INTEGER,
    },
    relation: {
        type: Sequelize.STRING,
    }
})

// Define Wish
db.Wish = sequelize.define('wish', {
    wishname: {
        type: Sequelize.STRING,
        allowNull: false
    },
    wishinfo: {
        type: Sequelize.STRING,
        allowNull: false
    },
    wishprice: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    userId: {
        type: Sequelize.INTEGER,
        allowNull: false
    },
    wishlistId: {
        type: Sequelize.INTEGER,
        allowNull: false
    }
})

// Model associations
db.User.belongsToMany(db.Wishlist, {through: 'UserWishlist'})
db.Wishlist.belongsToMany(db.User, {through: 'UserWishlist'})
db.UserWishlist.belongsTo(db.User)
db.UserWishlist.belongsTo(db.Wishlist)

db.Wish.belongsTo(db.Wishlist)
db.Wishlist.hasMany(db.Wish)

// User can mark Wish
db.Wish.belongsTo(db.User)

// Make sure password is hashed when user is created and updated
db.User.beforeCreate(hashPassword)
db.User.beforeUpdate(hashPassword)

// 
db.sequelize = sequelize

// Export content of database
module.exports = db