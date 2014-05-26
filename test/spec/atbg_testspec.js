describe("AffiliateTracker background script test suite", function () {

  it("tests getMerchantFromCookieParams() commission junction logic", function() {
    var merchant = ATBg.getMerchantFromCookieParams("any.domain", "LCLK");
    expect(merchant).toEqual("commission junction");
  });

  // TODO: should this actually pass if the domain doesn't end in .com, .net, or .org?!?
  it("tests getMerchantFromCookieParams() leading dot", function () {
    var merchant = ATBg.getMerchantFromCookieParams(".any.domain", "AnyCookieName");
    expect(merchant).toEqual("any.domain");
  });

  // TODO: should this actually pass if the domain doesn't end in .com, .net, or .org?!?
  it("tests getMerchantFromCookieParams() leading www.", function () {
    var merchant = ATBg.getMerchantFromCookieParams("www.any.domain", "AnyCookieName");
    expect(merchant).toEqual("any.domain");
  });

  // TODO: this is what the documentation says, but should it work this way?!?
  it("tests getMerchantFromCookieParams() returns empty string if no merchant found", function () {
    var merchant = ATBg.getMerchantFromCookieParams("bad.domain.com", "BadCookie");
    expect(merchant).toEqual("");
  });

});
