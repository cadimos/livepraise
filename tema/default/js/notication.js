// Determine the correct object to use
var notification = window.Notification || window.mozNotification || window.webkitNotification;
 
// The user needs to allow this
if ('undefined' === typeof notification)
    alert('Web notification not supported');
else
    notification.requestPermission(function(permission){});
 
// A function handler
function Notify(titleText, bodyText, urlIcon)
{
    if(!urlIcon){
        urlIcon='';
    }
    if ('undefined' === typeof notification)
        return false;       //Not supported....
    var noty = new notification(
        titleText, {
            body: bodyText,
            dir: 'auto', // or ltr, rtl
            lang: 'pt-BR', //lang used within the notification.
            tag: 'notificationPopup', //An element ID to get/set the content
            icon: urlIcon //The URL of an image to be used as an icon
        }
    );
    noty.onclick = function () {
        console.log('notification.Click');
    };
    noty.onerror = function () {
        console.log('notification.Error');
    };
    noty.onshow = function () {
        console.log('notification.Show');
    };
    noty.onclose = function () {
        console.log('notification.Close');
    };
    return true;
}