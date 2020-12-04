"use strict";

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//$(async function() {}) /same as $(document.ready(function(){}))
//all code on this page is inside this function
//
$(async function () {
  // ---------------------initialization---------------------
  // "global" variables
  //
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navLogin = $("#nav-login");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;
  //------------------------------------------------------------------
  //                       Start Logic
  //
  // wait for 'check if logged in' function to complete before continuing
  await checkIfLoggedIn();

  //^^^^^^^^^^^^^^^^^^^^^^EVENT LISTENERS^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //

  //------------------------------------------------------------------
  // event listener for submit link in user nav menu
  //
  $("#nav-submit").on("click", function (event) {
    $submitForm.slideToggle(); //show story form
  });
  //------------------------------------------------------------------
  // event listener for favorites link in user nav menu
  //
  $("#nav-favorites").on("click", function (event) {
    hideElements();
    if (currentUser) {
      generateFavs();
      $("#favorited-articles").show();
    }
  });
  //------------------------------------------------------------------
  // event listener for my-stories link in user nav menu
  //
  $("#nav-my-stories").on("click", function (event) {});
  //------------------------------------------------------------------
  //event listener for create story form submit
  //
  $submitForm.on("submit", async function (event) {
    event.preventDefault();
    $submitForm.toggle();
    //retrive form data
    const title = $("#title").val();
    const url = $("#url").val();
    const hostName = getHostName(url);
    const author = $("#author").val();
    const username = currentUser.username;

    //make story object
    const newAPIStory = await storyList.addStory(currentUser, {
      author,
      title,
      url,
    });
    //
    // add new story to html
    const $li = $(`
<li id="${newAPIStory.storyId}" class="id-${newAPIStory.storyId}">
<span class="star">
<i class="far fa star"></i>
</span>
<a class="article-link" href="${url}" target="a_blank" 
<strong>${title}</strong>
</a>
<small class="article-hostname ${hostName}">(${hostName})</small>
<small class="article-author">by ${author}</small>
<small class="article-username">posted by ${username}</small>
</li>
`);
    $allStoriesList.prepend($li);
  });
  //------------------------------------------------------------------
  //Event listener for logging in
  //
  /**
   * Event listener for logging in.
   *  If successfully we will setup the user instance
   */

  $loginForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page-refresh on submit

    // grab the username and password
    const username = $("#login-username").val();
    const password = $("#login-password").val();

    // call the login static method to build a user instance
    const userInstance = await User.login(username, password);
    // set the global user to the user instance
    currentUser = userInstance;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    showProfileInfo(currentUser);
  });
  //------------------------------------------------------------------
  //Event listener for signing up
  //
  /**
   * Event listener for signing up.
   *  If successfully we will setup a new user instance
   */

  $createAccountForm.on("submit", async function (evt) {
    evt.preventDefault(); // no page refresh

    // grab the required fields
    let name = $("#create-account-name").val();
    let username = $("#create-account-username").val();
    let password = $("#create-account-password").val();

    // call the create method, which calls the API and then builds a new user instance
    const newUser = await User.create(username, password, name);
    currentUser = newUser;
    syncCurrentUserToLocalStorage();
    loginAndSubmitForm();
    showProfileInfo(currentUser);
  });
  //------------------------------------------------------------------
  //Log Out Functionality
  //
  /**
   * Log Out Functionality
   */

  $navLogOut.on("click", function () {
    // empty out local storage
    localStorage.clear();
    // refresh the page, clearing memory
    location.reload();
  });
  //------------------------------------------------------------------
  //Event Handler for Clicking Login
  //
  /**
   * Event Handler for Clicking Login
   */

  $navLogin.on("click", function () {
    // Show the Login and Create Account Forms
    $loginForm.slideToggle();
    $createAccountForm.slideToggle();
    $allStoriesList.toggle();
  });
  //------------------------------------------------------------------
  //*Event handler for Navigation to Homepage
  //
  /**
   * Event handler for Navigation to Homepage
   */

  $("body").on("click", "#nav-all", async function () {
    hideElements();
    await generateStories();
    $allStoriesList.show();
    if (currentUser) {
      showProfileInfo(currentUser);
    }
  });
  //------------------------------------------------------------------
  //add / remove article to / from favorites
  //
  $(".articles-container").on("click", ".star", async function (event) {
    if (currentUser) {
      const $target = $(event.target);
      const $closestLi = $(event.target.closest("li"));
      const storyId = $closestLi.attr("id");
      //
      if ($target.hasClass("fas")) {
        await currentUser.removeFavorite(storyId);
      } else {
        await currentUser.addFavorite(storyId);
      }
      $target.closest("i").toggleClass("fas far");
    }
  });

  //------------------------------------------------------------------
  //^^^^^^^^^^^^^^^^^^^^^^^^^^^FUNCTIONS^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //
  function generateFavs() {
    // empty out the list by default
    $("#favorited-articles").empty();

    // if the user has no favorites
    if (currentUser.favorites.length === 0) {
      $("#favorited-articles").append("<h5>No favorites added!</h5>");
    } else {
      // for all of the user's favorites
      for (let story of currentUser.favorites) {
        // render each story in the list
        let favoriteHTML = generateStoryHTML(story, false, true);
        $("#favorited-articles").append(favoriteHTML);
      }
    }
  }
  //------------------------------------------------------------------
  //checkIfLoggedIn()
  //
  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();

    if (currentUser) {
      showNavForLoggedInUser();
      showProfileInfo(currentUser);
    }
  }
  //------------------------------------------------------------------
  //loginAndSubmitForm()
  //
  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }
  //------------------------------------------------------------------
  //generateStories()
  //
  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
    }
  }
  //------------------------------------------------------------------
  //generateStoryHTML(story)
  //called by generateStories()
  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story, isOwnStory = false) {
    let hostName = getHostName(story.url);
    let starType = isFavorite(story) ? "fas" : "far";

    // render a trash can for deleting your own story
    const trashCanIcon = isOwnStory
      ? `<span class="trash-can">
          <i class="fas fa-trash-alt"></i>
        </span>`
      : "";

    // render all the rest of the story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
        ${trashCanIcon}
        <span class="star">
          <i class="${starType} fa-star"></i>
        </span>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
          </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }
  //------------------------------------------------------------------
  //hideElements()
  //
  /* hide all elements in elementsArr */
  /* used when Hack or Snooze logo clicked */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm,
    ];
    elementsArr.forEach(($elem) => $elem.hide());
  }
  //------------------------------------------------------------------
  //showNavForLoggedInUser()
  //
  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();
    //add user name in front of logout prompt
    $("#nav-logout").children().text(`${currentUser.username} (logout)`);
    //show user nav menu after user is logged in
    $("#user-nav-menu").show();
  }
  //------------------------------------------------------------------
  //getHostName(url)
  //
  /* simple function to pull the hostname from a URL */
  // called only by generateStoryHTML

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }
  //------------------------------------------------------------------
  //syncCurrentUserToLocalStorage()
  //
  /* sync current user information to localStorage */
  // used after login or account creation

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }

  //------------------------------------------------------------------
  //  displays profile info at page bottom
  //
  function showProfileInfo(currentUser) {
    if ($("#profile-name").text() === "Name:") {
      $("#profile-name").text(
        $("#profile-name")
          .text()
          .concat(" " + currentUser.name)
      );
      $("#profile-username").text(
        $("#profile-username")
          .text()
          .concat(" " + currentUser.username)
      );
      $("#profile-account-date").text(
        $("#profile-account-date")
          .text()
          .concat(" " + currentUser.createdAt)
      );
    }
  }
  //------------------------------------------------------------------
  function isFavorite(story) {
    let favStoryIds = new Set();
    if (currentUser) {
      favStoryIds = new Set(currentUser.favorites.map((obj) => obj.storyId));
    }
    return favStoryIds.has(story.storyId);
  }

  function generateMyStories() {
    $ownStories.empty();

    // if the user has no stories that they have posted
    if (currentUser.ownStories.length === 0) {
      $ownStories.append("<h5>No stories added by user yet!</h5>");
    } else {
      // for all of the user's posted stories
      for (let story of currentUser.ownStories) {
        // render each story in the list
        let ownStoryHTML = generateStoryHTML(story, true);
        $ownStories.append(ownStoryHTML);
      }
    }

    $ownStories.show();
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
});
