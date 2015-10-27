chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if ("feeds" in request) {
            handleFeeds(request.feeds, request.url);
        }
        if ("currentLink" in request) {
            handleVisit(request.currentLink);
        }
});

chrome.alarms.create('RSSUpdate', {periodInMinutes: 1});

chrome.alarms.onAlarm.addListener(function(alarm) {
    if (alarm.name == 'RSSUpdate') {
        updateRSS();
        updateBadge();
    }
});

/* Updates the unread fields of all our RSS feeds. */
function updateRSS() {
    chrome.storage.local.get(null, function(data) {

        for (var domain in data) {
            getFeedLinksExtended(data[domain].feed_url, domain,
            function(feedLinks, domain) {
                var domainData = data[domain];
                var unreadDiff = feedLinks.filter(function(element, index, array) {
                    return domainData.unread.indexOf(element) == -1
                        && domainData.read.indexOf(element) == -1;
                });
                var toSet = {};
                toSet[domain] = data[domain];
                // Maintain new -> old
                toSet[domain].unread = unreadDiff.concat(data[domain].unread);
                if (unreadDiff.length > 0) {
                    chrome.storage.local.set(toSet);
                }
            });

        }
    });

}

/* Updates the badge text to be the number of unread posts */
function updateBadge() {
    chrome.browserAction.setBadgeBackgroundColor({color: "red"});

    chrome.storage.local.get(null, function(data) {
        total = 0;
        for (var domain in data) {
            if (data[domain].favorite) {
                total += data[domain].unread.length;
            }
        }
        if (total > 0) {
            chrome.browserAction.setBadgeText({text: total.toString()});
        } else {
            chrome.browserAction.setBadgeText({text: ""});
        }
    });
}

/* Extracts the domain part of a url.
 * @param{string} url: The URL.
 */
function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) {
        domain = url.split('/')[2];
    }
    else {
        domain = url.split('/')[0];
    }

    //find & remove port number
    domain = domain.split(':')[0];

    return domain;
}

function stripTrailingSlash(str) {
    if(str.substr(-1) === '/') {
        return str.substr(0, str.length - 1);
    }
    return str;
}

/* Sees if two URIs are identical, ignoring scheme
 * e.g. compareUrisWithoutScheme("https://xkcd.com", "http://xkcd.com") == true
 * e.g. compareUrisWithoutScheme("http://xkcd.com", "http://xkcd.com") == true
 * e.g. compareUrisWithoutScheme("http://xkcd.com", "http://xkcd.cum") == false
 * @param{string} subject1: One URI.
 * @param{string} subject2: The other URI.
 */
function compareUrisWithoutScheme(subject1, subject2) {
    return stripTrailingSlash(subject1.replace(/.*?:\/\//g, ""))
        == stripTrailingSlash(subject2.replace(/.*?:\/\//g, ""));
}

/* Handles an array of feeds. Should be called when the scraper sends a list of feeds from a
 * site.
 * @param{Array[string]} feedList: An array of URLs that SHOULD link to feeds from the site.
 */
function handleFeeds(feedList, url) {
    var feedURL = feedList[0];
    var domain = extractDomain(url);
    chrome.storage.local.get(domain, function(domainData) {
        if (!(domain in domainData)) {
            getFeedLinks(feedURL, function(feedLinks) {
                var toSet = {};
                var inner = {
                    'favorite': false,
                    'feed_url': feedURL,
                    'read': feedLinks,
                    'unread': []
                };
                toSet[domain] = inner;
                chrome.storage.local.set(toSet);
            });
        }
    });
}

/* Handles a site visit. Should update the unreads
 * @param{string} url: A URL of a visited site.
 */
function handleVisit(url) {
    var domain = extractDomain(url);
    chrome.storage.local.get(domain, function(domainData) {
        if (domain in domainData) {
            console.log(url);
            for (i = 0; i < domainData[domain].unread.length; i++) {
                console.log(domainData[domain].unread[i]);
                if (compareUrisWithoutScheme(domainData[domain].unread[i], url)) {
                    //Add element to read
                    domainData[domain].read.push(domainData[domain].unread[i]);
                    domainData[domain].unread.splice(i, 1); // removes element at index i
                }
            }

            chrome.storage.local.set(domainData);
        }
    });
    updateBadge();
}

/* Gets links from a feed URL
 * @param{string} url: A URL of a feed.
 * @param{function} callback: A function that gets called when the links come in.
 * Takes one argument which is an array of links.
 */
function getFeedLinks(url, callback) {
    getFeedLinksExtended(url, null, callback);
}

/* Gets links from a feed URL and passes you the data for the domain so it doesn't get fucked.
 * @param{string} url: A URL of a feed.
 * @param{string} domain: The domain of the feed.
 * @param{function} callback: A function that gets called when the links come in.
 * Takes two arguments first is an array of links second is the domain data.
 * Links ordered new -> old.
 */
function getFeedLinksExtended(url, domain, callback) {
    $.getFeed({
        url: url,
        success: function(feed) {
                    callback(feed.items.map(function(item) {
                        return item.link;
                    }), domain);
                 }
    });

}
