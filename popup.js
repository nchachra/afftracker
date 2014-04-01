var AffiliateTrackerPopup = {

  background: chrome.extension.getBackgroundPage(),

  /**
   * Appends a row to table element.
   *
   * @param{Object} tableEl Table to which row should be added.
   * @param{string} merchant The merchant domain name.
   * @param{string} cookieName Name of the cookie.
   * @param{boolean} isMerchantKnown Whether we have the merchant
   *   in cookie map.
   *
   * @private
   */
  createRow: function(tableEl, merchant, cookieName, isMerchantKnown) {
    var row = null;
    var storeKey = "AffiliateTracker_" + merchant;
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
            if (merchant.indexOf('buyvip.com') !== -1 ||
              merchant.indexOf('javari') !== -1) {
              iconImg.src = "icons/" +  merchant.split('.')[0] + ".png";
            } else if (merchant.indexOf("datahc.com") != -1) {
              // It's the same program.
              iconImg.src = "icons/hotelscombined.com.png";
            } else if (isMerchantKnown) {
              iconImg.src = "icons/" + merchant + ".png";
            } else {
              iconImg.src = "icons/unknown.png";
            }
            var iconCell = document.createElement('td');
            iconCell.appendChild(iconImg);
            row = document.createElement('tr');
            row.appendChild(iconCell);
            infoCell = document.createElement('td');
            infoCell.innerHTML = "Your visit to " +
                    "<span style='font-weight:bold;'>" + storeInfo.origin +
                    "</span> will earn affiliate " +
                    "<span style='font-weight:bold;'>" +
                    storeInfo.affiliate + "</span> a commission on your " +
                    "next purchase from <span style='font-weight:bold;'>" +
                    merchant + "</span>";
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
    var cookieMap = this.background.cookieMap;
    var miscCookies = this.background.miscCookies;

    // We don't identify all merchants in cookieMap. For more generic ones,
    // we find them using cookie names, and if we stored information
    // about them previously, we add them to the UI directly.

    miscCookies.forEach(function(cookieName, index) {
      chrome.cookies.getAll({"name": cookieName}, function(cookies) {
        var popup = AffiliateTrackerPopup;
        cookies.forEach(function(cookie, index) {
          var merchant = cookie.domain.substring(cookie.domain.indexOf(".") + 1);
          if (!cookieMap.hasOwnProperty(merchant)) {
            popup.createRow(tableEl, merchant, cookieName, false);
          }
        });
      });
    });

    Object.keys(cookieMap).forEach(function(merchant, index) {
      var popup = AffiliateTrackerPopup;
      popup.createRow(tableEl, merchant, cookieMap[merchant], true);
    });
    divEl.appendChild(tableEl);
  }
};


// This should really be done with the event registration API? The alternate
// to the following.
document.addEventListener('DOMContentLoaded', function () {
  AffiliateTrackerPopup.populateDom();
});
