var ATBg = {

  /*
   * Debugging flag. Don't overwhelm logger for others.
   */
  debug: true,

  /**
   * Regular expression used for matching visited merchant URLs for merchants
   * where we have a merchant<->cookieName match.
   *
   * @private
   */
  UrlRe: RegExp([  /* Amazon sites */
                  '(amazon\\.(in|com|de|at|ca|cn|fr|it|co\\.jp|es|co\\.uk))',
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
                  '|(ipower.com)\\/',
                  '|(lunarpages.com)\\/',

                  /* Travel/Booking sites*/
                  '|(hotelscombined.com)\\/',
                  '|brands.(datahc.com)\\/',

                  /* Envato marketplace sites */
                  '|(themeforest.net)\\/',
                  '|(codecanyon.net)\\/',
                  '|(videohive.net)\\/',
                  '|(audiojungle.net)\\/',
                  '|(graphicriver.net)\\/',
                  '|(photodune.net)\\/',
                  '|(3docean.net.net)\\/',
                  '|(activeden.net)\\/',
                  '|(envato.com)\\/',

                  /* Others */
                  '|(hidemyass.com)\\/',
                ].join(''), 'i'),


  /**
   * This expression is used to identify affiliate cookies and to extract an
   * affiliate ID from a cookieName=cookieValue string. Note that groups are
   * used to extract an affiliate ID and the affiliate ID is the last matched
   * group in all cases. If this assumption is violated, the use of this
   * expression must also be altered.
   *
   * @private
   */
  cookieAffRe: RegExp([
            // Amazon.cn uses UserPref=-; to indicate no referral.
            '(UserPref=[^-]+)',
            //Hostgator. The portion after . is aff id.
            '|(GatorAffiliate=\\d+\\.(.+))',

            // Bluehostt, justhost, hostmonster have either
            // Either r=<affId>^<campaignId>^<srcUrl>  or
            // r=cad^<affId>^<randomString>
            // The cookies are URL encoded and ^ is %5E.
            '|(r=cad\\%5E(.+)\\%5E.*)',
            '|(r=(.*)\\%5E.*\\%5E.*)',

            // Hosting24: Aff=id;
            // Inmotionhosting: affiliates=id
            // ixwebhosting.com: IXAFFILIATE=id
            // Webhostinghub.com: refid=id;
            '|((aff|affiliate|IXAFFILIATE|refid)=(.*))',
            // lunarpages.com: lunarsale=id;
            // hidemyass: aff_tag=id
            '|((lunarsale|referal|referred_by|aff_tag)=(.*))',
            // Envato sites: referring_user=id;
            // Hotelscombined: a_aid=id;
            '|((referring_user|aff|WHMCSAffiliateID)=(.*))',
            '|((amember_aff_id|a_aid)=(.*))',
            //ShareASale
            '|(MERCHANT=(.*))',

            //ipage.com, fatcow.com, startlogic.com, bizland.com, ipower.com:
            //AffCookie=things&stuff&AffID&655061&more&stuff
            '|(AffCookie=.*&AffID&(\\w+)&.*)',

            //dreamhost.com: referred=rewards|id
            //It is sometimes URL encoded, so | is %7C
            '|(referred=rewards(\\%7C|\\|)(.*))',

            //idev belongs to the idev affiliate program.
            //Appears in a few forms
            //idev=id
            '|(idev=([^-]*))',
            // webhostingpad: idev=<affid>----------<urlencodedreferrer>
            // hostrocket.com: idev=<affid>-<referrer>------<hostrocketURL>
            // arvixe.com: idev=<affid>-<referrer>-------<arvixeURL>
            '|(idev=(.*)[-]+.*)',

            // AffiliateWizAffiliateID=AffiliateID=41266&...
            '|(AffiliateWizAffiliateID=.*=AffiliateID=[^&]+&.*)',
        ].join('')),


  /**
   * We track all requests as possibly affiliate URL requests. These are
   * indexed by a unique request ID generated by Chrome. Either when we
   * establish this request is not related to an affiliate, or when a
   * timeout happens, we stop tracking this request and delete the state.
   *
   * @private
   */
  probableSubmissions: {},


  /**
   * Unique identifier for this user. Generated at initialization and stored
   * in local storage using USER_ID_STORAGE_KEY.
   *
   * @private
   */
  userId: null,


  /**
   * Queue for objects before they are sent to server in batches.
   *
   * @private
   */
  submissionQueue: [],


  /**
   * Custom logging. Only logs if debug flag is set.
   *
   * @param{object} msg Message directly passed to console.log.
   */
  log: function(msg) {
    if (this.debug)
      console.log(msg);
  },


  /**
   * Returns user's ID. If one does not already exist, a new user id is
   * generated and stored in local storage using USER_ID_STORAGE_KEY.
   *
   * @public
   */
  getUserId: function() {
    if (!this.userId) {
      chrome.storage.sync.get(AT_CONSTANTS.USER_ID_STORAGE_KEY,
          function(result) {
        if (!result.hasOwnProperty(AT_CONSTANTS.USER_ID_STORAGE_KEY)) {
          ATBg.userId = ATBg.generateUserId();
          var storage_key = AT_CONSTANTS.USER_ID_STORAGE_KEY;
          var storageObj = {
              storage_key: ATBg.userId
          };
          chrome.storage.sync.set(storageObj, function() {
            //console.log("created user id");
          });
        } else {
          ATBg.userId = result[
              AT_CONSTANTS.USER_ID_STORAGE_KEY];
        }
      });
    }
    return this.userId;
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
    return CryptoJS.MD5(userId).toString(CryptoJS.enc.Hex);
  },


  /**
   * Initializes the extension. Specifically,
   * 1) If a user does not have a unique identifier, it creates one.
   * 2) Initializes and parses the existing cookies to display in the popup.
   * 3) Sends a list of currently installed extensions to the server. We track
   *    these because extensions like adblocker affect affiliate cookies.
   *
   * @public
   */
  init: function() {
    this.log("Initializing");
    var userId = this.getUserId();
    ATBg.processExistingCookies();
    ATBg.processExistingExtensions();
  },


  /**
   * Sends a list of currently installed extensions to the server. We send
   * the extension name, id, and description.
   */
  processExistingExtensions: function() {
    var pendingExtSubmissions = [];
    chrome.management.getAll(function(extensions) {
      extensions.forEach(function (extension, index) {
        pendingExtSubmissions.push({"name": extension.name,
                                     "id": extension.id,
                                     "description": extension.description,
                                     "userId": ATBg.getUserId(),
                                     "timestamp": new Date().getTime() / 1000
                                    });
      });
      if (pendingExtSubmissions.length > 0) {
        ATBg.sendXhr(pendingExtSubmissions);
      }
    });
  },


  /**
   * Sends an object to server asynchronously.
   *
   * @param{object} ob Object to be serialized and sent to server.
   */
  sendXhr: function(ob) {
    if (!ATBg.debug) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "http://angelic.ucsd.edu:5000/upload");//TODO? a different URL?
      xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
      xhr.send(JSON.stringify(ob));
    }
  },


  /**
   * Looks through all the cookies in the cookie store to find affiliate
   * cookies.
   */
  processExistingCookies: function() {
    chrome.cookies.getAll({}, function(cookies) {
      cookies.forEach(function(cookie, index) {
        if (ATBg.cookieAffRe.test(cookie.name + "=" + cookie.value)) {
          var merchant = ATBg.getMerchantFromCookieParams(cookie.domain,
            cookie.name);
          // We identified an affiliate cookie.
          var affId = null;
          if (AT_CONSTANTS.AMAZON_SITES.indexOf(merchant) == -1) {
            affId = ATBg.parseAffiliateId(merchant,
                cookie.name + "=" + cookie.value, "COOKIE");
          }
          ATBg.processExistingAffCookie(affId, merchant, cookie);
        }
      });
    });
  },


  /**
   * Returns the merchant name from the cookie. Generally, the cookie domain is
   * the merchant except in the case of ShareASale where the domain is
   * always shareasale.com while the merchant is identified by a unique
   * number in the cookie name itself.
   *
   * @param{string} cookieDomain The domain of a cookie.
   * @param{string} cookieName The name of the cookie.
   * @return{string} Merchant name. Empty string if merchant is not found.
   *
   * @public
   */
  getMerchantFromCookieParams: function(cookieDomain, cookieName) {
    var merchant = cookieDomain;
    if (merchant.indexOf('.') == 0) {
      merchant = merchant.substring(1);
    }
    if (merchant.indexOf('www.') == 0) {
      merchant = merchant.substring(4);
    }
    if (([".com", ".net", ".org"].indexOf(merchant.slice(-4)) != -1) &&
        (merchant.split(".").length == 3)) {
      merchant = merchant.substring(merchant.indexOf(".") + 1);
    }

    if (merchant.indexOf("shareasale") != -1 &&
        cookieName.indexOf("MERCHANT") == 0) {
      merchant = "shareasale.com (merchant:" + cookieName.substring(8) + ")";
    }
    return merchant;
  },


  /**
   * In the request-response cycle, we often use the URL for the request
   * to determine the merchant, which is again represented by the second level
   * domain name.
   *
   * @param{string} url
   * @return{string} merchant name, "" if not found.
   */
  getMerchantFromUrl: function(url) {
    var merchant = "";
    if(ATBg.UrlRe.test(url)) {
      url.match(ATBg.UrlRe).forEach(function(matched, index) {
        if (index != 0 && typeof matched != "undefined" && merchant == "" &&
            matched.indexOf(".") != -1) {
          merchant = matched;
        }
      });
    }
    return merchant;
  },


  /**
   * Locally saves information about a cookie for displaying to the user. A
   * tiny object is created per merchant which stores information about the
   * most recent affiliate cookie that the extension knows of.
   *
   * @param{string} affId Affiliate identifier.
   * @param{string} merchant It's the domain name of merchant.
   * @param{object} cookie The internal cookie object.
   *
   * @private
   */
  processExistingAffCookie: function(affId, merchant, cookie) {
    var newSubmission = {};
    ATBg.updateSubmissionObj(newSubmission,  null, affId, null, merchant,
        cookie);
    ATBg.storeInLocalStorage(newSubmission);
    ATBg.removeSensitiveInfoFromSubmission(newSubmission);
    ATBg.submissionQueue.push(newSubmission);
  },


  /**
   * Stores information about cookie in local storage. This data is
   * referenced before a popup is displayed to the user. Only a small
   * subset of the submission object is stored.
   *
   * @param{submissionObj} The object whose subset is stored.
   */
  storeInLocalStorage: function(submissionObj) {
    var storeObj = {};
    var storage_key = AT_CONSTANTS.KEY_ID_PREFIX + submissionObj["merchant"];

    storeObj[storage_key] = {
                              "affiliate" : submissionObj["affId"],
                              "cookie": submissionObj["cookieValue"],
                              "cookieDomain": submissionObj["cookieDomain"],
                              "origin": submissionObj["origin"]
                             };
    // We only care about the last cookie value written
    chrome.storage.sync.set(storeObj, function() {
      //TODO: error handling?
    });
  },


  /**
   * Removes any information deemed sensitive from the submission obj. We had
   * temporarily stored it to store it persistely locally, but it needs to be
   * removed from submission object before it is sent to server.
   *
   * @param{object} submissionObj  The object to clean.
   */
  removeSensitiveInfoFromSubmission: function(submissionObj) {
    delete submissionObj["cookieValue"];
  },


  //objects. Pull from it every so often, send to server.
  //Then make modifications on the server to accept such data as well.
  /**
   * Sends objects about all the cookies currently in the submission queue
   * to the server.
   *
   * @private
   */
  sendToServer: function() {
    // Send messages up to length
    var len = ATBg.submissionQueue.length;
    var submissions = [];
    for (var i=0; i < len; i++) {
      var toPush = ATBg.submissionQueue.shift();
      if (ATBg.debug)
        toPush.testUser = true;
      submissions.push(toPush);
    }
    if (submissions.length > 0) {
      ATBg.sendXhr(submissions);
    }
  },


  /**
   * Parses cookie string to extract a given parameter.
   *
   * @param{string} raw cookie string from the header
   * @param{string} parameter Parameter can be domain, path, or expiration.
   * @param{string} arg Argument needed to determine a default value.
   * @return{string} extracted value.
   *
   * @private
   */
  getCookieParameter: function(cookie, parameter, arg) {
    var value = "";
    if (cookie.indexOf(parameter) != -1) {
      var start = cookie.indexOf(parameter + "=");
      if (cookie.indexOf(";", start) == -1) {
        // parameter value is not terminated by ; because it's at the end.
        value = cookie.substring(start + parameter.length + 1);
      } else {
        value = cookie.substring(start + parameter.length + 1,
                                cookie.indexOf(";", start));
      }
    } else {
      // If not specified, defaults depend on parameter.
      if (parameter == "domain") {
        // arg is the url. Default domain is the domain of document.
        var start = arg.indexOf("//") + 2;
        value = arg.substring(start, arg.indexOf("/", start));
      } else if (parameter == "path") {
        //TODO: what's the path default?
      }
    }
    return value;
  },


  /**
   * Parses out affiliate ID.
   *
   * @param {string} merchant Merchant name in lower case.
   * @param {string} arg Either a URL or cookie depending on the argType.
   * @param {string} argType Either "COOKIE" or "URL". Cookie is the value of
   *  the Set-Cookie header.
   * @return {string} Affiliate's ID. Returns null if it can't find id.
   *
   * @private
   */
  parseAffiliateId: function(merchant, arg, argType) {
      if (AT_CONSTANTS.AMAZON_SITES.indexOf(merchant) !== -1 &&
          argType == "URL") {
        // Treat arg as URL.
        var url = arg;
        var args = url.substring(url.lastIndexOf("/") + 1);
        if (args.indexOf("&") === -1 && args.indexOf("?") === -1) {
          // When a UserPref cookie is received in these cases, the affiliate
          // parameter is the last bit after the /
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
      } else if (argType == "COOKIE") {
        var substringEnd = arg.indexOf(";") != -1 ? arg.indexOf(";") :
            arg.length;
        var cookieNameValue = arg.substring(0, substringEnd);
        var affId = null;
        if(ATBg.cookieAffRe.test(cookieNameValue)) {
          cookieNameValue.match(ATBg.cookieAffRe).
              forEach(function(matched, index) {
            if (index != 0 && typeof matched != "undefined"
                && matched != null) {
              affId = matched;
            }
          });
        }
        return affId;
      }
  },


  /**
   * Finds the frame with corresponding URL and extracts its properties.
   *
   * @param {string} url URL to be matched to the src property of frame and
   *  img elements.
   * @param {string} frameType Type of frame as indicated by webRequest details
   *  object.
   * @param {string} tabId Tab where the content_script will look for frames.
   * @return {object} Object containing "size" and "style" fields.
   * @private
   */
  /*
  getFrameProperties: function(url, frameType, tabId) {
    //console.log("trying to get frame properties for " + url + " frame: " +
    //frameType + " for tab: " + tabId);
    var properties = {};
    if (frameType != 'main_frame') {
      chrome.tabs.sendMessage(tabId, {"method": "getFrame",
                                      "frameType": frameType},
                              function(response) {
        //console.log(response);
        //properties = response.data;
      });
    }
    return properties;
  },
  */


  /**
   * Returns the partially initialized submission object corresponding to
   * the request id. Returns null if no such object exists.
   *
   * @param{string} requestId The request Id that is used to index submission
   *    objects.
   * @return{object} Submission object if one was found, null otherwise.
   */
  getProbableSubmission: function(requestId) {
    // If this request has gone over 10 seconds, it would have been deleted
    // by a timer.
    if (!ATBg.probableSubmissions.hasOwnProperty(requestId)) {
      return null;
    }
    return ATBg.probableSubmissions[requestId];
  },


  /**
   * Parses and adds values to the submission object. This object is eventually
   * sent to the server. Either the cookie object needs to be suppied or
   * the response and cookieHeaderValue. CookieValue is only temporarily
   * stored in submissionObj because we need it in local storage. It is
   * removed from submission object before being sent to the server.
   *
   * @param{object} submissionObj Object to which values should be added.
   * @param{string} cookieHeaderValue The value of the set-cookie header.
   * @param{string} affId The parsed out affiliate ID.
   * @param{object} response Response object, can be null.
   * @param{object} cookie Optional cookie object.
   */
  updateSubmissionObj: function(submissionObj, cookieHeaderValue, affId,
      response, merchant, cookie) {
    if (cookie) {
      submissionObj["affId"] = affId;
      submissionObj["cookieDomain"] = cookie.domain;
      submissionObj["cookieExpDate"] = cookie.expirationDate;
      submissionObj["cookieHash"] = CryptoJS.MD5(cookie.value).
          toString(CryptoJS.enc.Hex),
      submissionObj["cookieName"] = cookie.name;
      submissionObj["cookiePath"] = cookie.path;
      submissionObj["landing"] = null;
      submissionObj["merchant"] = merchant;
      submissionObj["newTab"] = null;
      submissionObj["origin"] = null;
      submissionObj["originFrame"] = null;
      submissionObj["referer"] = null;
      submissionObj["timestamp"] = new Date().getTime() / 1000;
      submissionObj["type"] = null;
      submissionObj["userId"] = ATBg.getUserId();
      submissionObj["cookieSrc"] = "store";
      submissionObj["cookieValue"] = cookie.value;
    } else if (response && cookieHeaderValue) {
      submissionObj["cookieName"] = cookieHeaderValue.substring(0,
          cookieHeaderValue.indexOf("="));
      var cookieVal = (cookieHeaderValue.indexOf(";") == -1) ?
          cookieHeaderValue.substring(cookieHeaderValue.indexOf("=")) :
          cookieHeaderValue.substring(cookieHeaderValue.indexOf("=") + 1,
              cookieHeaderValue.indexOf(';'));
      submissionObj["cookieValue"] = cookieVal;
      submissionObj["cookieHash"] = CryptoJS.MD5(cookieVal).toString(
          CryptoJS.enc.Hex);
      submissionObj["cookieDomain"] = ATBg.
          getCookieParameter(cookieHeaderValue, "domain", response.url);
      submissionObj["cookiePath"] = ATBg.getCookieParameter(
          cookieHeaderValue, "path", response.url);
      submissionObj["cookieExpDate"] = ATBg.
          getCookieParameter(cookieHeaderValue, "expires", "");
      submissionObj["userId"] = ATBg.getUserId();
      submissionObj["affId"] = affId;
      submissionObj["type"] = response.type;
      submissionObj["timestamp"] = response.timeStamp;
      submissionObj["cookieSrc"] = "traffic";
      if (merchant == "") {
        merchant = ATBg.getMerchantFromCookieParams(
            submissionObj["cookieDomain"], submissionObj["cookieName"]);
      }
        submissionObj["merchant"] = merchant;
      }
      // This object will be sent to server and deleted when that happens.
      clearTimeout(submissionObj["timer"]);
      delete submissionObj["timer"];
 },


  /**
   * Shows a notification to the user.
   *
   */
  notifyUser: function(merchant, landingPage) {
    var notificationOpts = {
        type: 'basic',
        iconUrl: 'icon.png',
        title: merchant + " cookie",
        message: "From " + landingPage
     }

    chrome.notifications.clear(AT_CONSTANTS.NOTIFICATION_ID, function(){
      // TODO: error handling?
     });

    chrome.notifications.update(AT_CONSTANTS.NOTIFICATION_ID,
        notificationOpts, function(wasUpdated) {
      if (!wasUpdated) {
        chrome.notifications.create(AT_CONSTANTS.NOTIFICATION_ID,
            notificationOpts, function() {});
      }
    });
    setTimeout(function() {
      chrome.notifications.clear(AT_CONSTANTS.NOTIFICATION_ID,
          function() {});
    }, 1500);
  },



  /**
   * Intercept every response. If a request corresponds to affiliate URL
   * determined by looking at the Set-Cookie headers, then parse out useful
   * information, store it in local storage and server, notify user,
   * free up space.
   *
   * @param{Webrequest} response
   */
  responseCallback: function(response) {
    var submissionObj = ATBg.getProbableSubmission(response.requestId);

    if (submissionObj) {
      var setCookieHeaders = response.responseHeaders.filter(function(header) {
        return header.name.toLowerCase() == "set-cookie";
      });
      setCookieHeaders.forEach(function(header) {
        if (ATBg.cookieAffRe.test(header.value) &&
            // Bluehost 301 redirects from tracking URL to bluehost.com and
            // sends 2 cookies called r. The one set for .bluehost.com is
            // empty. The real cookie is the one set for www.bluehost.com.
            !header.value.indexOf("domain=.bluehost.com;") != -1) {

          var merchant = ATBg.getMerchantFromUrl(response.url);
          var affId = (AT_CONSTANTS.AMAZON_SITES.indexOf(merchant) != -1) ?
              ATBg.parseAffiliateId(merchant, response.url, "URL"):
              ATBg.parseAffiliateId(merchant, header.value, "COOKIE");

          if (affId) {
            ATBg.updateSubmissionObj(submissionObj, header.value, affId,
                response, merchant);
            ATBg.storeInLocalStorage(submissionObj);
            ATBg.removeSensitiveInfoFromSubmission(submissionObj);
            ATBg.submissionQueue.push(submissionObj);
            ATBg.notifyUser(submissionObj["merchant"], submissionObj["landing"]);
          }
        }
      });
    }
  },


  /**
   * Intercept every outgoing request to partially initialize a submission
   * object. We finish processing when we receive a reponse. All submission
   * objects are therefore tracked using the unique request ids Chrome
   * generates. All probably submission objects have an associated timer that
   * destroys them at the end of 10 seconds if no response was ever
   * received during this time.
   *
   * @param{Webrequest} request
   */
  requestCallback: function(request) {
    var newSubmission = {};
    // Origin is the page that requested merchant URL for affiliate.
    // Landing is the page that the user saw in the end.
    // newTab determines whether the mechant URL was requested in new tab.
    if (request.tabId >= 0) {
      chrome.tabs.get(request.tabId, function(tab) {
        newSubmission["origin"] = tab.url;
        newSubmission["landing"] = tab.url;
        if (tab.hasOwnProperty("openerTabId")) {
          //TODO: This is very buggy. It does not reliably indicate the
          //opener tab. :(
          chrome.tabs.get(tab.openerTabId, function(openerTab) {
            //newSubmission["origin"] = openerTab.url;
            //newSubmission["newTab"] = true;
          });
        } else {
          newSubmission["newTab"] = false;
        }
      });
    }

    var refererHeader = request.requestHeaders.filter(function(header) {
      return header.name.toLowerCase() === "referer";
    });
    if (typeof refererHeader !== "undefined") {
      newSubmission["referer"] = refererHeader.value;
    }

    newSubmission["timer"] = setTimeout(function() {
      if (ATBg.probableSubmissions.hasOwnProperty(
          request.requestId)) {
        // Delete this object either way
        delete ATBg.probableSubmissions[request.requestId];
      }
    }, 30000);

    ATBg.probableSubmissions[request.requestId] = newSubmission;
  },
};
