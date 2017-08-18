var liList = document.querySelectorAll('.browse-sidebar ul li');
var sortBy = document.getElementById('sort-by');
var timeFrame = document.getElementById('time-frame');
var displayIn = document.getElementById('display-in');
var updateList = document.getElementById('update-list');
var navAnchors = document.querySelectorAll('.page-nav a');

var initListeners = function() {
  // add listeners to each browse option
  liList.forEach(function(li) {
    li.addEventListener('click', function(e) {
      // do something when the option is not currently chosen
      if (!li.classList.contains('active')) {
        li.parentNode.querySelector('.active').classList.remove('active');
        li.parentNode.setAttribute('value', li.getAttribute('value'));
        li.classList.add('active');
      }
    });
  });

  // add listener to update list button
  updateList.addEventListener('click', function(e) {
    window.location.replace('/browse?page=1' + generateQueryString());
  });
}

var generateQueryString = function() {
  // ?page=1 is assumed
  return '&sort-by=' + sortBy.getAttribute('value') + '&time-frame=' + timeFrame.getAttribute('value') + '&display-in=' + displayIn.getAttribute('value');
}

var readQueryString = function(sortByQ, timeFrameQ, displayInQ) {
  // set the li within the given ul to be active
  // and remove active from 
  var readHelper = function(ul, queryValue) {
    ul.querySelectorAll('li').forEach(function(li) {
      if (li.getAttribute('value') !== queryValue) {
        li.classList.remove('active');
      } else {
        li.classList.add('active');
        ul.setAttribute('value', queryValue);
      }
    });
  }

  readHelper(sortBy, sortByQ);
  readHelper(timeFrame, timeFrameQ);
  readHelper(displayIn, displayInQ);
}

// add query string to next and prev
var modifyPageNav = function() {
  navAnchors.forEach(function(anc) {
    if (anc.getAttribute('href') !== '#') {
      console.log(anc.getAttribute('href'))
      anc.setAttribute('href', anc.getAttribute('href') + generateQueryString());
    }
  })
}

initListeners();
readQueryString(queryStringList[0], queryStringList[1], queryStringList[2]);
modifyPageNav();
