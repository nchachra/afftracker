var ATParse = {

  /**
   * Finds the URL that matches the CJ pattern with publisher id and
   * affiliate id in the request response sequence. This will later
   * be used to pull out the merchant and affiliate id.
   *
   * @param{object} reqRespObj It's the list of request and response so far.
   * @return{string} the url matching CJ pattern.
   */
  findCJUrlInReqSeq: function(reqRespSeq) {
    var re = RegExp('\\/click-\\d+-\\d+$');
    var matches = reqRespSeq.filter(function(reqObj) {
        return re.test(reqObj.url);
    });
    if (matches.length > 0) {
      return matches[0].url;
    } else {
      return null;
    }
  },


  /**
   * Parses out affiliate ID. For URLs, we only support amazon + sister sites,
   * and Commission Junction. For Cookies, the default behavior is to return
   * the get match values from the name value pairs in the cookieAffRe regex.
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
    switch(argType) {
      case "URL":
        if (AT_CONSTANTS.AMAZON_SITES.indexOf(merchant) !== -1) {
          return ATParse.parseAffiliateIdFromAmazonURL(arg);
        } else {
          return ATParse.parseAffiliateIdFromCJ(arg); //Assume Commission Junction
        };
        break;
      case "COOKIE":
        if (AT_CONSTANTS.AMAZON_SITES.indexOf(merchant) !== -1) {
          return null;
        };
        var substringEnd = arg.indexOf(";") != -1 ? arg.indexOf(";") :
            arg.length;
        var cookieNameValue = arg.substring(0, substringEnd);
        var affId = null;
        if(cookieNameValue.indexOf("LCLK=") === -1 && //Can't do CJ
            AT_CONSTANTS.cookieAffRe.test(cookieNameValue)) {
          cookieNameValue.match(AT_CONSTANTS.cookieAffRe).forEach(
              function(matched, index) {
            if (index !== 0 && typeof matched !== "undefined"
                && matched !== null) {
              affId = matched;
            }
          });
        };
        return affId;
      default:
        return null;
    }
  },


  /**
   * Parses the arguments to get the closest approximation of a merchant name.
   * Currently it needs either a URL (for Amazon, for example) or a
   * combination of cookie domain and cookie name to get the merchant id.
   *
   * @params{string} argType Either "Cookie" or "URL".
   * @params{array} args List of args. For cookie, expects [cookieDomain,
   *    cookieName]. For URL, expects [url].
   * @return {?string} Merchant name. Default is null.
   *
   * @public
   */
  getMerchant: function(argType, args) {
    switch (argType) {
      case "Cookie":
        console.assert(args.length === 2,
            "For cookies 2 arguments should be supplied to get merchant name");
        return (args.length === 2) ?
          this.getMerchantFromCookieParams(args[0], args[1]) : null;
      case "URL":
        console.assert(args.length === 1,
            "For URLs, 1 argument must be supplied to get merchant.");
        return (args.length ===1) ? this.getMerchantFromUrl(args[0]) : null;
      default:
        console.error("getMerchant() called with invalid argType");
        return null;
    };
  },

  /**
   * Returns the merchant name from the cookie. Generally, the cookie domain is
   * the merchant with the following exceptions:
   *
   * ShareASale: the domain is always shareasale.com while the merchant is
   * identified by a unique number in the cookie name itself.
   *
   * AffilaiteWindow: domain is .awin1.com while the merchant code is contained
   * in the cookie.
   *
   * LinkShare: The domain is always .linksynergy.com and the merchant code
   * is in the cookie name.
   *
   * @param{string} cookieDomain The domain of a cookie.
   * @param{string} cookieName The name of the cookie.
   * @return{string} Merchant name.
   *
   * @private
   */
  getMerchantFromCookieParams: function(cookieDomain, cookieName) {
    var merchant = cookieDomain;

    if (cookieName == "LCLK") {
      return "commission junction";
    }

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
    } else if (merchant.indexOf("awin1.com") != -1 &&
        cookieName.indexOf("aw") == 0) {
      merchant = "affiliate window (merchant:" + cookieName.substring(2) + ")";
    } else if (merchant.indexOf("linksynergy.com") != -1) {
      if (cookieName.indexOf("lsclick_mid") == 0) {
        merchant = "linkshare (merchant:" + cookieName.substring(11) + ")";
      } else if (cookieName.indexOf("linkshare_cookie") != -1) {
        merchant = "linkshare (merchant:" + cookieName.substring(16) + ")";
      }
    }
    return merchant;
  },


  /**
   * In the request-response cycle, we often use the URL for the request
   * to determine the merchant, which is again represented by the second level
   * domain name. Currently we only use this method to identify Amazon and CJ
   * merchant names. Rest of them can be identified from cookie itself.
   *
   * @param{string} url
   * @return{string} merchant name. Default is null.
   *
   * @private
   */
  getMerchantFromUrl: function(url) {
    var merchant = null;

    if(AT_CONSTANTS.UrlRe.test(url)) {
      url.match(AT_CONSTANTS.UrlRe).forEach(function(matched, index) {
        if (index != 0 && typeof matched != "undefined" && merchant === null) {
          if (matched.indexOf(".") != -1) {
            merchant = matched;
          }
          // Unfortunately CJ publisher isn't a domain name, so it's treated
          // differently. The merchant ID is the last bit after -
          if (matched.indexOf('/click-') == 0) {
            merchant = "commission junction (merchant: " +
              matched.substring(matched.lastIndexOf('-') + 1) + ")";
          }
        }
      });
    }
    return merchant;
  },


  /**
   * Parses cookie string to extract a given parameter.
   *
   * @param{string} raw cookie string from the header
   * @param{string} parameter As long as parameter is in the cookie string, it
   *    can be any value. If it doesn't appear on cookie however, we only know
   *    how to return default value for domain is page domain.
   * @param{string} arg Argument needed to determine a default value. Currently
   *    only handles domains, in which case arg is assumed to be a url.
   * @return{string} extracted value. Default is null.
   *
   * @private
   */
  // TODO: There must be a library to do this? This function is so ad hoc.
  getCookieParameter: function(cookie, parameter, arg) {
    var value = null;
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
      // If not specified, handle default for domain. Arg is URL. Default domain
      // is the domain of document.
      if (parameter == "domain" && arg) {
        var start = arg.indexOf("//") + 2;
        value = arg.substring(start, arg.indexOf("/", start));
      }
    }
    return value;
  },


  /**
   * Parses a URL for amazon.com and sister sites and returns the affiliate id.
   *
   * When there is only one argument after the last slash, the entire substring
   * after / is returned.
   *
   * If there is a tag= parameter present, its value is returned.
   * @param {string} url Amazon affiliate URL that dropped the cookie.
   * @return {string} Affiliate's ID. Returns null if it can't find id.
   *
   * @private
   */
  parseAffiliateIdFromAmazonURL: function(url) {
    var args = url.substring(url.lastIndexOf("/") + 1);
    if (args.indexOf("&") === -1 && args.indexOf("?") === -1) {
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
    }
    return null; //default
  },

  /**
   * Parses a URL for commission junction to return affiliate id if possible.
   * Sometimes the URL has an encrypted string and we can't get the aff id
   * in these cases.
   *
   * @param{string} url URL for commission junction.
   * @return {string} Affiliate's ID. Returns null if not found.
   *
   * @private
   */
  parseAffiliateIdFromCJ: function(url) {
    // Junction where the url structure is domain/click-PID-AID
    lastSlash = url.indexOf('/click-');
    if (lastSlash == -1) {
      // Probably an encrypted affiliate URL. We're hosed.
      return null;
    } else {
      return url.substring(lastSlash).split("-")[1];
    }
    return null; //default
  },


  /**
   * Returns user's ID. If one does not already exist, a new user id is
   * generated and stored in local storage using USER_ID_STORAGE_KEY.
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
    return CryptoJS.MD5(userId).toString(CryptoJS.enc.Hex);
  },
};