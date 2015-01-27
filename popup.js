var AffiliateTrackerPopup = {

  background: chrome.extension.getBackgroundPage(),

  matchedCookies: [],


  /**
   * We only have icons for a few programs. The best way I found is to just
   * store them as a constant map.
   *
   * @const
   * @private
   */
  ICONS_AVAILABLE: ["amazon.at", "arvixe.com", "hotelscombined.com",
      "amazon.ca", "bizland.com", "inmotionhosting.com", "amazon.cn",
      "bluehost.com", "ipage.com", "amazon.co.jp", "ipower.com",
      "amazon.com", "dollarsign.png", "ixwebhosting.com", "amazon.co.uk",
      "dreamhost.com", "javari.png", "amazon.de", "envato.com", "justhost.com",
      "amazon.es", "fatcow.com", "lunarpages.com", "amazon.fr",
      "hidemyass.com", "shareasale.com", "hostgator.com",
      "startlogic.com", "amazon.in", "hosting24.com", "amazon.it",
      "hostmonster.com", "webhostinghub.com", "amazonsupply.com",
      "hostrocket.com", "webhostingpad.com"],


  /**
   * Returns the name of icon image. Usually it's named merchant.png, but there
   * are some exceptions. For mrechants that we do not have an icon for, a
   * generic "unknown" image is displayed.
   *
   * @param{string} merchant The name of merchant.
   * @return{string} relative image URL.
   */
  getImgUrl: function(merchant) {
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
    } else if(merchant.indexOf("affiliate window") != -1) {
      return "icons/affiliatewindow.png";
    } else if (merchant.indexOf("linkshare") != -1) {
      return "icons/linkshare.png";
    } else if (merchant.indexOf ("commission junction") != -1) {
      return "icons/commissionjunction.png";
    } else if (this.ICONS_AVAILABLE.indexOf(merchant) != -1) {
      return "icons/" + merchant + ".png";
    } else {
      return "icons/unknown.png";
    }
  },


  /**
   * Appends a row to table element.
   *
   * @param{object} cookie Object
   * @return{dom} row element
   *
   * @private
   */
  createRow: function(cookie) {
    var row = null;
    var storeKey = this.background.AT_CONSTANTS.KEY_ID_PREFIX + cookie.merchant;
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
   * Returns a promise for matching cookies.
   *
   * @param{string} property The property of cookie to match. One of
   *    {domain,name}
   * @param{string} propertyValue Whatever the name or domain should be.
   * @returns{cookies} Returns a promise with cookies array.
   */
  getCookiesMatchingProperty: function(propertyName, propertyValue) {
    return new Promise(function(resolve, reject) {
      switch (propertyName) {
        case "name":
          chrome.cookies.getAll({"name": propertyValue}, function(cookies) {
            resolve(cookies);
          });
          break;
        case "domain":
          chrome.cookies.getAll({"domain": propertyValue}, function(cookies) {
            resolve(cookies);
          });
          break;
        default:
          console.error("Invalid property in getMatchingCookies()");
          reject();
      }
    });
  },


  /**
   * Get matching cookies to the names and domains. Returns promise
   */
  getAllMatchingCookies: function() {
    return new Promise(function(resolve, reject) {
      var popup = AffiliateTrackerPopup;
      bg = popup.background;
      var promises = [];
      bg.AT_CONSTANTS.affCookieNames.forEach(function(cookieName, index) {
        promises.push(popup.getCookiesMatchingProperty("name", cookieName));
      });

      bg.AT_CONSTANTS.affCookieDomainNames.forEach(function(cookieDomain) {
        promises.push(popup.getCookiesMatchingProperty("domain", cookieDomain));
      });

      Promise.all(promises).then(function (cookiesArr) {
        cookiesArr.forEach(function(matchedCookies) {
          popup.matchedCookies.push.apply(popup.matchedCookies, matchedCookies);
        });
        popup.appendMerchant(popup.matchedCookies);
        resolve(popup.matchedCookies);
      });
    });
  },

  /**
   * Adds a merchant field to the cookie objects.
   *
   * @param{array} cookies Array of cookies.
   */
  appendMerchant: function(cookies) {
    var bg = this.background;
    cookies.forEach(function(cookie, index) {
      cookie["merchant"] = bg.ATParse.getMerchant("Cookie", [cookie.domain,
            cookie.name]);
    });
  },


  /**
   * Pulls the stored values from storage and populates the DOM.
   *
   * @public
   */
  populateDom: function() {
    var divEl = document.getElementById("merchant-info");
    var popup = AffiliateTrackerPopup;
    popup.getAllMatchingCookies().then(function(cookies) {
      if (cookies.length > 0) {
        var tableEl = popup.createTable();
        divEl.appendChild(tableEl);
        cookies.forEach(function(cookie) {
          var row = popup.createRow(cookie);
          tableEl.children[1].append(row); //append row to tbody
        });
      } else {
        //TODO: display message saying no cookies!
      }
    });
  },


  /**
   * Return table element with header and body elements. Rows will be added
   * later.
   * <table>
   *  <thead>
   *    <tr>
   *      <th>
   *    </tr>
   *  </thead>
   *  <tbody>
   *  </tbody>
   * </table>
   */
  createTable: function() {
    var tableEl = document.createElement('table');
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");

    ["", "Merchant", "Affiliate", "Source"].forEach(function(field) {
      var th = document.createElement("th");
      tr.appendChild(document.createTextNode(field));
      tr.appendChild(th);
    });

    thead.appendChild(tr);
    tableEl.appendChild(thead);
    tableEl.className = "u-full-width";

    tbody = document.createElement("tbody");
    tableEl.appendChild(tbody);
    return tableEl;
  }
};


// This should really be done with the event registration API? The alternate
// to the following.
document.addEventListener('DOMContentLoaded', function () {
  AffiliateTrackerPopup.populateDom();
});
