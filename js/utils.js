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
        uploadUrl = "http://angelic.ucsd.edu:5000/upload-extensions";
        break;
      case "cookie":
        //ATBg.log(data);
        uploadUrl = "http://angelic.ucsd.edu:5000/upload-cookies";
        ATBg.log("\n\n");
        break;
      default:
        console.error("Invalid datatype for sendXhr()");
        return;
    }
    // Send
    var xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);
    xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    if (!ATBg.debug) {
      xhr.send(data);
    }
  },

  /**
   * Returns promise of a cookie corresponding to url and name.
   */
  getCookie: function(url, name) {
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
          if (typeof tab !== "undefined" && typeof tab !== null) {
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

}
