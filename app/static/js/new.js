var newKifu = document.getElementById('new');

newKifu.addEventListener('click', function(e) {
  var xhr = new XMLHttpRequest();
  // redirect to url that server provides
  // either login page or kifu page
  xhr.addEventListener('readystatechange', function(e) {
    if (xhr.readyState === 4 && xhr.status === 200) {
      window.location.replace(JSON.parse(xhr.responseText).redirect);
    }
  });
  var url = '/new';
  var data = JSON.stringify({
    'img': createThumbnail('()', config.tq)
  });
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(data);
});
