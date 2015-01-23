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
        uploadUrl = "http://angelic.ucsd.edu:5000/upload-ext-data";
        break;
      case "cookie":
        //ATBg.log(data);
        uploadUrl = "http://angelic.ucsd.edu:5000/upload-cookie-data";
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
            var storageObj = {
              storage_key: ATBg.userId
            };
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
};
