/**
 * Objects that contain information to be displayed to user or submiitted to
 * server.
 */
function ATSubmission() {
  this.timestamp = new Date().getTime() / 1000;
  this.userId = ATBg.userId;
  console.assert(typeof this.userId === "string",
      "UserId should already be set by now.");
  this.affiliate = null;
  this.merchant = null;
  this.cookieSrc = null;
  this.cookie = {
    domain: null,
    expirationDate: null,
    hostOnly: null,
    httpOnly: null,
    name: null,
    path: null,
    secure: null,
    session: null,
    value: null,
  };
  // Page that user visited that request affiliate URL.
  this.origin = null;

  // Landing is the page that the user saw in the end.
  this.landing = null;

  // newTab determines whether the mechant URL was requested in new tab.
  this.newTab = null;

  // The url that actually resulted in a cookie.
  this.culpritReqUrl = null;

  // The type of content requested, we use this to grab dom elements.
  this.culpritContentType = null;

  // The URL that caused this tab to open. I am not sure how Chrome decided
  // this, seems a bit flakey.
  this.opener = null;

  // We use this to find DOM content later. If tabId is -1, the request is
  // not related to a tab.
  this.tabId = null;

  // This is generated by chrome. It's for bookkeeping purposes only.
  this.requestId = null;

  // We save the entire request chain in this array.
  this.reqRespSeq = [];

  // The properties of dom elements.
  this.domEls = null;

  // Header value that contains the cookie. This is redundant but is good
  // in case there's a mistake in calculating other parameters.
  this.cookieHeader = null;
};


/**
 * Extracts useful information from Chrome's representation of cookie.
 * Also sets the cookieSrc to store to indicate the cookie came from Chrome.
 *
 * param{object or string} cookie Cookie object from chrome.cookies or value
 *    of set-cookie header. The expected type depends on type value.
 * param{string} type Determines how cookie parameter should be parsed. Can be
 *    "object" or "header".
 * param{array} args Extra args. For calculating default domain when not
 *    present in cookie value, we use the response url supplied as first value
 *    of this array. Only needed if type is "header".
 */
ATSubmission.prototype.setCookie = function(cookie, type, args) {
  var subObj = this;
  return new Promise(function(resolve, reject) {
    console.assert(typeof subObj === "object",
      "sub should be object in promise..");
    switch(type) {
      case "object":
        subObj.cookie.domain = cookie.domain;
        subObj.cookie.expirationDate = cookie.expirationDate;
        subObj.cookie.hostOnly = cookie.hostOnly;
        subObj.cookie.httpOnly = cookie.httpOnly;
        subObj.cookie.name = cookie.name;
        subObj.cookie.path = cookie.path;
        subObj.cookie.secure = cookie.secure;
        subObj.cookie.session = cookie.session;
        //this.cookie.storeId = cookie.storeId;
        subObj.cookie.value = cookie.value;
        subObj.cookieSrc = "store";
        subObj.cookieUrl = null;
        resolve("Resolved");
        break;
      case "header":
        console.assert(cookie.indexOf("=") > 0,
            "A valid cookie should have name=value;params");
        console.assert(args instanceof Array && args.length === 1 &&
            typeof args[0] === "string",
            "For parsing cookie headers, response url must be provided in args");
        subObj.cookieHeader = cookie;
        subObj.cookie.name = cookie.substring(0, cookie.indexOf("="));
        ATUtils.getCookie(args[0], subObj.cookie.name).then(
            function(cookie) {
          subObj.setCookie(cookie, "object");
          subObj.cookieSrc = "traffic";
          subObj.cookieUrl = args[0];
          console.log("Cookie should be set correctly.");
          resolve("Resolved!");
        });
        break;
      default:
        console.error("Wrong type supplied to ATSubmission.setCookie()");
        reject("Wrong type supplied to ATSubmission");
    }
  });
};


/**
 * Adds some request/response parameters to the reqRespSeq.
 *
 * @param{object} req Request or response object.
 */
ATSubmission.prototype.updateReqRespSeq = function(req) {
  console.assert(this.reqRespSeq instanceof Array,
    "ReqRespSeq in Submission should be initialized as Array");
  // Array.prototype.find does not work here.
  // There should only be one referer but even if there are more, we want the
  // last one.
  var refererHeaders = ATUtils.getHeadersForName(req.requestHeaders ||
      req.responseHeaders, "referer");
  var frameOptionHeader = ATUtils.getHeadersForName(req.requestHeaders ||
      req.responseHeaders, "x-frame-options");

  this.reqRespSeq.push({
    "method": req.method,
    "timestamp": req.timeStamp,
    "contentType": req.type,
    "url": req.url,
    "statusLine": req.hasOwnProperty("statusLine") ? req.statusLine : null,
    "referer": refererHeaders.length > 0 ? refererHeaders[0].value : null,
    "type": req.requestHeaders ? "request" : "response",
    "x-frame-options": frameOptionHeader.length > 0 ?
        frameOptionHeader[0].value : null,
   });
 };


/**
 * We set a timer that deletes the object reference. The only reference for
 * submission objects should be in ATBg.probableSubmissions.
 *
 * @param{string} requestId
 */
ATSubmission.prototype.setAutoDestructTimer = function(requestId) {
  console.assert(typeof requestId === "string",
      "RequestId should be a string.");
  this.reqLifeTimer = setTimeout(function() {
    if (ATBg.probableSubmissions.hasOwnProperty(requestId)) {
      // Delete this object reference.
      delete ATBg.probableSubmissions[requestId];
    }
  }, 15000);
};

