Many online merchants have affiliate programs which are marketing initiatives
that compensate individuals for marketing their online store or products. When
an affiliate refers a customer to a merchant (usually as a result of user
    click), the merchant stores a cookie locally on the referred user's browser
to later identify and compensate the affiliate when user makes a purchase.

The purpose of AffiliateTracker is to inform the user about the affiliate that
will earn commission for a given purchase. It identifies the affiliate, the
merchant program the affiliate is advertising for, and also the Web page that
resulted in the user receiving a cookie. These cookies that are used by
affiliate programs to identify an affiliate are called "Affiliate Cookies" in
the rest of this document.

Currently, the extension is purely informative and hopes to identify fraudent
cases of affiliate marketing whereby a user gets an affiliate cookie without
having clicked on any merchant links.


The extension uses the following features to identify the affiliate:

* It parses out the affiliate ID from the URL that led the user to get a
  an "Affiliate Cookie".
* It uses the value of the Affiliate Cookie to identify the affiliate and
  identifies the Web visit that resulted in the associated Set-Cookie header.

This extension is part of a research project at University of California,
San Diego to identify affiliate fraud in the wild. When a user encounters
an affiliate cookie, information about the cookie is also sent and stored at
affiliatetracker.ucsd.edu. This extension does not gather any Personally
Identifiable Information (PII) including user's IPs or even the values of
cookies. The only data collected corresponds to affiliate cookies and the
associated merchant programs.

Extension URL:  https://chrome.google.com/webstore/detail/affiliatetracker/aifikahpmikjjlaoknlnhnjobdakoppn
