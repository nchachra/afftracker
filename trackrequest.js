var afftracker_setter = {
  /**
   * Holds the state for merchant until it is saved in storage.
   *
   * @private
   */
  afftracker_amazon: {},
  afftracker_hostgator: {},

  /**
   * Parses out Amazon affiliate ID.
   *
   * @param {string} url Requested Amazon URL.
   * @return {string} Affiliate's ID.
   * @private
   */
  parse_amazon_aff_id: function(url) {
    var args = url.substring(url.lastIndexOf("/") + 1);
    if (args.indexOf("&") === -1 && args.indexOf("?") === -1) {
      // When a UserPref cookie is received in these cases,
      // the affiliate parameter is the last bit after the /
      return args;
    }

    if (args.indexOf("tag=") != -1) {
      var tag_index = args.indexOf("tag=");
      args = args.substring(tag_index + 4);
      if (args.indexOf("&") != -1) {
        return args.substring(0, args.indexOf("&"));
      } else {
        return args;
      }
    }
  },

  /**
   * Callback for headers received events. Searches for Set-Cookie header
   * and parses out the affiliate ID.
   *
   * @param{Webrequest} details
   */
  response_callback: function(details) {
    if (details.url.indexOf("amazon.com") !== -1 &&
        details.requestId == afftracker_setter.afftracker_amazon["requestId"]) {
      // Amazon.com's UserPref cookie is an affiliate cookie.
      details.responseHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "set-cookie") {
          if (header.value.substring(0, 9) === "UserPref=") {
            // Amazon's affiliate id does not show up in the Cookie.
            var aff_id = afftracker_setter.parse_amazon_aff_id(details.url);
            var cookie = header.value;
            var user_pref_ck = cookie.substring(cookie.indexOf("UserPref=") + 9,
                cookie.indexOf(';'));
            afftracker_setter.afftracker_amazon["cookie"] = user_pref_ck;
            afftracker_setter.afftracker_amazon["aff_id"] = aff_id;
            afftracker_setter.afftracker_amazon["type"] = details.type;
            afftracker_setter.afftracker_amazon["timestamp"] = details.timeStamp;
            chrome.storage.sync.set(
              {'afftracker_amazon': afftracker_setter.afftracker_amazon},
              function() {});
            afftracker_setter.afftracker_amazon = {};
          }
        }
      });
    } else if (details.url.indexOf("hostgator.com") !== -1 &&
               details.requestId == afftracker_setter.afftracker_hostgator["requestId"]) {
      details.responseHeaders.forEach(function(header) {
        if(header.name.toLowerCase() === "set-cookie") {
          if (header.value.indexOf("GatorAffiliate") !== -1) {
            // Split cookie value on semi-colon, take the first break
            // remove numbernumber. from beginning, keep the rest as aff.
            var aff_id = header.value.split(";", 1)[0].split(".")[1];
            var cookie = header.value;
            var aff_cookie = cookie.substring(cookie.indexOf("GatorAffiliate=") + 15,
                cookie.indexOf(";"));
            console.log("storing gator cookie value : " + aff_cookie);
            afftracker_setter.afftracker_hostgator["cookie"] = aff_cookie;
            afftracker_setter.afftracker_hostgator["aff_id"] = aff_id;
            afftracker_setter.afftracker_hostgator["type"] = details.type;
            afftracker_setter.afftracker_hostgator["timestamp"] = details.timeStamp;
            chrome.storage.sync.set(
              {"afftracker_hostgator": afftracker_setter.afftracker_hostgator},
              function() {});
            console.log("setting hostgator: ");
            console.log(afftracker_setter.afftracker_hostgator);
            afftracker_setter.afftracker_hostgator = {};
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
  request_callback: function(details) {
    if (details.url.indexOf("http://secure.hostgator.com") === 0) {
      afftracker_setter.afftracker_hostgator = {"requestId": details.requestId};
      details.requestHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "referer") {
          afftracker_setter.afftracker_hostgator["referer"] = header.value;
          chrome.tabs.get(details.tabId, function(tab) {
            afftracker_setter.afftracker_hostgator["site"] = tab.url;
          });
        }
      });
    }
    if (details.url.indexOf("amazon.com") !== -1) {
      afftracker_setter.afftracker_amazon = {"requestId": details.requestId};
      details.requestHeaders.forEach(function(header) {
        // Ignore amazon redirects to itself.
        if (header.name.toLowerCase() === "referer" &&
            header.value.indexOf("amazon.com") === -1) {
          afftracker_setter.afftracker_amazon["referer"] = header.value;
          chrome.tabs.get(details.tabId, function(tab) {
            afftracker_setter.afftracker_amazon["site"] = tab.url;
          });
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
    afftracker_setter.response_callback, {urls: ["<all_urls>"]},
    ["responseHeaders"]);

chrome.webRequest.onSendHeaders.addListener(
    afftracker_setter.request_callback, {urls: ["<all_urls>"]},
    ["requestHeaders"]);
