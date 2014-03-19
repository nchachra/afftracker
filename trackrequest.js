var afftracker_setter = {
  /**
   * Holds the state for merchant until it is saved in storage.
   *
   * @private
   */
  amazon: {},
  hostgator: {},
  notification_counter: 0,

  amazon_regex: /(amazon\.(com|de|at|ca|cn|fr|it|co\.jp|es|co\.uk))|(joyo\.com)|(amazonsupply\.com)|(javari\.(co\.uk|de|fr|jp))|(buyvip\.com)/i,


  /**
   * Parses out affiliate ID.
   *
   * @param {string} merchant Merchant name in lower case.
   * @param {string} arg Either a URL or cookie depending on the merchant.
   * @return {string} Affiliate's ID.
   * @private
   */
  parse_aff_id: function(merchant, arg) {
    switch (merchant) {

      case "amazon":
        // Treat arg as URL.
        var url = arg;
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
        };
        break;

      case "hostgator":
        // Treat arg as cookie value.
        // Split cookie value on semi-colon, take the first break which looks
        //   like number.aff_id
        var arg = cookie;
        return cookie.split(";", 1)[0].split(".")[1];
        break;
    }
  },

  /**
   * Callback for headers received events. Searches for Set-Cookie header
   * and parses out the affiliate ID.
   *
   * @param{Webrequest} details
   */
  response_callback: function(details) {
    var setter = afftracker_setter;
    if (details.url.indexOf("amazon.com") !== -1 &&
        details.requestId == setter.amazon["requestId"]) {
      // Amazon.com's UserPref cookie is an affiliate cookie.
      details.responseHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "set-cookie") {
          if (header.value.substring(0, 9) === "UserPref=") {
            // Amazon's affiliate id does not show up in the Cookie.
            var aff_id = setter.parse_aff_id("amazon", details.url);
            var cookie = header.value;
            // String after UserPref=
            var cookie_val = cookie.substring(9, cookie.indexOf(';'));
            var cookie_hash = CryptoJS.MD5(cookie_val).toString(CryptoJS.enc.Base64);
            // We don't send the cookie to our server, but check that the cookie we
            // recorded is the one user still has before displaying it.
            setter.amazon["cookie"] = cookie_val;
            setter.amazon["cookie_hash"] = cookie_hash;
            setter.amazon["aff_id"] = aff_id;
            setter.amazon["type"] = details.type;
            // In case of main frame, this is the same as landing URL.
            setter.amazon["origin_frame"] = details.url;
            setter.amazon["timestamp"] = details.timeStamp;
            chrome.storage.sync.set({'afftracker_amazon': setter.amazon},
                function() {});

            // Before sending the data, remove the cookie value from the object
            // for privacy reasons.
            delete setter.amazon["cookie"];
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "http://127.0.0.1:5000/upload");
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.send(JSON.stringify(setter.amazon));
            setter.cookie_counter += 1;
            chrome.notifications.create(
              'new-cookie-notif-' + setter.cookie_counter,
              { type: 'basic',
                iconUrl: 'icon.png',
                title: setter.amazon["merchant"] + " cookie",
                message: "From " + setter.amazon["landing"],
              }, function() {});
            setTimeout(function(){
                chrome.notifications.clear('new-cookie-notif-' + setter.cookie_counter, function() {});
            }, 3000);
            setter.amazon = {};
          }
        }
      });
    }
    /**else if (details.url.indexOf("hostgator.com") !== -1 &&
               details.requestId == setter.hostgator["requestId"]) {
        details.responseHeaders.forEach(function(header) {
          if(header.name.toLowerCase() === "set-cookie") {
            if (header.value.indexOf("GatorAffiliate") !== -1) {
              // Affiliate ID is in the Set-Cookie header.
              var aff_id = setter.parse_aff_id("hostgator", header.value);
              var cookie = header.value;
              // Value is string after GatorAffiliate=
              var cookie_val = cookie.substring(15, cookie.indexOf(";"));
              setter.hostgator["cookie"] = cookie_val;
              setter.hostgator["aff_id"] = aff_id;
              setter.hostgator["type"] = details.type;
              setter.hostgator["timestamp"] = details.timeStamp;
              chrome.storage.sync.set(
                {"afftracker_hostgator": setter.hostgator}, function() {});
              setter.hostgator = {};
          }
        }
      });
    }*/
  },


  /**
   * Callback for when a request is about to be made. We get the request
   * headers here and pull out the referer.
   *
   * @param{Webrequest} details
   */
  request_callback: function(details) {
    var setter = afftracker_setter;
    /**if (details.url.indexOf("http://secure.hostgator.com") === 0) {
      setter.hostgator = {"requestId": details.requestId};
      details.requestHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "referer") {
          setter.hostgator["referer"] = header.value;
          chrome.tabs.get(details.tabId, function(tab) {
            setter.hostgator["landing"] = tab.url;
          });
        }
      });
    }*/
    // replace sites with regexp

    var amazon_match = details.url.match(setter.amazon_regex);
    if(typeof amazon_match != "undefined" && amazon_match != null && amazon_match.length > 0) {
      setter.amazon = {"requestId": details.requestId};
      details.requestHeaders.forEach(function(header) {
        // Ignore amazon redirects to itself.
        if (header.name.toLowerCase() === "referer" &&
            !setter.amazon_regex.test(header.value)) {
          setter.amazon["merchant"] = amazon_match[0];
          setter.amazon["referer"] = header.value;
          chrome.tabs.get(details.tabId, function(tab) {
            setter.amazon["origin"] = tab.url;
            setter.amazon["landing"] = tab.url;
            if (tab.hasOwnProperty("openerTabId")) {
              chrome.tabs.get(tab.openerTabId, function(openerTab) {
                setter.amazon["origin"] = openerTab.url;
                setter.amazon["new_tab"] = true;
              });
            } else {
              setter.amazon["new_tab"] = false;
            }
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
