var afftracker_setter = {


  /**
   * We need notification ID to control when it should be hidden.
   *
   * @private
   */
  notification_id: "AffiliateTracker_notif",

  /**
   * Regex to pull out the amazon site name. We call this merchant site.
   *
   * @private
   */
  amazon_regex: /(amazon\.(com|de|at|ca|cn|fr|it|co\.jp|es|co\.uk))|(joyo\.com)|(amazonsupply\.com)|(javari\.(co\.uk|de|fr|jp))|(buyvip\.com)/i,

  /**
   * User ID key. True across all extensions.
   *
   * @private
   */
  user_id_key: "AffiliateTracker_userId",

  /**
   * Generate user ID for this user. Takes a hash of a random number
   * concatenated with the timestamp. We only generate a user id if
   * one doesn't exist already.
   *
   * @return {string} UserId object {key:value}
   */
  generateUserId: function() {
    var user_id = new String(Math.floor(Math.random()*10+1)) + new String(new Date().getTime());
    var storage_obj = {};
    storage_obj[this.user_id_key] = CryptoJS.MD5(user_id).toString(CryptoJS.enc.Base64);
    return storage_obj;
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
      if (amazon_sites.indexOf(merchant) !== -1) {
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
      /**
      case "hostgator":
        // Treat arg as cookie value.
        // Split cookie value on semi-colon, take the first break which looks
        //   like number.aff_id
        var arg = cookie;
        return cookie.split(";", 1)[0].split(".")[1];
        break;
      */
    }
  },

  /**
   * Finds the frame with corresponding URL and extracts its properties.
   *
   * @param {string} url URL to be matched to the src property of frame and img elements.
   * @param {string} frame_type Type of frame as indicated by webRequest details object.
   * @param {string} tab_id Tab where the content_script will look for frames.
   * @return {object} Object containing "size" and "style" fields.
   * @private
   */
  getFrameProperties: function(url, frame_type, tab_id) {
    console.log("trying to get frame properties for " + url + " frame: " + frame_type + " for tab: " + tab_id);
    var properties = {};
    if (frame_type != 'main_frame') {
      chrome.tabs.sendMessage(tab_id, {"method": "getFrame", "frame_type": frame_type}, function(response) {
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
  response_callback: function(details) {
    var setter = afftracker_setter;
    // Look for any Amazon site
    var amazon_match = details.url.match(setter.amazon_regex);
    if(typeof amazon_match != "undefined" && amazon_match != null && amazon_match.length > 0) {
      var merchant = amazon_match[0]
      var submission_obj = setter.merchant[details.requestId];
      // Amazon.com's UserPref cookie is an affiliate cookie.
      details.responseHeaders.forEach(function(header) {
        if (header.name.toLowerCase() === "set-cookie") {
          if (header.value.substring(0, 9) === "UserPref=") {
            // Amazon's affiliate id does not show up in the Cookie.
            var aff_id = setter.parseAffiliateId(merchant, details.url);
            var cookie = header.value;
            // String after UserPref=
            var cookie_val = cookie.substring(9, cookie.indexOf(';'));
            var cookie_hash = CryptoJS.MD5(cookie_val).toString(CryptoJS.enc.Base64);

            chrome.storage.sync.get(setter.user_id_key, function(result) {
              if (result.hasOwnProperty(setter.user_id_key)) {
                submission_obj["userId"] = result[setter.user_id_key];
              }
            });

            // We don't send the cookie to our server, but check that the cookie we
            // recorded is the one user still has before displaying it.
            submission_obj["cookie"] = cookie_val;
            submission_obj["cookie_hash"] = cookie_hash;
            submission_obj["aff_id"] = aff_id;
            submission_obj["type"] = details.type;
            // In case of main frame, this is the same as landing URL.
            submission_obj["origin_frame"] = details.url;
            submission_obj["timestamp"] = details.timeStamp;
            // Storage only needs different merchant cookie values.
            // TODO: this may not work depending on whether these variables are available
            // in this context
            // We actually only care about the last cookie value written, so this over-writes.
            var store_obj = {};
            var storage_key = "AffiliateTracker_" + merchant;
            store_obj[storage_key] = {"affiliate" : aff_id,
                            "cookie": cookie_val,
                            "origin": submission_obj["landing"]}; //TODO this is confusing
            chrome.storage.sync.set(store_obj, function() {console.log("saved");});

            // We need the DOM element to be rendered to get its properties.
            // Sadly there is no reliable to do this. If the element is
            // already deleted within 3 seconds, we are out of luck.
            setTimeout(function() {
              if (submission_obj.hasOwnProperty("cookie")) {
                submission_obj["frame_properties"] = setter.getFrameProperties(details.url, details.type, details.tabId);
                // Before sending the data, remove the cookie value from the object
                // for privacy reasons.
                delete submission_obj["cookie"];
                var xhr = new XMLHttpRequest();
                xhr.open("POST", "http://127.0.0.1:5000/upload");
                xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
                xhr.send(JSON.stringify(submission_obj));
                // TODO: maybe check for success of xhr
              }
              // Delete this object either way
              delete submission_obj;
            }, 3000);

            setter.cookie_counter += 1;
            var notification_opts = { type: 'basic',
                iconUrl: 'icon.png',
                title: merchant + " cookie",
                message: "From " + submission_obj["landing"]
              }
            chrome.notifications.update(
              setter.notification_id, notification_opts, function(wasUpdated) {
                  if (!wasUpdated) {
                    chrome.notifications.create(setter.notification_id,
                        notification_opts, function() {});
                  }
              });
            setTimeout(function(){
                chrome.notifications.clear(setter.notification_id, function() {});
            }, 3000);
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
      var merchant = amazon_match[0];
      if (typeof setter.merchant == "undefined" || setter.merchant == null) {
        // All merchant requests are placed within 1 object.
        setter.merchant = {};
      }
      // TODO: add user id to this object...
      var new_submission = {};
      details.requestHeaders.forEach(function(header) {
        // Ignore amazon redirects to itself.
        if (header.name.toLowerCase() === "referer" &&
            !setter.amazon_regex.test(header.value)) {
          new_submission["merchant"] = merchant;
          new_submission["referer"] = header.value;
          chrome.tabs.get(details.tabId, function(tab) {
            // TODO: new_submission may not be available here.
            new_submission["origin"] = tab.url;
            new_submission["landing"] = tab.url;
            if (tab.hasOwnProperty("openerTabId")) {
              chrome.tabs.get(tab.openerTabId, function(openerTab) {
                // TODO: is new submission available here?
                new_submission["origin"] = openerTab.url;
                new_submission["new_tab"] = true;
              });
            } else {
              new_submission["new_tab"] = false;
            }
          });
          // Chrome makes sure request ids are unique.
          setter.merchant[details.requestId] = new_submission;
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

// If this user does not have a user Id, generate one.
chrome.storage.sync.get(afftracker_setter.user_id_key, function(result) {
  var setter = afftracker_setter;
  if (!result.hasOwnProperty(setter.user_id_key)) {
    var new_id_obj = setter.generateUserId();
    chrome.storage.sync.set(new_id_obj, function() {console.log("created user id");});
  }
});
