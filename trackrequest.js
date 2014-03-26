var TrackRequestBg = {


  /**
   * We need notification ID to control when it should be hidden.
   *
   * @private
   */
  notificationId: "AffiliateTracker_notif",

  /**
   * Regex to pull out the amazon site name. We call this merchant site.
   *
   * @private
   */
  amazonRegex: /(amazon\.(com|de|at|ca|cn|fr|it|co\.jp|es|co\.uk))|(joyo\.com)|(amazonsupply\.com)|(javari\.(co\.uk|de|fr|jp))|(buyvip\.com)/i,

  /**
   * Matches Hostgator URL while pulling the domain out.
   *
   * @private
   */
  hostgatorRegex: /tracking\.(hostgator\.com)/i,

  /**
   * User ID key. True across all extensions.
   *
   * @private
   */
  userIdKey: "AffiliateTracker_userId",

  /**
   * Generate user ID for this user. Takes a hash of a random number
   * concatenated with the timestamp. We only generate a user id if
   * one doesn't exist already.
   *
   * @return {object} UserId object {key:value}
   */
  generateUserId: function() {
    var userId = new String(Math.floor(Math.random()*10+1)) + new String(new Date().getTime());
    var storageObj = {};
    storageObj[this.userIdKey] = CryptoJS.MD5(userId).toString(CryptoJS.enc.Hex);
    return storageObj;
  },

  /**
   * Parses out affiliate ID.
   *
   * @param {string} merchant Merchant name in lower case.
   * @param {string} arg Either a URL or cookie depending on the merchant.
   * @return {string} Affiliate's ID.
   * @private
   */
  parseAffiliateId: function(merchant, arg) {
      if (amazonSites.indexOf(merchant) !== -1) {
        // Treat arg as URL.
        var url = arg;
        var args = url.substring(url.lastIndexOf("/") + 1);
        if (args.indexOf("&") === -1 && args.indexOf("?") === -1) {
          // When a UserPref cookie is received in these cases,
          // the affiliate parameter is the last bit after the /
          return args;
        }
        if (args.indexOf("tag=") != -1) {
          var tagIndex = args.indexOf("tag=");
          args = args.substring(tagIndex + 4);
          if (args.indexOf("&") != -1) {
            return args.substring(0, args.indexOf("&"));
          } else {
            return args;
          }
        };
      } else if (merchant.indexOf("hostgator") != -1) {
        // Treat arg as cookie value.
        // Split cookie value on semi-colon, take the first break which looks
        //   like number.affId
        return arg.split(";", 1)[0].split(".")[1];
      }
  },

  /**
   * Finds the frame with corresponding URL and extracts its properties.
   *
   * @param {string} url URL to be matched to the src property of frame and img elements.
   * @param {string} frameType Type of frame as indicated by webRequest details object.
   * @param {string} tabId Tab where the content_script will look for frames.
   * @return {object} Object containing "size" and "style" fields.
   * @private
   */
  getFrameProperties: function(url, frameType, tabId) {
    console.log("trying to get frame properties for " + url + " frame: " + frameType + " for tab: " + tabId);
    var properties = {};
    if (frameType != 'main_frame') {
      chrome.tabs.sendMessage(tabId, {"method": "getFrame", "frameType": frameType}, function(response) {
        console.log(response);
        //properties = response.data;
      });
    }
    return properties;
  },


  /**
   * Callback for headers received events. Searches for Set-Cookie header
   * and parses out the affiliate ID.
   *
   * @param{Webrequest} details
   */
  responseCallback: function(details) {
    var setter = TrackRequestBg;
    // Look for any Amazon site
    var amazonMatch = details.url.match(setter.amazonRegex);
    var hostgatorMatch = details.url.match(setter.hostgatorRegex);
    var merchant = "";
    if(typeof amazonMatch != "undefined" && amazonMatch != null && amazonMatch.length > 0) {
      merchant = amazonMatch[0];
    }
    if (typeof hostgatorMatch != "undefined" && hostgatorMatch != null && hostgatorMatch.length > 0) {
      merchant = hostgatorMatch[1];
      console.log(merchant);
      console.log("found merchant in response headers");
    }
    if (merchant != "") {
      console.log("well we have a merchant: " + merchant);
      var submissionObj = setter.merchant[details.requestId];
      console.log("looking for a response with request id : " + details.requestId);
      console.log("and the submission obj: ");
      console.log(submissionObj);
      console.log("looking at details object: ");
      console.log(details);
      // Amazon.com's UserPref cookie is an affiliate cookie.
      details.responseHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "set-cookie") {
          console.log("got set cookie for " + merchant);
          if ((amazonSites.indexOf(merchant) != -1 && header.value.indexOf("UserPref=") ==0 ) ||
              (merchant.indexOf("hostgator") != -1 && header.value.indexOf("GatorAffiliate=") == 0)) {
            var arg = "";
            console.log("request matches hostgator gatoraffiliate cookie");
            if (amazonSites.indexOf(merchant) != -1) {
              // Amazon's affiliate id does not show up in the Cookie.
              arg = details.url;
            } else if (merchant.indexOf ("hostgator") != -1) {
              arg = header.value;
            }
            var affId = setter.parseAffiliateId(merchant, arg);
            console.log("affiliate id: " + affId);
            var cookie = header.value;
            var cookieVal = cookie.substring(cookie.indexOf("=") + 1, cookie.indexOf(';'));
            // We don't send the cookie to our server, but check that the cookie we
            // recorded is the one user still has before displaying it.
            submissionObj["cookie"] = cookieVal;

            submissionObj["cookieHash"] = CryptoJS.MD5(cookieVal).toString(CryptoJS.enc.Hex);

            console.log("cookie: " + cookie);
            var cookieDomain = "";
            if (cookie.indexOf("domain=") != -1) {
              var domainStart = cookie.indexOf("domain=");
              cookieDomain = cookie.substring(domainStart+ 7, cookie.indexOf(";", domainStart));
            } else {
              // If not specified, the domain of the cookie is the domain of url.
              var domainStart = details.url.indexOf("//") + 2;
              cookieDomain = details.url.substring(domainStart, details.url.indexOf("/", domainStart));
            }
            console.log("cookie domain: " + cookieDomain);
            submissionObj["cookieDomain"] = cookieDomain;

            var pathStart = cookie.indexOf("path=");
            var cookiePath = cookie.substring(pathStart + 5, cookie.indexOf(";", pathStart));
            submissionObj["cookiePath"] = cookiePath;

            chrome.storage.sync.get(setter.userIdKey, function(result) {
              if (result.hasOwnProperty(setter.userIdKey)) {
                submissionObj["userId"] = result[setter.userIdKey];
              }
            });

            submissionObj["affId"] = affId;
            submissionObj["type"] = details.type;
            // In case of main frame, this is the same as landing URL.
            submissionObj["originFrame"] = details.url;
            submissionObj["timestamp"] = details.timeStamp;
            // We actually only care about the last cookie value written, so this over-writes.
            var storeObj = {};
            var storage_key = "AffiliateTracker_" + merchant;
            storeObj[storage_key] = {"affiliate" : affId,
                                      "cookie": cookieVal,
                                      "origin": submissionObj["landing"], //TODO: this is confusing
                                      "cookieDomain": submissionObj["cookieDomain"],
                                      "cookiePath": submissionObj["cookiePath"]};
            chrome.storage.sync.set(storeObj, function() {console.log("saved");});

            // We need the DOM element to be rendered to get its properties.
            // Sadly there is no reliable to do this. If the element is
            // already deleted within 3 seconds, we are out of luck.
            setTimeout(function() {
              if (submissionObj.hasOwnProperty("cookie")) {
                submissionObj["frameProperties"] = setter.getFrameProperties(details.url, details.type, details.tabId);
                // Before sending the data, remove the cookie value from the object
                // for privacy reasons.
                delete submissionObj["cookie"];
                var xhr = new XMLHttpRequest();
                //xhr.open("POST", "http://127.0.0.1:5000/upload");
                xhr.open("POST", "http://secret-sea-1620.herokuapp.com/upload");
                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhr.send(JSON.stringify(submissionObj));
                // TODO: maybe check for success of xhr
              }
              // Delete this object either way
              delete submissionObj;
            }, 3000);

            setter.cookieCounter += 1;
            var notificationOpts = { type: 'basic',
                iconUrl: 'icon.png',
                title: merchant + " cookie",
                message: "From " + submissionObj["landing"]
              }
            chrome.notifications.update(
              setter.notificationId, notificationOpts, function(wasUpdated) {
                  if (!wasUpdated) {
                    chrome.notifications.create(setter.notificationId,
                        notificationOpts, function() {});
                  }
              });
            setTimeout(function(){
                chrome.notifications.clear(setter.notificationId, function() {});
            }, 3000);
          }
        }
      });
    }
  },


  /**
   * Callback for when a request is about to be made. We get the request
   * headers here and pull out the referer.
   *
   * @param{Webrequest} details
   */
  requestCallback: function(details) {
    var setter = TrackRequestBg;
    if (typeof setter.merchant == "undefined" || setter.merchant == null) {
      // All merchant requests are placed within 1 object.
      setter.merchant = {};
    }
    var amazonMatch = details.url.match(setter.amazonRegex);
    var hostgatorMatch = details.url.match(setter.hostgatorRegex);
    var merchant = "";
    if (setter.amazonRegex.test(details.url) | setter.hostgatorRegex.test(details.url)) {
      if(typeof amazonMatch != "undefined" && amazonMatch != null && amazonMatch.length > 0) {
        merchant = amazonMatch[0];
      } else if (typeof hostgatorMatch != "undefined" && hostgatorMatch != null &&
                hostgatorMatch.length > 0) {
        merchant = hostgatorMatch[1];
        console.log(hostgatorMatch);
      }
      var newSubmission = {};
      details.requestHeaders.forEach(function(header) {
        // Ignore amazon redirects to itself.
        if (header.name.toLowerCase() === "referer") {
          if ((setter.amazonRegex.test(merchant) && !setter.amazonRegex.test(header.value)) ||
              merchant.indexOf("hostgator") != -1) {
            newSubmission["merchant"] = merchant;
            newSubmission["referer"] = header.value;
            chrome.tabs.get(details.tabId, function(tab) {
              newSubmission["origin"] = tab.url;
              newSubmission["landing"] = tab.url;
              if (tab.hasOwnProperty("openerTabId")) {
                chrome.tabs.get(tab.openerTabId, function(openerTab) {
                  newSubmission["origin"] = openerTab.url;
                  newSubmission["newTab"] = true;
                });
              } else {
                newSubmission["newTab"] = false;
              }
            });
            // Chrome makes sure request ids are unique.
            setter.merchant[details.requestId] = newSubmission;
            console.log("created new submissin obj for request id: " + details.requestId);
          }
        }
      });
    }
  },
};



// There is an inherent assumption that onSendHeaders is fired before
//   onHeadersReceived. We're talking networks here, so it would be odd if
//   this assumption is violated.

/**
 * Analyze all responses. While the filter allows all URLs here, the manifest
 * restricts analysis to only merchant URLs.
 */
chrome.webRequest.onHeadersReceived.addListener(
    TrackRequestBg.responseCallback, {urls: ["<all_urls>"]},
    ["responseHeaders"]);

chrome.webRequest.onSendHeaders.addListener(
    TrackRequestBg.requestCallback, {urls: ["<all_urls>"]},
    ["requestHeaders"]);

// If this user does not have a user Id, generate one.
chrome.storage.sync.get(TrackRequestBg.userIdKey, function(result) {
  var setter = TrackRequestBg;
  if (!result.hasOwnProperty(setter.userIdKey)) {
    var newIdObj = setter.generateUserId();
    chrome.storage.sync.set(newIdObj, function() {console.log("created user id");});
  }
});
