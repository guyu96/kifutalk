var fileForm = document.getElementById('upload-file-form');
var fileInput = document.getElementById('file-input');
var fileSubmit = document.getElementById('file-submit');
var textForm = document.getElementById('upload-text-form')
var textInput = document.getElementById('text-input');
var textSubmit = document.getElementById('text-submit');

var generateTitle = function(gameTree) {
  var black = gameTree.gameInfo['PB']? gameTree.gameInfo['PB']: 'Unknown';
  var white = gameTree.gameInfo['PW']? gameTree.gameInfo['PW']: 'Unknown';
  var black_rank = gameTree.gameInfo['BR']? gameTree.gameInfo['BR']: '?';
  var white_rank = gameTree.gameInfo['WR']? gameTree.gameInfo['WR']: '?';

  return black + ' (' + black_rank + ') vs. ' + white + ' (' + white_rank + ')';
};

var validateAndSubmit = function(sgfStr) {
  // validate
  if (!/\S/.test(sgfStr)) {
    throw new exceptions.ParsingError(2, 'SGF String cannot be empty');
  }
  try {
    var gameTree = SGF.parse(sgfStr);
  } catch(e) {
    throw e;
  }

  // construct xhr
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // post initiated
    if (xhr.readyState === 1) {
      // disable upload buttons
      fileSubmit.disabled = true;
      textSubmit.disabled = true;
    // post success
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      window.location.replace(JSON.parse(xhr.responseText).redirect);
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      // re-enable submit button
      fileSubmit.disabled = false;
      textSubmit.disabled = false;
      throw new exceptions.NetworkError(0, "Upload Failed");
    }
  });

  // submit
  var url = '/upload';
  var data = JSON.stringify({
    sgf: SGF.print(gameTree.root),
    title: generateTitle(gameTree)
  });
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(data);
};

fileForm.addEventListener('submit', function(e) {
  e.preventDefault();
  // get file data
  var fr = new FileReader();
  fr.addEventListener('load', function(ev) {
    validateAndSubmit(ev.target.result);
  });
  fr.readAsText(fileInput.files[0]);
});

textForm.addEventListener('submit', function(e) {
  e.preventDefault();
  validateAndSubmit(textInput.value);
});
