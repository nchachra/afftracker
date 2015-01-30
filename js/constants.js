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
  NOTIFICATION_ID: "AffiliateTracker_notif",


  /**
   * Key used to store a unique identifier for the user in the local store.
   * This value of this key is used to determine whether information for a
   * given cookie belongs to a single user.
   *
   * @const
   */
  USER_ID_STORAGE_KEY: "AffiliateTracker_userId",


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
                    //"referred_by", /*Ones I have seen were one time referrals.*/
                    //"referal",
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

 /**
   * Regular expression used for matching visited merchant URLs for merchants
   * where we have a merchant<->cookieName match.
   */
  UrlRe: RegExp([  /* Amazon sites */
                  '(amazon\\.(in|com|de|at|ca|cn|fr|it|co\\.jp|es|co\\.uk))',
                  '|(joyo\\.com)',
                  '|(amazonsupply\\.com)',
                  '|(javari\\.(co\\.uk|de|fr|jp))',
                  '|(buyvip\\.com)',

                  /* Hosting sites*/
                  '|tracking\\.(hostgator\\.com)', //Hostgator
                  '|(dreamhost\\.com)\\/redir\\.cgi\\?ad=rewards\\|\\d+',
                  '|(bluehost\\.com)\\/',
                  '|(justhost\\.com)\\/',
                  '|(hostmonster\\.com)\\/',
                  '|(hosting24\\.com)\\/',
                  '|(inmotionhosting.com)\\/',
                  '|(ipage.com)\\/',
                  '|(fatcow.com)\\/',
                  '|(webhostinghub.com)\\/',
                  '|(ixwebhosting.com)\\/',
                  '|(webhostingpad.com)\\/',
                  '|(hostrocket.com)\\/',
                  '|(arvixe.com)\\/',
                  '|(startlogic.com)\\/',
                  '|(bizland.com)\\/',
                  '|(ipower.com)\\/',
                  '|(lunarpages.com)\\/',

                  /* Travel/Booking sites*/
                  '|(hotelscombined.com)\\/',
                  '|brands.(datahc.com)\\/',
                  /* Envato marketplace sites */
                  '|(themeforest.net)\\/',
                  '|(codecanyon.net)\\/',
                  '|(videohive.net)\\/',
                  '|(audiojungle.net)\\/',
                  '|(graphicriver.net)\\/',
                  '|(photodune.net)\\/',
                  '|(3docean.net.net)\\/',
                  '|(activeden.net)\\/',
                  '|(envato.com)\\/',

                  /* Others */
                  '|(hidemyass.com)\\/',

                  /* Commission Junction */
                  '|((\\/click-\\d+-\\d+)(&.*)?$)',
                ].join(''), 'i'),

  /**
   * This expression is used to identify affiliate cookies and to extract an
   * affiliate ID from a cookieName=cookieValue string. Note that groups are
   * used to extract an affiliate ID and the affiliate ID is the last matched
   * group in all cases. If this assumption is violated, the use of this
   * expression must also be altered.
   */
  cookieAffRe: RegExp([
            // Amazon.cn uses UserPref=-; to indicate no referral.
            '(UserPref=[^-]+)',
            //Hostgator. The portion after . is aff id.
            '|(GatorAffiliate=\\d+\\.(.+))',

            // Bluehostt, justhost, hostmonster have either
            // Either r=<affId>^<campaignId>^<srcUrl>  or
            // r=cad^<affId>^<randomString>
            // The cookies are URL encoded and ^ is %5E.
            '|(r=cad\\%5E(.+)\\%5E.*)',
            '|(r=(.*)\\%5E.*\\%5E.*)',

            // Hosting24: Aff=id;
            // Inmotionhosting: affiliates=id
            // ixwebhosting.com: IXAFFILIATE=id
            // Webhostinghub.com: refid=id;
            '|((aff|affiliates|affiliate|IXAFFILIATE|refid)=(.*))',
            // lunarpages.com: lunarsale=id;
            // hidemyass: aff_tag=id
            '|((lunarsale|aff_tag)=(.*))',
            //'|((lunarsale|referal|referred_by|aff_tag)=(.*))',
            // Envato sites: referring_user=id;
            // Hotelscombined: a_aid=id;
            '|((referring_user|WHMCSAffiliateID)=(.*))',
            '|((amember_aff_id|a_aid)=(.*))',
            //ShareASale
            '|(MERCHANT=(.*))',

            //ipage.com, fatcow.com, startlogic.com, bizland.com, ipower.com:
            //AffCookie=things&stuff&AffID&655061&more&stuff
            '|(AffCookie=.*&AffID&(\\w+)&.*)',

            //dreamhost.com: referred=rewards|id
            //It is sometimes URL encoded, so | is %7C
            '|(referred=rewards(\\%7C|\\|)(.*))',

            //idev belongs to the idev affiliate program.
            //Appears in a few forms
            //idev=id
            '|(idev=([^-]*))',
            // webhostingpad: idev=<affid>----------<urlencodedreferrer>
            // hostrocket.com: idev=<affid>-<referrer>------<hostrocketURL>
            // arvixe.com: idev=<affid>-<referrer>-------<arvixeURL>
            '|(idev=(.*)[-]+.*)',

            // AffiliateWizAffiliateID=AffiliateID=41266&...
            '|(AffiliateWizAffiliateID=AffiliateID=(\\d+)&.*)',

            // AffiliateWindow.
            // Merchant is represented by digits after aw.
            // awDIGITS=publisherId|adclickedId|adgroupid|timeofclick|
            //    referenceaddedbyreferrer|typeofad|idforproduct
            // awpvDIGITS=publisherId|somethingelse
            // refer:http://goo.gl/HOChii
            '|(aw\\d+=(\\d+)\\|.*)',
            '|(awpv\\d+=(\\d+)\\|.*)',

            // LinkShare.
            // Merchant is represented by digits followed by lsclick_mid in
            // the cookie name.
            // lsclick_midMERCHANTID=TIMESTAMP|AFFID-RANDOMSTRING
            // linkshare_cookieMID=AID:MID
            '|(lsclick_mid\\d+=.*\\|(.*)-.*)',
            '|(linkshare_cookie\\d+=(\\d+):\\d+)',

            // Commission Junction
            // It does not contain the affiliate ID in the cookie name though.
            '|(LCLK=.*)',

            // PAPVisitorPro software
            '|(PAPVisitorId=(.*))',
        ].join('')),
};
