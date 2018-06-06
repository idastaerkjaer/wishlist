//START of module
var Wishlist = (function (){
    let users = []
    let wishes = []
    let wishlists = []   

    // Elements  (user-generated content is added inside these containers)    
    const wishesElement = document.querySelector('#wishes')
    const wishlistsElement = document.querySelector('#wishlists-table tbody')
    const searchResultsElement = document.querySelector('#searchresults-table')

    //////////  TEMPLATES  //////////
    // Wish template (added inside div #wishes)
    const wishTemplate = ({ id, wishname, wishprice, wishinfo, user }, { relation }) => `
    <div class="content">
        <div class="media-body">
            <p>
                <b class="text-primary">${wishname}</b>
                <b class="text-secondary"> - ${wishprice}kr</b>
            </p>
            <p>${wishinfo}</p>
            ${relation == 'owner' ? '<td><a class="delete-wish" data-id="' + id + '">Delete</a></td>' : ''}
        </div>
    </div>
    `
    
    // Wishlist template (added inside tables #wishlists-table and #searchresults-table)
    const wishlistTemplate = ({ wishlistId, relation, wishlist, user }) => {
        return `
            <tr>
                <td scope="row"${relation == 'guest' ? ' colspan="2"' : ''}><a href="wishlist.html?id=${wishlistId}">${wishlist.listname}</a></td>
                ${relation == 'owner' ? '<td><a class="delete-wishlist" data-id="' + wishlistId + '">Delete</a></td>' : ''}
            </tr>
        `;
    };

    
    //////////  FRONTEND  //////////
    // Private frontend module - only available within the wishlist module
    let frontend = {}

    //////////  WISHES  //////////
    // METHOD: Add a wish to the online wishlist
    frontend.addWish = function (wish) {
        let html = wishTemplate(wish)
       
        // Add the new HTML to the end of the list
        wishesElement.insertAdjacentHTML('afterbegin', html)
    }

    // METHOD: generate all html of an array of wishes
    frontend.getWishesHTML = function (wishes, options) {
        let html = ''

        wishes.forEach(wish => {
        html += wishTemplate(wish, options)
        })

        return html
    }

    // METHOD: display a specific array of wishes in a wishlist
    frontend.displayWishes = function (wishes, options) {
        wishesElement.innerHTML = frontend.getWishesHTML(wishes, options)
    }

    
    //////////  WISHLISTS  //////////
    // METHOD: Add a wishlist to the online list of wishlists
    frontend.addWishlist = function (wishlists) {
        let html = wishlistTemplate(wishlists)
       
        // Add the new HTML to the end of the list
        wishlistsElement.insertAdjacentHTML('afterbegin', html)
    }

    // METHOD: generate all html of an array of wishlists
    frontend.getWishlistsHTML = function (wishlists) {
        let html = ''

        wishlists.forEach(wishlist => {
        html += wishlistTemplate(wishlist)
        })
        
        return html
    }

    // METHOD: display a specific array of wishlists in the list of wishlists
    frontend.displayWishlists = function (wishlists) {
        wishlistsElement.innerHTML = frontend.getWishlistsHTML(wishlists)
    }

    //////////  SEARCH RESULTS  //////////
    // METHOD: display a specific array of wishlists in the search results
    frontend.displaySearchResults = function (wishlists) {
        searchResultsElement.innerHTML = frontend.getWishlistsHTML(wishlists)
    }

    //////////  MODULE  //////////
    // Initializing an empty object via object literal notation
    let module = {}
    
    // Returns the wishlists array
    module.getWishlists = function () {
        // The credentials option makes sure that the browsers cookies
        // are sent back and forth during a request
        let options = {
            credentials: 'include'
        }

        return fetch('/api/wishlists', options)
        .then(response => response.json())
    }

    // Returns the wishlist
    module.getWishlist = function (wishlistId) {
        // The credentials option makes sure that the browsers cookies
        // are sent back and forth during a request
        let options = {
            credentials: 'include'
        }

        return fetch('/api/wishlist/' + wishlistId, options)
        .then(response => response.json())
    }

    // Returns the wishes array
    module.getWishes = function (wishlistId, ) {
        // The credentials option makes sure that the browsers cookies
        // are sent back and forth during a request
        let options = {
            credentials: 'include'
        }

        return fetch('/api/wishes?id=' + wishlistId, options)
        .then(response => response.json())
    }

    module.getURLParams = function () {
        var query = location.search.substr(1);
        var result = {};
        query.split("&").forEach(function(part) {
            var item = part.split("=");
            result[item[0]] = decodeURIComponent(item[1]);
        });
        return result;
    }

    // Search wishlist array
    module.searchWishlists = function (wishlists, searchString) {
        let search = new RegExp(searchString, 'i')

        return {
            results: wishlists.filter(w => {
                return w.wishlist.listname.search(search) > -1
            })
        }
    }

    // Display search results from wishlist array
    module.displaySearchResults = function (wishlists) {
        frontend.displaySearchResults(wishlists)
    }

    // Checking authentication
    module.authed = function (wishlist) {
        let options = {
            credentials: 'include'
        }

        return fetch('/api/authed', options)
        .then(response => response.text())
        .then(response => {
            console.log(response);
            // if not signed in, go to signin page
            if (response == 'UNAUTH') {
                window.location.href = '/signin.html';
            }
        });
    }    

    //////////  SOCKET  //////////

    // Function which sets up listeners for Socket.io events
    // And loads initial items to the chat window
    function initialize() {
        // Setup the socket
        let socket = io()

        if (typeof window.initializeView !== 'undefined') {
            window.initializeView(socket, frontend, module);
        }

        const signout = document.getElementById('signout');
        
        if (signout != null) {
            signout.addEventListener('click', function () {
                let options = {
                    method: 'post',
                    credentials: 'include'
                }

                fetch('/api/signout', options)
                    .then(response => response.json())
                    .then(response => {
                        if (response.status === 'OK') {
                            window.location.href = '/';
                        } else {
                            alert(response.message)
                        }
                    })
                    .catch((error) => {
                        console.log(error);
                    })
            });
        }

        //Check authentication for all other pages than signin and signup
        if (window.location.href.indexOf('signin.html') === -1 && window.location.href.indexOf('signup.html') === -1) {
            module.authed();
        }
    }

    // Run the initialize function
    initialize()

    return module
})()//END of module









