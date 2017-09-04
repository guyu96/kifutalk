var notificationHeader = document.querySelector('.notification .header');
var notificationUL = document.querySelector('.notification .list');

var markAsRead = function(notificationID) {
  var xhr = new XMLHttpRequest();
  xhr.open('POST', '/read-notification/' + notificationID);
  xhr.send();
}

notificationHeader.addEventListener('click', function(e) {
  if (notificationUL.children.length === 0) {
    return;
  }
  if (notificationUL.style.display === 'none') {
    notificationUL.style.display = 'block';
    notificationHeader.style.background = '#254977';
  } else {
    notificationUL.style.display = 'none';
    notificationHeader.style.background = '#355987';
  }
});

for (var i = 0; i < notificationUL.children.length; i++) {
  var notificationAnchor = notificationUL.children[i];
  notificationAnchor.addEventListener('click', function(e) {
    markAsRead(notificationAnchor.getAttribute('nid'));
  });
}
