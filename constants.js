AT_CONSTANTS = {

  /**
   * Prefix we use for keys related to this extension in the local storage.
   *
   * @public
   * @const
   */
  KEY_ID_PREFIX: "AffiliateTracker_",

  /**
   * We need notification ID to control when it should be hidden. Unclear why
   * Chrome designed it this way.
   *
   * @private
   * @const
   */
  NOTIFICATION_ID: this.KEY_ID_PREFIX + "notif",

  /**
   * Key used to store a unique identifier for the user in the local store.
   * This value of this key is used to determine whether information for a
   * given cookie belongs to a single user.
   *
   * @private
   * @const
   */
  USER_ID_STORAGE_KEY: this.KEY_ID_PREFIX + "userId",

};


var amazonSites = ["amazon.com", "amazon.de", "amazon.at", "amazon.ca", "amazon.cn",
                    "amazon.fr", "amazon.it", "amazon.co.jp", "amazon.es", "amazon.co.uk",
                    "joyo.com", "amazon.in",
                    "amazonsupply.com",
                    "javari.co.uk", "javari.de", "javari.fr", "javari.jp",
                    "buyvip.com"];


var cookieMap = { /* Amazon sites */
                  "amazon.com": "UserPref",
                  "amazon.de": "UserPref",
                  "amazon.at": "UserPref",
                  "amazon.ca": "UserPref",
                  "amazon.cn": "UserPref",
                  "amazon.fr": "UserPref",
                  "amazon.it": "UserPref",
                  "amazon.co.jp": "UserPref",
                  "amazon.es": "UserPref",
                  "amazon.co.uk": "UserPref",
                  "amazon.in": "UserPref",
                  "joyo.com": "UserPref",
                  "amazonsupply.com": "UserPref",
                  "javari.co.uk": "UserPref",
                  "javari.de": "UserPref",
                  "javari.fr": "UserPref",
                  "javari.jp": "UserPref",
                  "buyvip.com":  "UserPref",

                  /* Hosting sites */
                  "hostgator.com": "GatorAffiliate",
                  "dreamhost.com": "referred",
                  "inmotionhosting.com": "affiliates",
                  "ipage.com": "AffCookie",
                  "fatcow.com": "AffCookie",
                  "startlogic.com": "AffCookie",
                  "ipower.com": "AffCookie",
                  "bizland.com": "AffCookie",
                  "ixwebhosting.com": "IXAFFILIATE",
                  "webhostingpad.com": "idev",
                  "hostrocket.com": "idev",
                  "arvixe.com": "idev",
                  "webhostinghub.com": "refid",
                  "hosting24.com": "aff",
                  "bluehost.com": "r",
                  "hostmonster.com": "r",
                  "justhost.com": "r",
                  "lunarpages.com": "lunarsale",

                  /* Hotels/booking sites*/
                  "hotelscombined.com": "a_aid",
                  "datahc.com": "a_aid", // This is hotelscombined too.

                  /* Envato marketplaces sites */
                  "themeforest.net": "referring_user",
                  "codecanyon.net": "referring_user",
                  "videohive.net": "referring_user",
                  "audiojungle.net": "referring_user",
                  "graphicriver.net": "referring_user",
                  "photodune.net": "referring_user",
                  "3docean.net": "referring_user",
                  "activeden.net": "referring_user",
                  "envato.com": "referring_user",

                  /* Others */
                  "hidemyass.com": "aff_tag",
                 };


var affCookieNames = ["GatorAffiliate",
                      "referred",
                      "affiliates",
                      "AffCookie",
                      "IXAFFILIATE",
                      "r",
                      "lunarsale",
                    "idev",
                   "refid",
                   "aff", /* Results in a lot of porn cookies...*/
                   "WHMCSAffiliateID",
                   "amember_aff_id",
                   "a_aid",
                   "affiliate",
                   "AffiliateWizAffiliateID",
                   "referred_by", /*Ones I have seen were one time referrals.*/
                   "referal",
                   // Most of these are affiliate cookies afaik. But some look
                   // like referers. I'll exclude ones that are obviously URLs.
                   // May need some post-processing cleanup.
                   //"ref",
                   "PAPVisitorId", //post affiliate pro 4
                   "UserPref",
                   "referring_user",
                   "aff_tag"
                   ];



//var miscCookieURLs = ["http://www.shareasale.com"]

// These are included in the above but might be useful later.
// joyo.com redirects to amazon.cn
// kindle.amazon.com
// amazonsupply.com
// wireless.amazon.com
// aws.amazon.com
//webstore.amazon.com
//local.amazon.com
//askville.amazon.com\/(Index.do)?$/;
//webstore.amazon.co.uk\/?$/;
//local.amazon.co.uk\/?$/;
