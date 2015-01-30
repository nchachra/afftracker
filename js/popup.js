var ATPopup = {

  background: chrome.extension.getBackgroundPage(),

  displayedCookies: [],


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
      return "";
    }
  },


  /**
   * Returns promise for local storage objects that this extension has stored.
   */
  getLocalStoreObjects: function() {
    return new Promise(function(resolve, reject) {
      chrome.storage.sync.get(null, function(objects) {
        console.log("chrome gave me: ", objects);
        resolve(objects);
      });
    });
  },


  /**
   * Returns a promise with rows.
   *
   * @param{array} cookies Array of cookies
   * @return{array} array of rows
   *
   * @private
   */
  createRows: function(cookies) {
    return new Promise(function(resolve, reject) {
      var rows = [];
      console.log("in create rows: ", cookies);
      ATPopup.getLocalStoreObjects().then(function(objects) {
        console.log("local store objects: ", objects);
        var cj = [];
        cookies.forEach(function(cookie) {
          // Commission Junction sets multiple cookies with same value. In
          // these cases, just show one, but keep tabs on the other one too
          // in case we have to delete it later.
          if (cookie.name === "LCLK") {
            console.log("cookie: ", cookie);
            if (cj.indexOf(cookie.value) === -1) {
              cj.push(cookie.value);
            } else {
              ATPopup.displayedCookies.push(cookie);
              return;
            }
          }
          var merchantKey = ATPopup.background.AT_CONSTANTS.KEY_ID_PREFIX +
            cookie.merchant;
          if (objects.hasOwnProperty(merchantKey)) {
            if (cookie.name === objects[merchantKey].cookieName &&
                cookie.value === objects[merchantKey].cookieValue) {
              console.log("creating row: ", cookie, objects[merchantKey]);
              row = ATPopup.createRow(cookie, objects[merchantKey]);
              console.log("created row: ", row);
              rows.push(row);
              ATPopup.displayedCookies.push(cookie);
            }
          }
        });
        console.log("returning rows", rows);
        resolve(rows);
      });
    });
  },


  /**
   * creates and returns a single row.
   * <tr>
   *   <td>Icon</td>
   *   <td> Merchant </td>
   *   <td> Affiliate </td>
   *   <td> Source </td>
   *  </tr>
   */
  createRow: function(cookie, storageObj) {
    row = document.createElement('tr');

    var icon = document.createElement("img");
    icon.className = "program-icon"
    icon.src = ATPopup.getImgUrl(cookie.merchant);
    var iconCell = document.createElement('td');
    iconCell.appendChild(icon);
    if (icon.src) {
      row.appendChild(iconCell);
    }

    var fields = [
      cookie.merchant || "",
      storageObj.affiliate || "",
      storageObj.origin || ""
    ];
    fields.forEach(function(field) {
      var td = document.createElement("td");
      var text = document.createTextNode(field);
      td.appendChild(text);
      row.appendChild(td);
    });
    return row;
  },


  /**
   * Pulls the stored values from storage and populates the DOM.
   *
   * @public
   */
  populateDom: function() {
    var divEl = document.getElementById("merchant-info");
    var p = document.createElement('p');
    p.id = "no-cookie-msg";
    p.appendChild(document.createTextNode("No delicious affiliate "+ 
        "cookies found. Browse away!"));
    divEl.appendChild(p);
    p.className = "visible";

    var popup = ATPopup;
    ATPopup.background.ATBg.getAllMatchingCookiesWithMerchants().then(
        function(cookies) {
      console.log("matched cookies: ", cookies);
      if (cookies.length > 0) {
        var tableEl = popup.createTable();
        popup.createRows(cookies).then(function(rows) {
          console.log("Got rows: ", rows);
          rows.forEach(function(row) {
            tableEl.children[1].appendChild(row);
          });
          if (rows && rows.length) {
            p.className = "hide";
            divEl.appendChild(tableEl);
            divEl.appendChild(ATPopup.getDeleteButton());
          } else {
            p.className = "visible";
          }
        });
      }
    });
  },


  /**
   * Returns a button with an onclick attached to delete all visible cookies.
   */
  getDeleteButton: function() {
    var button = document.createElement("button");
    button.id = "delete-btn";
    button.className = button.className + " button-primary delete-button";
    button.appendChild(document.createTextNode("Delete displayed cookies"));
    button.onclick = ATPopup.deleteDisplayedCookies;
    return button;
  },


  /**
   * Deletes the displayed cookies.
   */
  deleteDisplayedCookies: function() {
    ATPopup.displayedCookies.forEach(function(cookie) {
      var cookieUrl = cookie.domain[0] === "." ?
        "http://www." + cookie.domain :
        "http://" + cookie.domain;
      chrome.cookies.remove({"url": cookieUrl, "name": cookie.name,
          "storeId": cookie.storeId}, function(deletedCookie) {
            console.log("deleted cookie: ", cookie); //null when call fails.
      });
    });
    document.getElementById("aff-program-tbl").className = "hide";
    document.getElementById("delete-btn").className = "hide";
    document.getElementById("no-cookie-msg").className = "visible";
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
    tableEl.id = "aff-program-tbl";
    var thead = document.createElement("thead");
    var tr = document.createElement("tr");

    ["", "Merchant", "Affiliate", "Source"].forEach(function(field) {
      var th = document.createElement("th");
      var textNode = document.createTextNode(field);
      th.appendChild(textNode);
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
  ATPopup.populateDom();
});
