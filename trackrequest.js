var TrackRequestBg = {

  /**
   * We need notification ID to control when it should be hidden.
   *
   * @private
   */
  notificationId: "AffiliateTracker_notif",

  merchantRe: RegExp([  /* Amazon sites */
                       '(amazon\\.(com|de|at|ca|cn|fr|it|co\\.jp|es|co\\.uk))',
                       '|(joyo\\.com)',
                       '|(amazonsupply\\.com)',
                       '|(javari\\.(co\\.uk|de|fr|jp))',
                       '|(buyvip\\.com)',

                       /* Hosting sites*/
                       '|tracking\\.(hostgator\\.com)', //Hostgator
                       '|(godaddy\\.com).*Commission.*Junction', //GoDaddy
                       '|(dreamhost\\.com)\\/redir\\.cgi\\?ad=rewards\\|\\d+',
                       '|(bluehost\\.com)\\/',
                       '|(justhost\\.com)\\/',
                       '|(hostmonster\\.com)\\/',
                       '|(hosting24\\.com)\\/',
                       '|(inmotionhosting.com)\\/',
                       '|(ipage.com)\\/',
                       '|(fatcow.com)\\/',
                       '|(webhostinghub.com)\\/',
                       '|(ixwebhosting.com)\\/',
                       '|(webhostingpad.com)\\/',
                       '|(hostrocket.com)\\/',
                       '|(arvixe.com)\\/',
                       '|(startlogic.com)\\/',
                       '|(bizland.com)\\/',
                       '|(ipower.com)\\/'].join(''), 'i'),

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
      } else if (merchant.indexOf("bluehost") != -1 ||
                 merchant.indexOf("justhost") != -1 ||
                 merchant.indexOf("hostmonster") != -1) {
        // arg is cookie. Cookie usually takes one of two forms (I think):
        //    r=<affId>^<campaignId>^<srcUrl>
        //    or
        //    r=cad^<affId>^<randomString>
        // The cookies are URL encoded and ^ is %5E.
        if (arg.indexOf("r=cad") == 0) {
          return arg.split("%5E", 2)[1];
        } else {
          return arg.split("%5E", 1)[0];
        }
      } else if (merchant == 'hosting24.com' ||
                merchant == 'inmotionhosting.com' ||
                merchant == 'webhostinghub.com' ||
                merchant == 'ixwebhosting.com') {
          // arg is cookie like aff=<id>;... for hosting24
          // and affiliates=<id> for inmotionhosting.
          // and refid=<id> for webhostinghub.com.
          // and IXAFFILIATE=<id for ixwebhosting.com
          return arg.split(";")[0].split("=")[1];
      } else if (merchant == 'ipage.com' ||
                 merchant == 'fatcow.com'||
                 merchant == 'startlogic.com' ||
                 merchant == 'bizland.com' ||
                 merchant == 'ipower.com') {
        // arg is cookie like "AffCookie=things&stuff&AffID&655061&more&stuff"
        var affIndex = arg.indexOf("AffID&");
        return arg.substring(affIndex + 6, arg.indexOf("&", affIndex + 7));
      } else if (merchant == "webhostingpad.com" ||
                 merchant == "hostrocket.com" ||
                 merchant == "arvixe.com") {
        // webhostingpad: idev=<affid>----------<urlencodedreferrer>
        // hostrocket.com: idev=<affid>-<referrer>------<hostrocketURL>
        // arvixe.com idev=<affid>-<referrer>-------<arvixeURL>
        return arg.substring(arg.indexOf("=") + 1, arg.indexOf("-"));
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
    if(setter.merchantRe.test(details.url)) {
      details.url.match(setter.merchantRe).forEach(function(matched, index) {
        if (index != 0 && typeof matched != "undefined") {
            merchant = matched;
        }
      });
    }
    if (merchant != "") {
      var submissionObj = setter.merchant[details.requestId];
      // Amazon.com's UserPref cookie is an affiliate cookie.
      details.responseHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "set-cookie") {
          // TODO: use a map for these. This is silly
          if ((amazonSites.indexOf(merchant) != -1 &&
               header.value.indexOf("UserPref=") ==0 ) ||
              (merchant.indexOf("hostgator") != -1 &&
               header.value.indexOf("GatorAffiliate=") == 0) ||
              //(merchant.indexOf("godaddy") != -1 /* We will pares more than one cookie for godaddy*/) ||
              (merchant.indexOf("dreamhost") != -1 &&
               header.value.indexOf("referred=") == 0) ||
              // Bluehost 301 redirects from tracking URL to bluehost.com and
              // sends 2 cookies called r. The one set for .bluehost.com is
              // empty. The real cookie is the one set for www.bluehost.com.
              (merchant.indexOf("bluehost") != -1 &&
               header.value.indexOf("r=") == 0 &&
               header.value.indexOf("domain=.bluehost.com;") == -1) ||
              (merchant.indexOf("justhost") != -1 &&
               header.value.indexOf("r=") == 0 &&
               header.value.indexOf("domain=.justhost.com;") == -1) ||
              (merchant.indexOf("hostmonster") != -1 &&
               header.value.indexOf("r=") == 0 &&
               header.value.indexOf("domain=.hostmonster.com;") == -1) ||
              (merchant.indexOf("hosting24") != -1 &&
               header.value.indexOf("aff=") == 0) ||
              (merchant == "inmotionhosting.com" &&
               header.value.indexOf("affiliates") != -1) ||
              ((merchant == "ipage.com" || merchant == "fatcow.com" ||
                merchant == "startlogic.com" || merchant == "bizland.com" ||
                merchant == "ipower.com") &&
               header.value.indexOf("AffCookie=") != -1) ||
              (merchant == 'webhostinghub.com' &&
               header.value.indexOf("refid") != -1) ||
              (merchant == 'ixwebhosting.com' &&
               header.value.indexOf("IXAFFILIATE=") != -1) ||
              ((merchant == "webhostingpad.com" ||
                merchant == "hostrocket.com" ||
                merchant == "arvixe.com") &&
               header.value.indexOf("idev") == 0)
              ) {
            var arg = "";
            if (amazonSites.indexOf(merchant) != -1) {
              // Amazon's affiliate id does not show up in the Cookie.
              arg = details.url;
            } else {
              arg = header.value;
            }
            var affId = setter.parseAffiliateId(merchant, arg);
            var cookie = header.value;
            var cookieVal = (cookie.indexOf(";") == -1) ?
                             cookie.substring(cookie.indexOf("=")) :
                             cookie.substring(cookie.indexOf("=") + 1,
                                              cookie.indexOf(';'));
            // We don't send the cookie to our server, but check that the
            // cookie we recorded is the one user still has before displaying
            // it.
            submissionObj["cookie"] = cookieVal;
            submissionObj["cookieHash"] = CryptoJS.MD5(cookieVal).toString(CryptoJS.enc.Hex);

            var cookieDomain = "";
            if (cookie.indexOf("domain=") != -1) {
              var domainStart = cookie.indexOf("domain=");
              if (cookie.indexOf(";", domainStart) == -1) {
                // domain= is not terminated by ; because it's at the end.
                cookieDomain = cookie.substring(domainStart + 7);
              } else {
                cookieDomain = cookie.substring(domainStart+ 7, cookie.indexOf(";", domainStart));
              }
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
                submissionObj["frameProperties"] = setter.getFrameProperties(
                    details.url, details.type, details.tabId);
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
    if(setter.merchantRe.test(details.url)) {
      details.url.match(setter.merchantRe).forEach(function(matched, index) {
        if (index != 0 && typeof matched != "undefined") {
            merchant = matched;
        }
      });
    }
    if (merchant != "") {
      var newSubmission = {};
      newSubmission["merchant"] = merchant;
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
      console.log("created mew submission object with request: " + details.requestId);
      // If nothing comes of this request, delete all stored information
      // about it after 3 min.
      setTimeout(function() {
        if (setter.merchant.hasOwnProperty(details.requestId)) {
          // Delete this object either way
          console.log("deleting request id: " + details.requestId);
          delete setter.merchant[details.requestId];
          }
      }, 180000);

      details.requestHeaders.forEach(function(header) {
        // Ignore amazon redirects to itself.
        // For Go Daddy, we'll end up over-writing some of these values in
        //   response because CJ makes things complicated with a lot of
        //   redirects.
        if (header.name.toLowerCase() === "referer") {
          if (!amazonSites.indexOf(merchant) != -1 || !setter.merchantRe.test(header.value))
            newSubmission["referer"] = header.value;

          }
        });
      };
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
