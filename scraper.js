/*
 * Searches the currently loaded document for an RSS/Atom feed link.
 * There's no guarentees that any of these are *actually* feeds.
 * Returns null if unfound.
 */
HTMLCollection.prototype.filter = Array.prototype.filter;

function findPotentialFeeds() {
    var feeds = document.getElementsByTagName("link").filter(function(elem) {
        var link = elem.href.toLowerCase();
        return elem.type == "application/atom+xml" || elem.type == "application/rss+xml"
            || link.includes("rss") || link.includes("atom") || link.includes("xml");
    });

    feeds = feeds.concat(document.getElementsByTagName("a").filter(function(elem) {
        var link = elem.href.toLowerCase();
        return link.includes("rss") || link.includes("atom") || link.includes("feed") ||
            link.includes("xml") || elem.class == "rss" || elem.class == "atom" ||
            elem.class == "feed";
    }));

    return feeds.map(function(elem) {
        var link = elem.href;
        if (link.includes("feedburner")) {
            link = link + "?format=xml";
        }
        return link;
    });
}

/*
 * Verifies a link to make sure it links to a properly formatted RSS or Atom feed.
 * @param{string} feedLink: Link to a potential RSS or Atom feed.
 * @param{function} callback: A function that takes one variable that is true if
 * the link is a feed and false if it isn't.
 */

function verifyFeed(feedLink, callback) {
    var request = new XMLHttpRequest();
    request.onreadystatechange = function () {
        var DONE = this.DONE || 4;
        if (this.readyState === DONE) {
            var parser = new DOMParser();
            xmlDom = parser.parseFromString(this.responseText, "text/xml");
            callback(xmlDom.getElementsByTagName("rss").length > 0 || 
                xmlDom.getElementsByTagName("feed").length > 0);
        }
    };

    request.open('GET', feedLink, true);
    request.send(null);
}

/*
 * Find all feeds.
 * Finds all the feed links on a site that have been verified to actually be feeds.
 * @param{function} callback: A function that is called when feeds have been filtered.
 * Takes a single parameter which is a list of the filtered list.
 */
function findFeeds(callback) {
    var unfiltered = findPotentialFeeds();
    async.filter(unfiltered, verifyFeed, callback);
}

/* Send over all the feeds we find to the main extension */
findFeeds(function (links) {
    if (links.length > 0) {
        chrome.runtime.sendMessage({feeds: links, url: document.URL}, function(response) {});
    }
});

chrome.runtime.sendMessage({currentLink: document.URL});
