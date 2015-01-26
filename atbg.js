var ATBg = {

  /*
   * Debugging flag
   */
  debug: false,

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
   * Tabs where we got an affiliate cookie and want to know the DOM structure.
   * Contains a mapping of tabId<string>:
   *                  {"subObjects": [sub1, sub2,...],
   *                   "autoDestructTimer":timer}
   *
   * @private
   */
  tabsOfInterest: {},


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
   * Sends a list of currently installed extensions to the server. We send
   * the extension name, id, and description. Exclude extensions that Chrome
   * seems to ship with already.
   */
  processExistingExtensions: function() {
    var pendingExtSubmissions = [];
    chrome.management.getAll(function(extensions) {
      extensions.forEach(function (extension, index) {
        // Exclude default extensions.
        if (["Google Docs", "Google Drive", "YouTube", "Google Search",
            "Gmail", "AffiliateTracker",
            "Chrome Apps & Extensions Developer Tool", "Google Translate",
            ].indexOf(extension.name) == -1) {
          var ob = {"name": extension.name,
                    "id": extension.id,
                    "description": extension.description,
                    "userId": ATBg.userId,
                    "timestamp": new Date().getTime() / 1000,
                    "enabled": extension.enabled,
          }
          pendingExtSubmissions.push(ob);
        }
      });
      if (pendingExtSubmissions.length > 0) {
        data = JSON.stringify(pendingExtSubmissions);
        // Effectively clears array:
        // http://stackoverflow.com/questions/1232040/empty-an-array-in-javascript
        pendingExtSubmissions.length = 0;
        ATUtils.sendXhr(data, "extension");
      }
    });
  },


  /**
   * Looks through all the cookies in the cookie store to find affiliate
   * cookies. We exclude CJ cookies because we can't determine either
   * the merchant or the affiliate id from the cookie itself.
   */
  processExistingCookies: function() {
    chrome.cookies.getAll({}, function(cookies) {
      cookies.forEach(function(cookie, index) {
        if (cookie.name !== "LCLK") {
          if (AT_CONSTANTS.cookieAffRe.test(cookie.name + "=" + cookie.value)) {
            var merchant = ATParse.getMerchant("Cookie", [cookie.domain,
              cookie.name]);
            // We identified an affiliate cookie.
            var affId = ATParse.parseAffiliateId(merchant,
              cookie.name + "=" + cookie.value, "COOKIE");
            // Don't bother processing if we can't determine neither merchant
            // nor affiliate
            if (affId || merchant) {
              ATBg.processExistingAffCookie(affId, merchant, cookie);
            }
          }
        }
      });
    });
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
    var sub = new ATSubmission();
    sub.affiliate = affId;
    sub.merchant = merchant;
    sub.setCookie(cookie, "object");
    ATBg.storeInLocalStorage(sub);
    ATBg.queueForSubmission(sub);
  },


  /**
   * @param{object} submissionObj Object to be eventually sent to server.
   */
  queueForSubmission: function(submissionObj) {
    ATBg.submissionQueue.push(submissionObj);
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
                              "affiliate" : submissionObj.affiliate,
                              "cookie": submissionObj.cookie.value,
                              "cookieDomain": submissionObj.cookie.domain,
                              "origin": submissionObj.origin,
                             };
    // We only care about the last cookie value written
   chrome.storage.sync.set(storeObj, function() {
      //console.log("stored in local storage", storeObj);
    });
  },


  /**
   * Sends objects about all the cookies currently in the submission queue
   * to the server.
   *
   * @private
   */
  sendCookiesToServer: function() {
    // Send messages up to length
    var len = ATBg.submissionQueue.length;
    if (len > 0) {
      // Frees up memory because we are calling splice.
      ATUtils.sendXhr(JSON.stringify(ATBg.submissionQueue.splice(0, len)),
          "cookie");
    }
  },


  /**
   * Returns the partially initialized submission object corresponding to
   * the request id. Returns null if no such object exists.
   *
   * @param{string} requestId The request Id that is used to index submission
   *    objects.
   * @return{object} Submission object if one was found, null otherwise.
   */
  getSubmissionForRequest: function(requestId) {
    console.assert(typeof requestId === "string",
        "RequestId should be a string.");
    // If this request has gone over 10 seconds, it would have been deleted
    // by a timer.
    if (!ATBg.probableSubmissions.hasOwnProperty(requestId)) {
      return null;
    }
    return ATBg.probableSubmissions[requestId];
  },



  /**
   * Callback for the domTimer timeout that we create once we know we want dom
   * infomation for a given request cycle. It receives an instance of the
   * submission object.
   *
   * @param{object} sub Submission object whose timer fired.
   */
  domTimerCallback: function(sub) {
    ATBg.queueForSubmission(sub);
  },


  /**
   * Adds the landing page to the submission object. It's possibe we may error
   * out and not save landing page (someone closes the tab before we've
   * recorded information, etc.).
   *
   * @param{object} response The response containing tabId
   * @returns {promise} landingUrl when resolved, error otherwise.
   */
  getLandingPage: function(response) {
    return new Promise(function(resolve, reject) {
    if (response.type == "main_frame" && response.url) {
        resolve(response.url);
    } else if (response.tabId >= 0 && !chrome.runtime.lastError) {
        chrome.tabs.get(response.tabId, function(tab) {
          if (typeof tab !== "undefined") {
            resolve(tab.url);
          }
        });
      }
    });
  },


  /**
   * Shows a notification to the user. We reuse the same notification object
   * with notificationOpts. It's set to disappear after 2 seconds.
   *
   */
  notifyUser: function(merchant, origin) {
    if (origin === null) {
      origin = "Probably prefetching";
    }
    var notificationOpts = {
        type: 'basic',
        iconUrl: 'icon.png',
        title: merchant + " cookie",
        message: "From " + origin
     }

    chrome.notifications.clear(AT_CONSTANTS.NOTIFICATION_ID, function(){});

    chrome.notifications.update(AT_CONSTANTS.NOTIFICATION_ID, notificationOpts,
        function(wasUpdated) {
      if (!wasUpdated) {
        chrome.notifications.create(AT_CONSTANTS.NOTIFICATION_ID,
          notificationOpts, function() {});
      }
    });
    setTimeout(function() {
      chrome.notifications.clear(AT_CONSTANTS.NOTIFICATION_ID, function() {});
    }, 2000);
  },


  /**
   * When a tab completes loading, we check to see if this is a tab we were
   * interested in. If so, we call the callback associated with this tab
   * completion.
   *
   * @param{string} tabId The id of the tab that finished loading.
   * @param{string} changeInfo The status of the page.
   * @param{object} Tab object.
   */
  tabLoadCallback: function(tabId, changeInfo, tab) {
    if (changeInfo.status == "complete" &&
        ATBg.tabsOfInterest.hasOwnProperty(tabId)) {
      console.log("tabLoadCallback fired for: ", tabId);
      console.log("Clearing timeout for: ", tabId);
      clearTimeout(ATBg.tabsOfInterest[tabId].autoDestructTimer);
      while(sub = ATBg.tabsOfInterest[tabId].subObjects.pop()){
        console.log("Calling function on sub");
        sub.addDomDataAndPushToSubmission(tabId);
      }
      delete ATBg.tabsOfInterest[tabId];
    }
  },


  /**
   * For a given request, creates a partially filled submission object.
   *
   * @param{WebRequest} request
   * @returns {ATSubmission object}
   */
  initializeSubmissionForRequest: function(request) {
    console.assert(request, "Request should be truthy.");
    var sub = new ATSubmission();
    sub.culpritReqUrl = request.url;
    sub.culpritContentType = request.type;
    sub.tabId = request.tabId;
    sub.requestId = request.requestId;

    if (request.tabId >= 0 && !chrome.runtime.lastError) {
      chrome.tabs.get(request.tabId, function(tab) {
        if (tab) {
          sub.origin = tab.url;
          if (tab.hasOwnProperty("openerTabId") && tab.openerTabId) {
            chrome.tabs.get(tab.openerTabId, function(openerTab) {
              if (openerTab) {
                sub.opener = openerTab.url;
                sub.newTab = true;
              }
            });
          } else {
            sub.newTab = false;
          }
        }
      });
    }
    return sub;
  },


  /*
   * We tie a callback to the tab which we want dom elements from. But since
   * a tab event might never fire (tab closed, crashed, etc.), we associate
   * a self-destruct timer that removes our interest in a tab. Furthermore,
   * multiple callbacks may be interested in a tab. We renew the timer in these
   * cases.
   *
   * @param{string} tabId
   * @param{object} submission object interested in tab.
   */
  expressInterestInTab: function(tabId, sub) {
    console.log("Expressing interest in: ", tabId, sub);
    var tabTimeoutFunc = function() {
      console.log("Nothing happened with tab. Deleting");
      delete ATBg.tabsOfInterest[tabId];
      console.log("In timer, deleted a thing. tabs of interest: ", ATBg.tabsOfInterest);
    };
    var tabTimeoutDuration = 60000;
    //var tabTimeoutDuration = 15000;

    if (!ATBg.tabsOfInterest.hasOwnProperty(tabId)) {
      console.log("We are interested in a new tab.");
      ATBg.tabsOfInterest[tabId] = {
        "autoDestructTimer": setTimeout(tabTimeoutFunc, tabTimeoutDuration),
        "subObjects": [sub]
      };
      console.log("Tabs of interest: ", ATBg.tabsOfInterest);
    } else {
      // Reset timer.
      console.log("Interested in old tab. Resetting timer on old tab.");
      clearTimeout(ATBg.tabsOfInterest[tabId].autoDestructTimer);
      ATBg.tabsOfInterest[tabId].autoDestructTimer = setTimeout(tabTimeoutFunc,
          tabTimeoutDuration);
      ATBg.tabsOfInterest[tabId].subObjects.push(sub);
      console.log("Tabs of interest: ", ATBg.tabsOfInterest);
    }
  },


  /**
   * This is unfortunately complicated function just based on the Chrome API.
   * If we know a tab is already loaded, we return the dom elements. If we
   * know it's loading, we simply assign a callback for when it's ready to
   * automatically populate the submission object. If just doesn't exist, we
   * give up and don't get dom elements -- in this case, the dom timer will
   * fire and submit the object and delete it.
   *
   * @param{string} tabId
   * @param{object} submission object that will contain dom elements.
   */
  getDomElementsFromTab: function(tabId, sub) {
    console.log("Getting getdom elements for tabId: ", tabId);
    console.log("corresponding to sub: ", sub);
    ATUtils.getTabReady(tabId, sub).then(function() {
      console.log("Tab was already ready.", tabId);
      sub.addDomDataAndPushToSubmission(tabId);
    }, function(reject) {
      console.log("tabId in reject: ", tabId);
      console.log("sub in reject: ", sub);
      ATBg.expressInterestInTab(tabId, sub);
    });
  },

  /**
   * Intercept every outgoing request to partially initialize a submission
   * object. We finish processing when we receive a reponse with a cookie. All
   * submission objects are tracked using the unique request ids Chrome
   * generates for a single request chain. Eventually the requests that do not
   * result in affiliate cookies are destroyed after a few seconds
   * automatically, and the ones that do are submitted to the server.
   *
   * @param{Webrequest} request
   */
  requestCallback: function(request) {
    var sub = ATBg.getSubmissionForRequest(request.requestId);
    if (!sub) {
      sub = ATBg.initializeSubmissionForRequest(request);
      //console.log("Partial submission:",  sub);
      ATBg.probableSubmissions[request.requestId] = sub;
      sub.setAutoDestructTimer(request.requestId);
    }
    sub.updateReqRespSeq(request);
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
    var sub = ATBg.getSubmissionForRequest(response.requestId);
    if (!sub) {
      console.warn(
        "We got a response, but the submission object does not exist.");
      return;
    }
    sub.updateReqRespSeq(response);
    var cookieHeaders = ATUtils.getHeadersForName(response.responseHeaders,
        "set-cookie");
    cookieHeaders.forEach(function(header) {
      if (!ATParse.isUsefulCookie(header.value)) {
        return;
      }
      sub.setCookie(header.value, "header", [response.url]);
      if (!sub.merchant) {
        sub.determineAndSetMerchant(response.url);
      }
      if (!sub.affiliate && sub.merchant) {
        sub.determineAndSetAffiliate(response.url, header.value);
      }
    });
    if (sub.affiliate && response.statusLine.indexOf("200") !== -1) {
      console.log("Filled up object for submission: ", sub);
      ATBg.notifyUser(sub.merchant, sub.origin);
      // When Chrome prefetches, it gets the cookie but throws it away. Don't
      // clobber our data in local storage; but no harm in notifying user
      // or sending data to server.
      if (sub.origin !== null) {
        ATBg.storeInLocalStorage(sub);
      }
      sub.prolongLife(ATBg.domTimerCallback);
      ATBg.getLandingPage(response).then(function(landingUrl) {
        sub.landing = landingUrl;
      }, function(error) {});
      ATBg.getDomElementsFromTab(response.tabId, sub);
    }
  },
};
