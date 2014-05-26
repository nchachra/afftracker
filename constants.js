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
   * @const
   */
  NOTIFICATION_ID: this.KEY_ID_PREFIX + "notif",


  /**
   * Key used to store a unique identifier for the user in the local store.
   * This value of this key is used to determine whether information for a
   * given cookie belongs to a single user.
   *
   * @const
   */
  USER_ID_STORAGE_KEY: this.KEY_ID_PREFIX + "userId",


  /**
   * Sites owned by Amazon. Amazon so far is unique in our data which does
   * not contain affiliate ID easily available from the cookie.
   *
   * @const
   */
  AMAZON_SITES: ["amazon.com", "amazon.de", "amazon.at", "amazon.ca",
      "amazon.cn", "amazon.fr", "amazon.it", "amazon.co.jp", "amazon.es",
      "amazon.co.uk", "joyo.com", "amazon.in", "amazonsupply.com",
      "javari.co.uk", "javari.de", "javari.fr", "javari.jp", "buyvip.com"],


  /**
   * An initial mapping of affiliate cookie names. We use this to initially
   * populate the information displayed to the user. Note that this array is
   * mutable and we add more cookie names to it as we discover them.
   *
   * @public
   */
  affCookieNames: ["GatorAffiliate",
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
                    "aff_tag",
                    "MERCHANT", //shareAsale
                    "LCLK", //  CJ
                   ],


  /**
   * We use this mapping to populate the dom with cookies where the cookie
   * name is not unique to a program. For example, AffiliateWindow cookies
   * all begin with "aw" but have different names. 
   */
  affCookieDomainNames: [".awin1.com", //AffiliateWindow
                         ".linksynergy.com", // LinkSynergy
                        ],

};
