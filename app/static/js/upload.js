var fileInput = document.querySelector('#sgf-file-container input');
var textInput = document.querySelector('#sgf-text-container textarea');
var urlInput = document.querySelector('#sgf-url-container input');
var titleInput = document.querySelector('#kifu-info input');
var descriptionInput = document.querySelector('#kifu-info textarea');
var upload = document.querySelector('#upload');

var fr = new FileReader();
var urlXHR = new XMLHttpRequest();

var invalidSGFMsg = 'Your file does not contain valid SGF content.';
var unavailableURLMsg = 'Your URL is invalid or temporarily unavailable.'
var tooManyMsg = 'Please use only one method to upload your SGF file.';
var noInputMsg = 'Use one of these three methods to upload your SGF file.';
var noTitleMsg = 'Kifu title is mandatory.'


var addInputErrors = function(containerSelector, msg) {
  // helper function to create ul.errors
  var createErrorsUL = function() {
    errors = document.createElement('ul');
    errors.classList.add('errors');
    error = document.createElement('li');
    error.textContent = msg;
    errors.appendChild(error);

    return errors;
  }
  
  // add ul to all selected containers
  document.querySelectorAll(containerSelector).forEach(function(ctn) {
    ctn.appendChild(createErrorsUL());
  });
}

var clearInputErrors = function(containerSelector) {
  errors = document.querySelectorAll(containerSelector + ' .errors');
  errors.forEach(function(e) {
    e.remove();
  });
}

// set height of container
var setHeight = function() {
  var container = document.querySelector('.container');
  var inputContainer = document.querySelector('#sgf-input');
  container.style.height = window.getComputedStyle(inputContainer).height;
}

var validateSGF = function(sgfStr) {
  // check for empty (whitespace)
  if (!/\S/.test(sgfStr)) {
    return false;
  }
  try {
    SGF.parse(sgfStr)
  } catch(e) {
    return false;
  }
  return true;
}

var postToServer = function(sgfStr) {
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function(e) {
    // post initiated
    if (xhr.readyState === 1) {
      upload.disabled = true;
    // post failed due to bad sgf
    } else if (xhr.readyState === 4 && xhr.status === 400) {
      addInputErrors('#sgf-url-container', invalidSGFMsg);
      upload.disabled = false;
    // post success
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      window.location.replace(JSON.parse(xhr.responseText).redirect);
    }
  });

  var data = {
    'sgf': sgfStr,
    'img': createThumbnail(sgfStr, config.tq),
    'title': titleInput.value,
    'description': descriptionInput.value
  }
  xhr.open('POST', '/upload');
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(JSON.stringify(data));
}

var initListeners = function() {
  fr.addEventListener('load', function(e) {
    if (validateSGF(e.target.result)) {
      postToServer(e.target.result);
    } else {
      addInputErrors('#sgf-file-container', invalidSGFMsg);
    }
  });

  urlXHR.addEventListener('readystatechange', function(e) {
    // post initiated
    if (urlXHR.readyState === 1) {
      upload.disabled = true;
    } else if (urlXHR.readyState === 4) {
      if (urlXHR.status === 200) {
        // file successfully retrieved from URL
        sgfStr = JSON.parse(this.responseText).sgf;
        if (validateSGF(sgfStr)) {
          postToServer(sgfStr);
        } else {
          upload.disabled = false;
          addInputErrors('#sgf-url-container', invalidSGFMsg);
      }
      // file retrieval failed due to unavailable URL
      } else if (urlXHR.status === 404) {
        upload.disabled = false;
        addInputErrors('#sgf-url-container', unavailableURLMsg);
      // file retrieval failed due to decode error
      } else if (urlXHR.status === 400) {
        upload.disabled = false;
        addInputErrors('#sgf-url-container', invalidSGFMsg);
      }
    }
  });
}

// form validation and trigger proper events
var uploadSubmit = function(e) {
  e.preventDefault();
  clearInputErrors('#upload-form');
  var validated = true;

  // check which upload method(s) is being used
  var fileActive = fileInput.value !== '' ? 1 : 0;
  var textActive = /\S/.test(textInput.value)? 1 : 0;
  var urlActive = /\S/.test(urlInput.value) && urlInput.value !== 'http://' ? 1 : 0;

  // check for too many inputs
  if (fileActive + textActive + urlActive > 1) {
    if (fileActive) {
      addInputErrors('#sgf-file-container', tooManyMsg);
    }
    if (textActive) {
      addInputErrors('#sgf-text-container', tooManyMsg);
    }
    if (urlActive) {
      addInputErrors('#sgf-url-container', tooManyMsg);
    }
    setHeight();
    validated = false;;
  }

  // check for no input at all
  if (fileActive + textActive + urlActive < 1) {
    addInputErrors('#sgf-input .subcontainer', noInputMsg);
    setHeight();
    validated = false;
  }

  // check if kifu title has been filled out
  if (!/\S/.test(titleInput.value)) {
    addInputErrors('#kifu-title-container', noTitleMsg);
    validated = false;
  }

  if (!validated) {
    return false;
  }

  // read sgf content based on which upload method is used
  if (fileActive) {
    fr.readAsText(fileInput.files[0]);
  }
  if (textActive) {
    if (validateSGF(textInput.value)) {
      postToServer(textInput.value);
    } else {
      addInputErrors('#sgf-text-container', invalidSGFMsg);
    }
  }
  if (urlActive) {
    data = {'url': urlInput.value};
    urlXHR.open('POST', '/get-external-sgf');
    urlXHR.setRequestHeader('Content-type', 'application/json');
    urlXHR.send(JSON.stringify(data));
  }

  return true;
}

// JS custom file input
var enableFileInput = function() {
  // helper function to remove selected file indicator
  var removeFileNameLabel = function() {
    var fileNameLabel = document.querySelectorAll('.chosen-file-name');
    fileNameLabel.forEach(function(fnl) {
      fnl.remove();
    });
  }

  // file label acts as file input button
  var fileLabel = document.querySelector('#sgf-file-container label');

  fileLabel.addEventListener('click', function(e) {
    // no file selected
    if (fileInput.value === '') {
      fileInput.click();
    // click again to deselect the file
    } else {
      fileInput.value = '';
      removeFileNameLabel();
      clearInputErrors('#sgf-input');
      fileLabel.textContent = 'Pick a file from your computer';
    }
  });

  fileInput.addEventListener('change', function(e) {
    clearInputErrors('#sgf-input');
    removeFileNameLabel();

    // if a new file is chosen
    if (this.value !== '') {
      // change fileLabel text
      fileLabel.textContent = 'Remove selected file';
      // add filename label
      var fileNameLabel = document.createElement('label');
      fileNameLabel.classList.add('chosen-file-name');
      fileNameLabel.textContent = this.value.replace(/([^\\]*\\)*/,'');
      fileLabel.parentNode.appendChild(fileNameLabel);
    }
  });
}

enableFileInput();
initListeners();
upload.addEventListener('click', uploadSubmit);
