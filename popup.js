document.addEventListener('DOMContentLoaded', draw);

function draw() {
    chrome.storage.local.get(null, function(data) {

        var table = document.getElementById("unreads");
        table.innerHTML = "";
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            var domain = extractDomain(tabs[0].url);
            if (data[domain] != null && data[domain].favorite == false) {
                var startText = document.createTextNode("Click to keep up with ");
                var favicon = document.createElement("img");
                favicon.src = "http://" + domain + "/favicon.ico";
                var span = document.getElementById("wanna");

                span.appendChild(startText);
                span.appendChild(favicon);

                function set(domain, domainData) {
                    span.onclick = function() {
                        var toSet = {};
                        toSet[domain] = domainData;
                        toSet[domain].favorite = true;
                        chrome.storage.local.set(toSet);
                        span.innerHTML = "";
                        draw();
                    };
                }

                set(domain, data[domain]);

            }
        });

        for (var domain in data) {
            if (data[domain].favorite == true && data[domain].unread.length > 0) {
                var row = document.createElement("tr");
                
                var faviconCol = document.createElement("td");
                var favicon = document.createElement("img");
                favicon.src = "http://" + domain + "/favicon.ico";
                faviconCol.appendChild(favicon);
                row.appendChild(faviconCol);

                var numCol = document.createElement("td");
                var num = document.createTextNode(data[domain].unread.length.toString());
                numCol.appendChild(num);
                row.appendChild(numCol);

                function set(domainData, domain) {
                    if (domainData.unread.length > 0) {
                        row.onclick = function() {
                            chrome.tabs.create(
                                {url: domainData.unread[domainData.unread.length - 1]}
                            );
                            draw();
                        };
                    }
                }
                set(data[domain], domain);

                table.appendChild(row);
            }
        }

        if (table.innerHTML == "") {
            var span = document.getElementById("nonew");
            var text = document.createTextNode("No new updates!");
            span.appendChild(text);
        }

        document.getElementsByTagName("body")[0].appendChild(table);
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
