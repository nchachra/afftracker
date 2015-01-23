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
    cookieSrc: null,
  };
  this.origin = null;
};

/**
 * param{string} affId String affiliate id.
 */
ATSubmission.prototype.setAffiliate = function(affId) {
  console.assert(typeof affId === "string" || affId === null,
        "Affiliate can be set to null or a string value.");
  this.affiliate = affId;
 };

/**
 * param{string} merchant Name of the merchant.
 */
ATSubmission.prototype.setMerchant = function(merchant) {
    console.assert(typeof merchant === "string" || merchant === "null",
        "Merchant can only be a string or null.");
    this.merchant = merchant;
 };

/**
 * Extracts useful information from Chrome's representation of cookie.
 * Also sets the cookieSrc to store to indicate the cookie came from Chrome.
 *
 * param{object} cookie Cookie object from chrome.cookies.
 */
ATSubmission.prototype.setCookie = function(cookie) {
  this.cookie.domain = cookie.domain;
  this.cookie.expirationDate = cookie.expirationDate;
  this.cookie.hostOnly = cookie.hostOnly;
  this.cookie.httpOnly = cookie.httpOnly;
  this.cookie.name = cookie.name;
  this.cookie.path = cookie.path;
  this.cookie.secure = cookie.secure;
  this.cookie.session = cookie.session;
  //this.cookie.storeId = cookie.storeId;
  this.cookie.value = cookie.value;
  this.cookieSrc = "store";
};
