describe("parseutils.js tests", function () {

  //getMerchant
  it("tests getMarchant() cookie domain, cookie value", function() {
    var aff = ATParse.getMerchant("Cookie", ["any.domain", "LCLK"]);
    expect(aff).toEqual("commission junction");
  });

  it("tests getMarchant() incorrect type", function() {
    var aff = ATParse.getMerchant("CookieNot", ["any.domain", "LCLK"]);
    expect(aff).toBe(null);
  });

  it("tests getMarchant() incorrect cookie arglength", function() {
    var aff = ATParse.getMerchant("Cookie", ["any.domain"]);
    expect(aff).toBe(null);
  });

  it("tests getMarchant() incorrect url arglength", function() {
    var aff = ATParse.getMerchant("URL", ["any.domain", "Asdfsdfkhasdjf"]);
    expect(aff).toBe(null);
  });

  //getMerchantFromUrl
  it("tests getMerchantFromUrl amazon merchant #1", function() {
    var merchant = ATParse.getMerchantFromUrl("www.amazon.com/asfadsfh");
    expect(merchant).toEqual("amazon.com");
  });

  it("tests getMerchantFromUrl amazon merchant #2", function() {
    var merchant = ATParse.getMerchantFromUrl("amazon.com/asfadsfh");
    expect(merchant).toEqual("amazon.com");
  });

  it("tests getMerchantFromUrl cj merchant", function() {
    var merchant = ATParse.getMerchantFromUrl("www.domain.com/click-0000-1111");
    expect(merchant).toEqual("commission junction (merchant: 1111)");
  });

  it("tests getMerchantFromUrl unrecognized url", function() {
    var merchant = ATParse.getMerchantFromUrl("www.domain.com/asdfasdf");
    expect(merchant).toBe(null);
  });


  it("tests getCookieParameter() domain in cookie ", function() {
    var mockCookie = "Set-Cookie: UserPref=arbitraryvalue+/whateverlettre/asdfjh; path=/; domain=.amazon.com; expires=Tue, 08-Apr-2014 06:22:13 GMT"
    var param = ATParse.getCookieParameter(mockCookie, "domain");
    expect(param).toEqual(".amazon.com");
  });

  it("tests getCookieParameter() path in cookie", function() {
    var mockCookie = "Set-Cookie: UserPref=arbitraryvalue+/whateverlettre/asdfjh; path=/; domain=.amazon.com; expires=Tue, 08-Apr-2014 06:22:13 GMT"
    var param = ATParse.getCookieParameter(mockCookie, "path");
    expect(param).toEqual("/");
  });

  it("tests getCookieParameter() expires in cookie", function() {
    var mockCookie = "Set-Cookie: UserPref=arbitraryvalue+/whateverlettre/asdfjh; path=/; domain=.amazon.com; expires=Tue, 08-Apr-2014 06:22:13 GMT"
    var param = ATParse.getCookieParameter(mockCookie, "expires");
    expect(param).toEqual("Tue, 08-Apr-2014 06:22:13 GMT");
  });

  it("tests getCookieParameter() domain not in cookie and arg not provided", function() {
    var mockCookie = "Set-Cookie: UserPref=arbitraryvalue+/whateverlettre/asdfjh; path=/; expires=Tue, 08-Apr-2014 06:22:13 GMT"
    var param = ATParse.getCookieParameter(mockCookie, "domain");
    expect(param).toBe(null);
  });

  it("tests getCookieParameter() domain not in cookie and arg provided amazon", function() {
    var mockCookie = "Set-Cookie: UserPref=arbitraryvalue+/whateverlettre/asdfjh; path=/; expires=Tue, 08-Apr-2014 06:22:13 GMT"
    var param = ATParse.getCookieParameter(mockCookie, "domain", "http://www.amazon.com/something");
    expect(param).toEqual("www.amazon.com");
  });

  it("tests getCookieParameter() arbitrary keyword no defaults", function() {
    var mockCookie = "Set-Cookie: UserPref=arbitraryvalue+/whateverlettre/asdfjh; path=/; expires=Tue, 08-Apr-2014 06:22:13 GMT"
    var param = ATParse.getCookieParameter(mockCookie, "notincookiever");
    expect(param).toBe(null);
  });















  // ATParse.getMerchantfromCookieParams()
  it("tests getMerchantFromCookieParams() commission junction logic", function() {
    var merchant = ATParse.getMerchantFromCookieParams("any.domain", "LCLK");
    expect(merchant).toEqual("commission junction");
  });

  it("tests getMerchantFromCookieParams() leading dot", function () {
    var merchant = ATParse.getMerchantFromCookieParams(".any.domain", "AnyCookieName");
    expect(merchant).toEqual("any.domain");
  });

  it("tests getMerchantFromCookieParams() .amazon.com", function () {
    var merchant = ATParse.getMerchantFromCookieParams(".amazon.com", "UserPref");
    expect(merchant).toEqual("amazon.com");
  });

  it("tests getMerchantFromCookieParams() leading www.", function () {
    var merchant = ATParse.getMerchantFromCookieParams("www.any.domain", "AnyCookieName");
    expect(merchant).toEqual("any.domain");
  });

  it("tests getMerchantFromCookieParams() subdomain#1", function() {
    var merchant = ATParse.getMerchantFromCookieParams("www.a.b.com", "AnyCookieName");
    expect(merchant).toEqual("b.com");
  });

  it("tests getMerchantFromCookieParams() subdomain#2", function() {
    var merchant = ATParse.getMerchantFromCookieParams("a.b.com", "AnyCookieName");
    expect(merchant).toEqual("b.com");
  });

  it("tests getMerchantFromCookieParams() subdomain#3", function() {
    var merchant = ATParse.getMerchantFromCookieParams(".a.b.com", "AnyCookieName");
    expect(merchant).toEqual("b.com");
  });

  it("tests getMerchantFromCookieParams() shareasale", function() {
    var merchant = ATParse.getMerchantFromCookieParams(".shareasale.com", "MERCHANT12808");
    expect(merchant).toEqual("shareasale.com (merchant:12808)");
  });

  it("tests getMerchantFromCookieParams() affiliate window", function() {
    var merchant = ATParse.getMerchantFromCookieParams(".awin1.com", "aw3041");
    expect(merchant).toEqual("affiliate window (merchant:3041)");
  });

  it("tests getMerchantFromCookieParams() linkshare#1", function() {
    var merchant = ATParse.getMerchantFromCookieParams(".linksynergy.com", "linkshare_cookie236989");
    expect(merchant).toEqual("linkshare (merchant:236989)");
  });

  it("tests getMerchantFromCookieParams() linkshare#2", function() {
    var merchant = ATParse.getMerchantFromCookieParams(".linksynergy.com", "lsclick_mid37757");
    expect(merchant).toEqual("linkshare (merchant:37757)");
  });

  // parseAffiliateId()
  it("tests parseAffiliateId() from Amazon Cookie", function() {
    var aff = ATParse.parseAffiliateId("amazon.com", "UserPref=blahblablaj", "COOKIE");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateId() from Incorrect argType", function() {
    var aff = ATParse.parseAffiliateId("amazon.com", "UserPref=blahblablaj", "NEWP");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateId() from hostgator affiliate", function() {
    var aff = ATParse.parseAffiliateId("hostgator.com", "GatorAffiliate=0000.somename", "COOKIE");
    expect(aff).toEqual("somename");
  });

  it("tests parseAffiliateId() bluehost/justhost/hostmonster affiliate #1", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "r=cad%5Eaffiliate%5Erandomstring", "COOKIE");
    expect(aff).toEqual("affiliate");
  });

  it("tests parseAffiliateId() bluehost/justhost/hostmonster affiliate #2", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "r=affiliate%5Erandomstring%5Esrcurl", "COOKIE");
    expect(aff).toEqual("affiliate");
  });

  it("tests parseAffiliateId() hosting24 affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "aff=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() webhostinghub affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "refid=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() lunarpages affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "lunarsale=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() hidemyass affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "aff_tag=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() inmotionhosting affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "affiliates=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() ixwebhosting.com affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "IXAFFILIATE=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() envato affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "referring_user=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() hotelscombined affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "a_aid=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() WHMCSA affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "WHMCSAffiliateID=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() amember_aff_id affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "amember_aff_id=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() shareasale affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "MERCHANT=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() ipage/fatcow/startlogic/bizland/ipower affiliate", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "AffCookie=things&stuff&AffID&testid&more&things", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() dreamhost affiliate #1", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "referred=rewards|testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() dreamhost affiliate #2", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "referred=rewards%7Ctestid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() idev #1", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "idev=testid", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() idev #1", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "idev=testid-ramdomstuff", "COOKIE");
    expect(aff).toEqual("testid");
  });

  it("tests parseAffiliateId() AffiliateWizAffiliateID #1", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "AffiliateWizAffiliateID=AffiliateID=1111&something", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() affiliate window", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "aw0=1111|somestuff", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() linkshare #1", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "linkshare_cookie0000=1111:0000", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() linkshare #2", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "lsclick_mid0000=stuff|1111-value", "COOKIE");
    expect(aff).toEqual("1111");
  });

  it("tests parseAffiliateId() CJ", function() {
    var aff = ATParse.parseAffiliateId("anydomain", "LCLK=value", "COOKIE");
    expect(aff).toBe(null);
  });

  //parseAffiliateIdFromAmazonURL
  it("tests parseAffiliateIdFromAmazonURL() without tag", function() {
    var aff = ATParse.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/exec/obidos/ASIN/blahblah/test-20");
    expect(aff).toEqual("test-20");
  });

  it("tests parseAffiliateIdFromAmazonURL() with tag#1", function() {
    var aff = ATParse.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/gp/product/proid?ie=UTF8&tag=horrible-20&linkCode=woop&camp=0000&creativeASIN=0000000X");
    expect(aff).toEqual("horrible-20");
  });

  it("tests parseAffiliateIdFromAmazonURL() with tag#2", function() {
    var aff = ATParse.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/gp/product/proid?ie=UTF8&tag=horrible-20");
    expect(aff).toEqual("horrible-20");
  });

  it("tests parseAffiliateIdFromAmazonURL() with tag#3", function() {
    var aff = ATParse.parseAffiliateIdFromAmazonURL(
      "http://www.amazon.com/gp/product/?tag=horrible-20");
    expect(aff).toEqual("horrible-20");
  });


  it("tests parseAffiliateIdFromCJ() encrypted", function() {
    var aff = ATParse.parseAffiliateIdFromCJ("somedomain/somedir");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateIdFromCJ() no trailing slash", function() {
    var aff = ATParse.parseAffiliateIdFromCJ("somedomain");
    expect(aff).toBe(null);
  });

  it("tests parseAffiliateIdFromCJ() correct format cj url", function() {
    var aff = ATParse.parseAffiliateIdFromCJ("somedomain/click-PID-AID");
    expect(aff).toEqual("PID");
  });

  //findCJUrlInReqSeq()
  it("tests findCJUrlInReqSeq() no match", function() {
    var mockReqRespSeq = [
            {
                "url": "http://www.amazon.com/gp/product/193475773X?ie=UTF8&blahblah",
                "statusLine": null,
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.amazon.com/gp/product/doopdoop",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            }
        ];
    var url = ATParse.findCJUrlInReqSeq(mockReqRespSeq);
    expect(url).toBe(null);
  });


  it("tests findCJUrlInReqSeq() with match", function() {
    var mockReqRespSeq = [
            {
                "url": "http://derpderp.com/click-0000-1111",
                "statusLine": null,
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.amazon.com/gp/product/doopdoop",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.notthisone.com/click-2222-3333",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
        ];
    var url = ATParse.findCJUrlInReqSeq(mockReqRespSeq);
    expect(url).toEqual("http://derpderp.com/click-0000-1111");
  });


  it("tests findCJUrlInReqSeq() with match 2", function() {
    var mockReqRespSeq = [
            {
                "url": "http://www.tkqlhce.com/click-2798135-10842761&afsrc=1?sid=benbathandbeyond%2Ecom",
                "statusLine": null,
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.amazon.com/gp/product/doopdoop",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
            {
                "url": "http://www.notthisone.com/click-2222-3333",
                "statusLine": "HTTP/1.1 200 OK",
                "type": "image",
                "method": "GET"
            },
        ];
    var url = ATParse.findCJUrlInReqSeq(mockReqRespSeq);
    expect(url).toEqual("http://www.tkqlhce.com/click-2798135-10842761&afsrc=1?sid=benbathandbeyond%2Ecom");
  });




  //isUsefulCookie
  it("tests isUsefulCookie()  no match ever", function() {
    var flag = ATParse.isUsefulCookie("doesntevenlooklikeaheader");
    expect(flag).toBe(false);
  });

  it("tests isUsefulCookie()  good match #1", function() {
    var cookie = "UserPref=7l0bvq92/bbTY0jkZqRYms5WYVIgStO/og//; path=/; " +
      "domain=.amazon.com; expires=Sat, 31-Jan-2015 22:10:51 GMT";
    var flag = ATParse.isUsefulCookie(cookie);
    expect(flag).toBe(true);
  });

  it("tests isUsefulCookie()  bad match #1", function() {
    var cookie = "UserPref=7l0bvq92/bbTY0jkZqRYms5WYVIgStO/og//; path=/; " +
      "domain=.bluehost.com; expires=Sat, 31-Jan-2015 22:10:51 GMT";
    var flag = ATParse.isUsefulCookie(cookie);
    expect(flag).toBe(false);
  });

  it("tests isUsefulCookie()  bad match #2", function() {
    var cookie = "aw0000=1111|blah; path=/; " +
      "domain=.bluehost.com; expires=Sat, 31-Jan-2015 22:10:51 GMT";
    var flag = ATParse.isUsefulCookie(cookie);
    expect(flag).toBe(false);
  });

  it("tests isUsefulCookie()  good match #2", function() {
    var cookie = "aw0000=1111|blah; path=/; " +
      "domain=.awin1.com; expires=Sat, 31-Jan-2015 22:10:51 GMT";
    var flag = ATParse.isUsefulCookie(cookie);
    expect(flag).toBe(true);
  });








});