/**
 * Uses the response URL and already available data from Cookie to determine
 * the merchant and saves it. It may still not be able to find a merchant, in
 * which case, the value of merchant will be null.
 *
 */
ATSubmission.prototype.determineAndSetMerchant = function(url) {
  // We do our best to get a merchant id. For CJ, the URL containing
  // the affiliate is generally not the same as one that drops cookie.
  if (url !== null && typeof url !== "undefined" &&
      url.indexOf(".clickbank.net") === -1) {
    this.merchant = ATParse.getMerchant("URL", [url]);  //amazon
  }
  if (!this.merchant && url && url.indexOf(".clickbank.net") !== -1) {
    // While it is technically possible to grab the affiliate id and
    // merchant name from cookie url, an intermediate url provides this
    // information more accurately and reliably.
    var cbUrl = ATParse.findClickbankUrlInReqSeq(this.reqRespSeq);
    console.log("clickbank url", cbUrl);
    this.merchant = ATParse.getMerchant("URL", [cbUrl]);
  }
  if (!this.merchant) {
    this.merchant = ATParse.getMerchant("URL",
        [ATParse.findCJUrlInReqSeq(this.reqRespSeq)]);
  }
  if (!this.merchant && this.cookie.hasOwnProperty("domain") &&
      this.cookie.hasOwnProperty("name") && this.cookie.domain &&
      this.cookie.name) {
    this.merchant = ATParse.getMerchant("Cookie", [this.cookie.domain,
        this.cookie.name]);
  }
};

/**
 * Uses arguments to determine affiliate id and sets it. It may not be able to
 * find an affiliate in which case it's null.
 *
 * @param{string} url Response URL to use to get affiliate ID.
 * @param{string} header Set-Cookie header's value.
 */
ATSubmission.prototype.determineAndSetAffiliate = function(url, header) {
  if (this.merchant &&
      (AT_CONSTANTS.AMAZON_SITES.indexOf(this.merchant) != -1)) {
    this.affiliate = ATParse.parseAffiliateId(this.merchant, url, "URL");
  } else if (header && header.indexOf("LCLK=") === 0) {
    // Commission Junction
    var cjUrl = ATParse.findCJUrlInReqSeq(this.reqRespSeq);
    this.affiliate = ATParse.parseAffiliateId(this.merchant,
      cjUrl || "", "URL");
  } else if (url.indexOf("clickbank.net") !== -1) {
    var cbUrl = ATParse.findClickbankUrlInReqSeq(this.reqRespSeq);
    this.affiliate = ATParse.parseAffiliateId(this.merchant,
        cbUrl || "", "URL");
  } else {
    if (!header) {
      header = this.cookie.name + "=" + this.cookie.value;
      console.log("No header suppied, getting affiliate from: ", header);
    }
    this.affiliate = ATParse.parseAffiliateId(this.merchant, header, "COOKIE");
  }
};


/**
 * We determined affiliate cookie for this object, remove auto-destruct and
 * give it more time to render dom before submitting. We wait 30 more seconds
 * after which the object is submitted irresptive of dom info.
 *
 * @param{function} domTimerCallback Callback function to call with the newly
 *    created domTimer. Callback is called with "this" instance.
 */
ATSubmission.prototype.prolongLife = function(domTimerCallback) {
  clearTimeout(this.reqLifeTimer);
  delete this.reqLifeTimer;

  var sub = this;
  this.domTimer = setTimeout(function() {
    delete sub.domTimer;
    domTimerCallback(sub);
  }, 30000);
};


/**
 * Highlights the fradulent elements. Errors in this call are tolerable so
 * there are no checks in place.
 *
 * @param{string} tabId
 */
ATSubmission.prototype.highlightDomEls = function(tabId) {
  chrome.tabs.sendMessage(tabId,
    {"method": "highlightAffiliateDom",
    "frameType": this.culpritContentType,
    "url": this.culpritReqUrl
    }, function(response) {});
},


/**
 * This is only called when the tab load is complete. To prevent interference,
 * remove domTimer. Get information from contentscript about dom elements, and
 * queue for submission. We don't get DOM elements if it was loaded via a
 * <script>, <stylesheet> tag, or if it opened a new tab with merchant URL. As
 * a freebie, we highlight the DOM elements that we decided were fraudulent.
 *
 * @param {string} tabId
 */
 ATSubmission.prototype.addDomDataAndPushToSubmission = function(tabId) {
  // clear timers
  console.log("Clearing dom timers on sub.", this);
  clearTimeout(this.domTimer); // We'll push ourself.
  delete this.domTimer

  if (["script", "stylesheet", "main_frame"].indexOf(
        this.culpritContentType) !== -1) {
    console.log("Queueing for submission.");
    ATBg.queueForSubmission(this);
  }

  var sub = this;
  var message = {"method": "getAffiliateDom",
      "frameType": this.culpritContentType,
      "url": this.culpritReqUrl
      };
  ATUtils.getMessageResponse(tabId, message).then(function(response) {
    sub.domEls = response;
    console.log("Highlighting now..");
    sub.highlightDomEls(tabId);
    console.log("Queuing for submission: ", sub);
    ATBg.queueForSubmission(sub);
  }, function(reject) {
    console.log("We couldn't get dom elements? What.");
    console.log("this should also be a sub: ", sub);
    ATBg.queueForSubmission(sub);
  });
};
