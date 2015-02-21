ATUtils = {

  /**
   * Sends an string to server asynchronously. Picks the URL to upload to
   * depending on the datatype which is one of "extension" or "cookie".
   * Does not send data when debug flag is set.
   *
   * @param{string} data JSON encoded string to be sent to server.
   * @param{string} datatype The kind of data: "extension" or "cookie".
   */
  sendXhr: function(data, datatype) {
    var uploadUrl = null;
    switch (datatype) {
      case "extension":
        if (ATBg.debug) {
          uploadUrl = "http://affiliatetracker.ucsd.edu:5000/upload-extensions";
        } else {
          uploadUrl = "http://affiliatetracker.ucsd.edu/upload-extensions";
        }
        break;
      case "cookie":
        if (ATBg.debug) {
          uploadUrl = "http://affiliatetracker.ucsd.edu:5000/upload-cookies";
        } else {
          uploadUrl = "http://affiliatetracker.ucsd.edu/upload-cookies";
        }
        break;
      default:
        console.error("Invalid datatype for sendXhr()");
        return;
    }
    // Send
    var xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);
    // According to http://goo.gl/QA29gY charset need not be specified.
    xhr.setRequestHeader("Content-Type", "application/json;");
    xhr.send(data);
  },

  /**
   * Returns promise of a cookie corresponding to url and name.
   */
  getCookie: function(url, name) {
    console.log("Trying to get cookie for name, url: ", name, url);
    console.assert(typeof url === "string", "URL should be string");
    console.assert(typeof name === "string", "Cookie name should be string");
    return new Promise(function(resolve, reject) {
      chrome.cookies.get({"url": url, "name": name}, function(cookie) {
        console.log("Resolving get cookie with: ", cookie);
        resolve(cookie);
      });
    });
  },

  /**
   * Returns a resolved promise when a userid is created.
   *
   * @public
   */
  getUserId: function() {
    return new Promise(function(resolve, reject) {
      if (!this.userId) {
        chrome.storage.sync.get(AT_CONSTANTS.USER_ID_STORAGE_KEY,
            function(result) {
          if (!result.hasOwnProperty(AT_CONSTANTS.USER_ID_STORAGE_KEY)) {
            ATBg.userId = ATUtils.generateUserId();
            var storage_key = AT_CONSTANTS.USER_ID_STORAGE_KEY;
            // Don't create an object = {key: value} where key is a variable.
            var storageObj = {};
            storageObj[storage_key] = ATBg.userId;
            chrome.storage.sync.set(storageObj, function() {
              //console.log("created user id");
              resolve(ATBg.userId);
            });
          } else {
            ATBg.userId = result[
                AT_CONSTANTS.USER_ID_STORAGE_KEY];
            resolve(ATBg.userId);
          }
        });
      }
    });
  },


  /**
   * Generate a new identifier for this user. Takes a hash of a random number
   * concatenated with the timestamp. We only generate a user id if one doesn't
   * exist already. Don't call this function directly, call getUserId() instead
   * which calls this if necessary.
   *
   * @return {string} Unique identifier
   * @private
   */
  generateUserId: function() {
    var userId = new String(Math.floor(Math.random()*10+1)) +
                            new String(new Date().getTime());
    var storageObj = {};
    var hash = CryptoJS.MD5(userId).toString(CryptoJS.enc.Hex);
    console.assert(typeof hash === "string",
        "Created userid should be string");
    return hash;
  },


  /**
   * Filters and returns headers of a particular type.
   *
   * @param{object} headers Headers object with name:value pairs.
   * @param{string} name Name of header to filter on like "set-cookie".
   */
  getHeadersForName: function(headers, name) {
    name = name.toLowerCase();
    return headers.filter(function(header) {
      return header.name.toLowerCase() === name;
    });
  },


  /**
   * Promise to return tab if it's loaded completely. In rejection return the
   * tab if it's loading. If there's an error, rejection gets null or
   * undefined.
   *
   * @param{string} tabId
   * @param{sub} submission object that cares for the tab.
   * @returns {promise}
   */
  getTabReady: function(tabId, sub) {
    return new Promise(function(resolve, reject) {
      if (tabId >= 0 && !chrome.runtime.lastError) {
        chrome.tabs.get(tabId, function(tab) {
          if (chrome.runtime.lastError) {
            console.warn("Error getting tab: ", chrome.runtime.lastError.message);
          } else if (typeof tab !== "undefined" && typeof tab !== null) {
            if (tab.status === "complete") {
              resolve(tab);
            } else {
              reject();
            }
          } else {
            reject();
          }
        });
      }
    });
  },

/**
 * Promise is to send message to tabid and return response.
 *
 * @param{string} tabId Tab to send message to.
 * @param{object} message Object which forms message.
 * @returns{promise}
 */
  getMessageResponse: function(tabId, message) {
    return new Promise(function(resolve, reject) {
      chrome.tabs.sendMessage(tabId, message, function(response) {
        resolve(response);
      });
    });
  },

  /**
   * Returns promise for local storage objects that this extension has stored.
   */
  getLocalStoreObjects: function() {
    return new Promise(function(resolve, reject) {
      chrome.storage.sync.get(null, function(objects) {
        console.log("chrome gave me: ", objects);
        resolve(objects);
      });
    });
  },


  /**
   * Deletes the local storage object if no matching cookie is found.
   * Returns promise.
   */
  deleteIfInvalid: function(key, object) {
    return new Promise(function(resolve, reject) {
      var domain = object.cookieDomain;
      var name = object.cookieName;
      domain = domain && domain.indexOf(".") === 0 ? "http://www" + domain :
         "http://" + domain;

      ATUtils.getCookie(domain, name).then(function(cookie) {
        if (cookie === null) {
          console.log('Cookie missing, deleting key: ', key);
          chrome.storage.sync.remove(key, function() {});
        } else {
        }
        resolve("Deleted");
      });
    });
  },


  /**
   * Removes all the data this extension stored in local storage, except user
   * id. Resolves because it is a promise.
   */
  cleanUpLocalStorage: function() {
    return new Promise(function(resolve, reject) {
      ATUtils.getLocalStoreObjects().then(function(objects) {
        for (key in objects) {
          if (key.indexOf("AffiliateTracker_") === 0 &&
              key !== "AffiliateTracker_userId") {
            ATUtils.deleteIfInvalid(key, objects[key]).then(function() {});
          }
        }
        resolve("Done!");
      })
    });;
  },
}
