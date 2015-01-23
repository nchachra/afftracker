describe("AffiliateTracker background script test suite", function () {

  // ATBg.getMerchantfromCookieParams()
  it("tests getMerchantFromCookieParams() commission junction logic", function() {
    var merchant = ATBg.getMerchantFromCookieParams("any.domain", "LCLK");
    expect(merchant).toEqual("commission junction");
  });

  it("tests getMerchantFromCookieParams() leading dot", function () {
    var merchant = ATBg.getMerchantFromCookieParams(".any.domain", "AnyCookieName");
    expect(merchant).toEqual("any.domain");
  });

  it("tests getMerchantFromCookieParams() .amazon.com", function () {
    var merchant = ATBg.getMerchantFromCookieParams(".amazon.com", "UserPref");
    expect(merchant).toEqual("amazon.com");
  });

  it("tests getMerchantFromCookieParams() leading www.", function () {
    var merchant = ATBg.getMerchantFromCookieParams("www.any.domain", "AnyCookieName");
    expect(merchant).toEqual("any.domain");
  });

  it("tests getMerchantFromCookieParams() subdomain#1", function() {
    var merchant = ATBg.getMerchantFromCookieParams("www.a.b.com", "AnyCookieName");
    expect(merchant).toEqual("b.com");
  });

  it("tests getMerchantFromCookieParams() subdomain#2", function() {
    var merchant = ATBg.getMerchantFromCookieParams("a.b.com", "AnyCookieName");
    expect(merchant).toEqual("b.com");
  });

  it("tests getMerchantFromCookieParams() subdomain#3", function() {
    var merchant = ATBg.getMerchantFromCookieParams(".a.b.com", "AnyCookieName");
    expect(merchant).toEqual("b.com");
  });

  it("tests getMerchantFromCookieParams() shareasale", function() {
    var merchant = ATBg.getMerchantFromCookieParams(".shareasale.com", "MERCHANT12808");
    expect(merchant).toEqual("shareasale.com (merchant:12808)");
  });

  it("tests getMerchantFromCookieParams() affiliate window", function() {
    var merchant = ATBg.getMerchantFromCookieParams(".awin1.com", "aw3041");
    expect(merchant).toEqual("affiliate window (merchant:3041)");
  });

  it("tests getMerchantFromCookieParams() linkshare#1", function() {
    var merchant = ATBg.getMerchantFromCookieParams(".linksynergy.com", "linkshare_cookie236989");
    expect(merchant).toEqual("linkshare (merchant:236989)");
  });

  it("tests getMerchantFromCookieParams() linkshare#2", function() {
    var merchant = ATBg.getMerchantFromCookieParams(".linksynergy.com", "lsclick_mid37757");
    expect(merchant).toEqual("linkshare (merchant:37757)");
  });

  // parseAffiliateId()
  it("tests parseAffiliateId() from Amazon Cookie", function() {
    var aff = ATBg.parseAffiliateId("amazon.com", "UserPref=blahblablaj", "COOKIE");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateId() from Incorrect argType", function() {
    var aff = ATBg.parseAffiliateId("amazon.com", "UserPref=blahblablaj", "NEWP");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateId() from hostgator affiliate", function() {
    var aff = ATBg.parseAffiliateId("hostgator.com", "GatorAffiliate=0000.somename", "COOKIE");
    expect(aff).toEqual("somename");
  });

  it("tests parseAffiliateId() bluehost/justhost/hostmonster affiliate #1", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "r=cad%5Eaffiliate%5Erandomstring", "COOKIE");
    expect(aff).toEqual("affiliate");
  });

  it("tests parseAffiliateId() bluehost/justhost/hostmonster affiliate #2", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "r=affiliate%5Erandomstring%5Esrcurl", "COOKIE");
    expect(aff).toEqual("affiliate");
  });

  it("tests parseAffiliateId() hosting24 affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "aff=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() webhostinghub affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "refid=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() lunarpages affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "lunarsale=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() hidemyass affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "aff_tag=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() inmotionhosting affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "affiliates=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() ixwebhosting.com affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "IXAFFILIATE=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() envato affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "referring_user=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() hotelscombined affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "a_aid=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() WHMCSA affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "WHMCSAffiliateID=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() amember_aff_id affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "amember_aff_id=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() shareasale affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "MERCHANT=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() ipage/fatcow/startlogic/bizland/ipower affiliate", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "AffCookie=things&stuff&AffID&testid&more&things", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() dreamhost affiliate #1", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "referred=rewards|testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() dreamhost affiliate #2", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "referred=rewards%7Ctestid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() idev #1", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "idev=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() idev #1", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "idev=testid-ramdomstuff", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() AffiliateWizAffiliateID #1", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "AffiliateWizAffiliateID=AffiliateID=1111&something", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() affiliate window", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "aw0=1111|somestuff", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() linkshare #1", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "linkshare_cookie0000=1111:0000", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() linkshare #2", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "lsclick_mid0000=stuff|1111-value", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() CJ", function() {
    var aff = ATBg.parseAffiliateId("anydomain", "LCLK=value", "COOKIE");
    expect(aff).toBe(null);
  });

  //parseAffiliateIdFromAmazonURL
  it("tests parseAffiliateIdFromAmazonURL() without tag", function() {
    var aff = ATBg.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/exec/obidos/ASIN/blahblah/test-20");
    expect(aff).toEqual("test-20");
  });

  it("tests parseAffiliateIdFromAmazonURL() with tag#1", function() {
    var aff = ATBg.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/gp/product/proid?ie=UTF8&tag=horrible-20&linkCode=woop&camp=0000&creativeASIN=0000000X");
    expect(aff).toEqual("horrible-20");
  });

  it("tests parseAffiliateIdFromAmazonURL() with tag#2", function() {
    var aff = ATBg.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/gp/product/proid?ie=UTF8&tag=horrible-20");
    expect(aff).toEqual("horrible-20");
  });

  it("tests parseAffiliateIdFromAmazonURL() with tag#3", function() {
    var aff = ATBg.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/gp/product/?tag=horrible-20");
    expect(aff).toEqual("horrible-20");
  });


  it("tests parseAffiliateIdFromCJ() encrypted", function() {
    var aff = ATBg.parseAffiliateIdFromCJ("somedomain/somedir");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateIdFromCJ() no trailing slash", function() {
    var aff = ATBg.parseAffiliateIdFromCJ("somedomain");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateIdFromCJ() correct format cj url", function() {
    var aff = ATBg.parseAffiliateIdFromCJ("somedomain/click-PID-AID");
    expect(aff).toEqual("PID");
  });


});
