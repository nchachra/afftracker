var AffiliateTrackerPopup = {

  background: chrome.extension.getBackgroundPage(),


  /**
   * Returns the name of icon image. Usually it's named merchant.png, but there
   * are some exceptions. For mrechants that we do not have an icon for, a
   * generic "unknown" image is displayed.
   *
   * @param{string} merchant The name of merchant.
   * @return{string} relative image URL.
   */
  getImgUrl: function(merchant, merchantInCookieMap) {
    if (merchant.indexOf('buyvip.com') !== -1 ||
        merchant.indexOf('javari') !== -1) {
      return "icons/" +  merchant.split('.')[0] + ".png";
    } else if (merchant.indexOf("datahc.com") != -1) {
      // It's the same program.
      return "icons/hotelscombined.com.png";
    } else if (["themeforest.net", "codecanyon.net", "videohive.net",
        "audiojungle.net", "graphicriver.net", "photodune.net", "3docrean.net",
        "activeden.net", "envato.com"].indexOf(merchant) != -1) {
      return "icons/envato.com.png";
    } else if(merchant.indexOf("shareasale") != -1) {
      return "icons/shareasale.com.png";
    } else if (this.background.cookieMap.hasOwnProperty(merchant)) {
      return "icons/" + merchant + ".png";
    } else {
      return "icons/unknown.png";
    }
  },


  /**
   * Appends a row to table element.
   *
   * @param{Object} tableEl Table to which row should be added.
   * @param{string} merchant The merchant domain name.
   * @param{string} cookieName Name of the cookie.
   *
   * @private
   */
  createRow: function(tableEl, merchant, cookieName) {
    var row = null;
    var storeKey = this.background.AT_CONSTANTS.KEY_ID_PREFIX + merchant;
    chrome.storage.sync.get(storeKey, function(result) {
      var storeInfo = result[storeKey];
      if (typeof storeInfo != "undefined" && storeInfo != null) {
        var cookieUrl = (storeInfo.cookieDomain[0] == ".") ?
                         "http://www." + storeInfo.cookieDomain :
                         "http://" + storeInfo.cookieDomain;
        chrome.cookies.get({"url": cookieUrl, "name": cookieName},
            function(cookie) {
          if (storeInfo && cookie && cookie.value == storeInfo.cookie) {
            // Every table's first cell is the icon img.
            var iconImg = document.createElement('img');
            iconImg.src = AffiliateTrackerPopup.getImgUrl(merchant);
            var iconCell = document.createElement('td');
            iconCell.appendChild(iconImg);

            row = document.createElement('tr');
            row.appendChild(iconCell);
            infoCell = document.createElement('td');
            var affiliateHTML = "affiliate <span style='font-weight:bold;'>" +
                                storeInfo.affiliate + " </span>";

            if (storeInfo.affiliate == null) {
              affiliateHTML = "an <span style='font-style:italic;'>" +
                "Unknown </span> affiliate ";
            }
            if (storeInfo.origin != null) {
              infoCell.innerHTML = "Your visit to " +
                      "<span style='font-weight:bold;'>" + storeInfo.origin +
                      "</span> will earn " + affiliateHTML +
                      " a commission on your " +
                      "next purchase from <span style='font-weight:bold;'>" +
                      merchant + "</span>";
            } else {
              infoCell.innerHTML = affiliateHTML + " will earn a commission " +
                      "on your next purchase from " +
                      "<span style='font-weight:bold;'>" +
                      merchant + "</span";
            }
            row.appendChild(infoCell);
            // Change background color for even numbered rows.
            if (tableEl.rows.length % 2 == 0) {
              row.setAttribute("style", "background-color: #edf0f5;");
            }
            tableEl.appendChild(row);
          }
        });
      }
    });
  },

  /**
   * Pulls the stored values from storage and populates the DOM.
   *
   * @public
   */
  populateDom: function() {
    var divEl = document.getElementById("merchant-info");
    var tableEl = document.createElement('table');
    var rowCounter = 0;
    var affCookieNames = this.background.affCookieNames;

    affCookieNames.forEach(function(cookieName, index) {
      chrome.cookies.getAll({"name": cookieName}, function(cookies) {
        var popup = AffiliateTrackerPopup;
        cookies.forEach(function(cookie, index) {
          var merchant = cookie.domain;
          //TODO: user messages to use the background function for this..
          if (cookie.domain.indexOf('.') == 0) {
            merchant = cookie.domain.substring(1);
          }
          if (merchant.indexOf('www.') == 0) {
            merchant = merchant.substring(4);
          }
          if ((merchant.slice(-4) == ".com" ||
               merchant.slice(-4) == ".net" ||
               merchant.slice(-4) == ".org") &&
              (merchant.split(".").length == 3)) {
            merchant = merchant.substring(merchant.indexOf(".") + 1);
            console.log(merchant);
          }
          if (merchant.indexOf("shareasale") != -1 &&
              cookie.name.indexOf("MERCHANT") == 0) {
            merchant = "shareasale.com (merchant:" + cookie.name.substring(8) +
                 ")";
          }
          popup.createRow(tableEl, merchant, cookieName);
        });
      });
    });

    divEl.appendChild(tableEl);
  }
};


// This should really be done with the event registration API? The alternate
// to the following.
document.addEventListener('DOMContentLoaded', function () {
  AffiliateTrackerPopup.populateDom();
});
