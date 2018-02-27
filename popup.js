function getCurrentTabUrl(callback) {
  // Query filter to be passed to chrome.tabs.query - see
  // https://developer.chrome.com/extensions/tabs#method-query
  var queryInfo = {
    active: true,
    currentWindow: true
  };

  chrome.tabs.query(queryInfo, function (tabs) {
    // chrome.tabs.query invokes the callback with a list of tabs that match the
    // query. When the popup is opened, there is certainly a window and at least
    // one tab, so we can safely assume that |tabs| is a non-empty array.
    // A window can only have one active tab at a time, so the array consists of
    // exactly one tab.
    var tab = tabs[0];

    // A tab is a plain object that provides information about the tab.
    // See https://developer.chrome.com/extensions/tabs#type-Tab
    var url = tab.url;

    // tab.url is only available if the "activeTab" permission is declared.
    // If you want to see the URL of other tabs (e.g. after removing active:true
    // from |queryInfo|), then the "tabs" permission is required to see their
    // "url" properties.
    console.assert(typeof url == 'string', 'tab.url should be a string');

    callback(tab);
  });

  // Most methods of the Chrome extension APIs are asynchronous. This means that
  // you CANNOT do something like this:
  //
  // var url;
  // chrome.tabs.query(queryInfo, function(tabs) {
  //   url = tabs[0].url;
  // });
  // alert(url); // Shows "undefined", because chrome.tabs.query is async.
}

function getTargetBookmark(url, callback) {

  loadJSON(function (response) {
    // Parse JSON string into object
    var bookmarkConfig = JSON.parse(response);
    var hostName = getLocation(url).hostname;
    var targetBookmark = bookmarkConfig.bookmarks.filter(function (config) {
      if (config.bookmarkHost === hostName) {
        return true;
      }
      return false;
    });

    if (targetBookmark.length === 0) {
      callback(null);
    } else {
      targetBookmark = targetBookmark[0];
      chrome.bookmarks.getChildren(targetBookmark.bookmarkKey, function (results) {
        for (var i = 0; i < results.length; i++) {
          var matches = results[i].url.match(targetBookmark.matchKey);
          if (matches != null && matches[0] === url.match(targetBookmark.matchKey)[0]) {
            callback(results[i]);
            break;
          }
        }
      });
    }
  });
}

function getLocation(href) {
  var l = document.createElement("a");
  l.href = href;
  return l;
};

function loadJSON(callback) {

  var xobj = new XMLHttpRequest();
  xobj.overrideMimeType("application/json");
  xobj.open('GET', 'bookmark_configuration.json', true); // Replace 'my_data' with the path to your file
  xobj.onreadystatechange = function () {
    if (xobj.readyState == 4 && xobj.status == "200") {
      // Required use of an anonymous callback as .open will NOT return a value but simply returns undefined in asynchronous mode
      callback(xobj.responseText);
    }
  };
  xobj.send(null);
}

document.addEventListener('DOMContentLoaded', function () {
  getCurrentTabUrl(function (tab) {
    getTargetBookmark(tab.url, function (targetBookmark) {
      if (targetBookmark == null) {
        document.getElementById('sign-result').src = "sign-error.png";
      } else {
        chrome.bookmarks.update(targetBookmark.id, { title: tab.title, url: tab.url }, function (result) {
          if (result) {
            document.getElementById('sign-result').src = "sign-success.png";
          } else {
            document.getElementById('sign-result').src = "sign-error.png";
          }
        });
      }
    });
  });
});