var http = require('http'),
	url = require('url');
    
exports.getToastXml = function(nickname, message) {
    return '<?xml version="1.0" encoding="utf-8"?><wp:Notification xmlns:wp="WPNotification"><wp:Toast><wp:Text1>' + nickname + '</wp:Text1><wp:Text2>' + message + '</wp:Text2></wp:Toast></wp:Notification>';
}

exports.sendToast = function(uri, rawMessage) {
    var siteUrl = url.parse(uri);
    var site = http.createClient(80, siteUrl.host);
    var request = site.request("POST", siteUrl.pathname, {'host' : siteUrl.host, 'Content-Type': 'text/xml', 'Content-Length': rawMessage.length, "X-NotificationClass": "2", "X-WindowsPhone-Target": "toast"});
    request.write(rawMessage);
    request.end();
}
