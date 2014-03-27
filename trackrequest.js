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
   * Matches GoDaddy URLs. godaddy's international sites are uk.goddady.com, etc.
   * GoDaddy uses CJ as one of their partners.
   *
   * @private
   */
  goDaddyCJRegex: /(godaddy\.com).*Commission.*Junction/i,
  //?isc=cjcho199a&utm_campaign=affiliates_cj_199hst&utm_source=Commission%20Junction&utm_medium=External%2BAffil&utm_content=cjcho199a&cvosrc=affiliate.cj.PID

  /**
   * Match dreamhost URL affiliate URL.
   *
   * @private
   */
  dreamhostRegex: /(dreamhost\.com)\/redir\.cgi\?ad=rewards\|\d+/i,

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
      } else if (merchant.indexOf("dreamhost") != -1) {
        // arg is cookie value of the form rewards|affid
        //   but it is url encoded so it looks like rewards%7C<affid>;...
        return arg.split(";", 1)[0].split("7C")[1];
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
    var merchant = "";
    if(setter.amazonRegex.test(details.url)) {
      merchant = details.url.match(setter.amazonRegex)[0];
    } else if (setter.hostgatorRegex.test(details.url)) {
      merchant = details.url.match(setter.hostgatorRegex)[1];
    } /*else if (setter.goDaddyCJRegex.test(details.url)) {
      merchant = details.url.match(setter.goDaddyCJRegex)[0];
    } */else if (setter.dreamhostRegex.test(details.url)) {
      merchant = details.url.match(setter.dreamhostRegex)[1];
    }
    if (merchant != "") {
      var submissionObj = setter.merchant[details.requestId];
      // Amazon.com's UserPref cookie is an affiliate cookie.
      details.responseHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "set-cookie") {
          if ((amazonSites.indexOf(merchant) != -1 && header.value.indexOf("UserPref=") ==0 ) ||
              (merchant.indexOf("hostgator") != -1 && header.value.indexOf("GatorAffiliate=") == 0) ||
              (merchant.indexOf("godaddy") != -1 /* We will pares more than one cookie for godaddy*/) ||
              (merchant.indexOf("dreamhost") != -1 && header.value.indexOf("referred=") == 0)) {
            var arg = "";
            if (amazonSites.indexOf(merchant) != -1) {
              // Amazon's affiliate id does not show up in the Cookie.
              arg = details.url;
            } else if (merchant.indexOf("hostgator") != -1 ||
                       merchant.indexOf("dreamhost") != -1) {
              arg = header.value;
            } else if (merchant.indexOf("godaddy") != -1 /*TODO*/) {
              arg = header.value;
            }
            var affId = setter.parseAffiliateId(merchant, arg);
            var cookie = header.value;
            var cookieVal = (cookie.indexOf(";") == -1) ? cookie.substring(cookie.indexOf("=")) :
                            cookie.substring(cookie.indexOf("=") + 1, cookie.indexOf(';'));
            // We don't send the cookie to our server, but check that the cookie we
            // recorded is the one user still has before displaying it.
            submissionObj["cookie"] = cookieVal;

            submissionObj["cookieHash"] = CryptoJS.MD5(cookieVal).toString(CryptoJS.enc.Hex);

            var cookieDomain = "";
            if (cookie.indexOf("domain=") != -1) {
              var domainStart = cookie.indexOf("domain=");
              cookieDomain = cookie.substring(domainStart+ 7, cookie.indexOf(";", domainStart));
            } else {
              // If not specified, the domain of the cookie is the domain of url.
              var domainStart = details.url.indexOf("//") + 2;
              cookieDomain = details.url.substring(domainStart, details.url.indexOf("/", domainStart));
            }
            submissionObj["cookieDomain"] = cookieDomain;

            var cookiePath = "";
            if (cookie.indexOf("path=") != -1) {
              var pathStart = cookie.indexOf("path=");
              cookiePath = cookie.substring(pathStart + 5, cookie.indexOf(";", pathStart));
            } else {
              // If not specified the default is the path of the URL setting the cookie.
              //TODO: verify
            }
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

            // TODO: for sites pushing multiple cookies, notifications are't handled well.
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
    var merchant = "";
    if (setter.amazonRegex.test(details.url)) {
      merchant = details.url.match(setter.amazonRegex);
    } else if (setter.hostgatorRegex.test(details.url)) {
      merchant = details.url.match(setter.hostgatorRegex)[1];
    } /*else if (setter.goDaddyCJRegex.test(details.url)) {
      merchant = details.url.match(setter.goDaddyCJRegex)[1];
      console.log("in request godaddy mechant: " + merchant);
    }*/ else if (setter.dreamhostRegex.test(details.url)) {
      merchant = details.url.match(setter.dreamhostRegex)[1];
    }
    if (merchant != "") {
      var newSubmission = {};
      details.requestHeaders.forEach(function(header) {
        // Ignore amazon redirects to itself.
        // For Go Daddy, we'll end up over-writing some of these values in
        //   response because CJ makes things complicated with a lot of
        //   redirects.
        if (header.name.toLowerCase() === "referer") {
          if ((setter.amazonRegex.test(merchant) && !setter.amazonRegex.test(header.value)) ||
              merchant.indexOf("hostgator") != -1 ||
              merchant.indexOf("dreamhost") != -1) {
                //TODO: this is  aproblem for clients that strip referers...
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
