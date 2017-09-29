var Controller = function(kifu, kifuComments, boardCanvas) {
  // retrieve data from server
  this.kifu = kifu;
  this.kifuComments = kifuComments;
  this.authStatus = authStatus;
  this.starred = starred;

  // HTML elements that controller needs
  this.html = {
    // comments
    'commentList': document.getElementById('comment-list'),
    'commentForm': document.getElementById('comment-form'),
    'commentInput': document.getElementById('comment-input'),
    'commentSubmit': document.getElementById('comment-submit'),
    // info
    'title': document.getElementById('kifu-title'),
    'blackPlayer': document.querySelector('#info .black-player'),
    'blackRank': document.querySelector('#info .black-rank'),
    'whitePlayer': document.querySelector('#info .white-player'),
    'whiteRank': document.querySelector('#info .white-rank'),
    'komi': document.querySelector('#info .komi span'),
    'result': document.querySelector('#info .result span'),
    'description': document.querySelector('#info .description p'),
    // navigation
    'play': document.getElementById('play'),
    'pause': document.getElementById('pause'),
    'beginning': document.getElementById('beginning'),
    'prev': document.getElementById('prev'),
    'next': document.getElementById('next'),
    'end': document.getElementById('end'),
    'toggleEdit': document.getElementById('toggle-edit'),
    'save': document.getElementById('save'),
    'cancel': document.getElementById('cancel'),
    // edit
    'edit': document.getElementById('edit'),
    'deleteNode': document.getElementById('delete-node'),
    'pass': document.getElementById('pass'),
    'editMode': document.getElementsByClassName('edit-mode'),
    'addBlack': document.getElementById('add-black'),
    'addWhite': document.getElementById('add-white'),
    'addStone': document.getElementById('add-stone'),
    'addStoneMenu': document.getElementById('add-stone-menu'),
    'triangle': document.getElementById('triangle'),
    'square': document.getElementById('square'),
    // action bar
    'starKifu': document.getElementById('star'),
    'unstarKifu': document.getElementById('unstar'),
    'deleteKifu': document.getElementById('delete-kifu'),
    'deleteYes': document.getElementById('delete-yes'),
    'deleteNo': document.getElementById('delete-no'),
    'downloadKifu': document.getElementById('download'),
    'shareKifu': document.getElementById('share'),
    'shareLabel': document.querySelector('.share-dropdown label'),
    'shareInput': document.querySelector('.share-dropdown input')
  };

  // cursor modes mapped to buttons
  this.cursorButtonMap = {};
  this.cursorButtonMap[constants.cursor.ADD_BLACK] = this.html.addBlack;
  this.cursorButtonMap[constants.cursor.ADD_WHITE] = this.html.addWhite;
  this.cursorButtonMap[constants.cursor.MARK_TRIANGLE] = this.html.triangle;
  this.cursorButtonMap[constants.cursor.MARK_SQUARE] = this.html.square;

  // initialize game
  this.boardCanvas = boardCanvas;
  this.initStarAuth();

  // application state variable
  this.autoPlayIntervalID = null; // to control auto play
  this.isAutoPlaying = false;
  this.isEditing = false;
  this.isSelectingAdd = false; // if the user is selecting an AB/AW variation
  this.nodesDeletedDuringEdit = []; // keep track of which nodes are deleted during editting
  this.driverBackup = null;
  this.textBackup = ''; // info updating failsafe
  this.isFallbackContent = false; // also used to info updating
  this.cursorMode = constants.cursor.PLAY_AND_SELECT;

  // update navigation, edit, and comment interface
  this.updateNavEdit();
  this.updateCommentList();

  // attach event listeners
  this.addActionEventListeners();
  this.addCanvasEventListeners();
  this.addKeyboardEventListeners();
  this.addNavigationEventListeners();
  this.addCommentEventListeners();
  this.addEditEventListeners();
  this.addInfoEventListeners();
};

Controller.prototype.createAddVarElement = function(childIndex) {
  var self = this;
  var addVarLi = document.createElement('li');
  addVarLi.textContent = 'Variation ' + (childIndex+1);
  addVarLi.addEventListener('click', function(e) {
    self.next(childIndex);
  });

  return addVarLi;
}

Controller.prototype.updateNavEdit = function() {
  var gameTree = this.boardCanvas.driver.gameTree;
  
  // check for beginning/end
  if (gameTree.atFirstNode()) {
    this.html.beginning.disabled = true;
    this.html.prev.disabled = true;
  } else {
    this.html.beginning.disabled = false;
    this.html.prev.disabled = false;
  }
  if (gameTree.atEnd()) {
    this.html.end.disabled = true;
    this.html.next.disabled = true;
    this.html.play.disabled = true;
  } else {
    this.html.end.disabled = false;
    this.html.next.disabled = false;
    this.html.play.disabled = false;
  }

  // check if game is autoplaying
  if (this.isAutoPlaying) {
    // switch buttons
    this.html.play.style.display = 'none';
    this.html.pause.style.display = 'inline-block';
    // disable beginning, prev, next, end, and toggleEdit
    this.html.beginning.disabled = true;
    this.html.prev.disabled = true;
    this.html.next.disabled = true;
    this.html.end.disabled = true;
    this.html.toggleEdit.disabled = true;
  } else {
    // switch buttons
    this.html.pause.style.display = 'none';
    this.html.play.style.display = 'inline-block';
    // enable beginning, prev if not at first node
    if (!gameTree.atFirstNode()) {
      this.html.beginning.disabled = false;
      this.html.prev.disabled = false;
    }
    // enable next, end if not at end
    if (!gameTree.atEnd()) {
      this.html.next.disabled = false;
      this.html.end.disabled = false;
    }
    // enable toggleEdit if user is logged in
    if (this.authStatus > 0) {
      this.html.toggleEdit.disabled = false;
    }
  }

  // check if in edit mode
  if (this.isEditing) {
    // change buttons
    this.html.toggleEdit.style.display = 'none';
    this.html.save.style.display = 'inline-block';
    this.html.cancel.style.display = 'inline-block';
    // enable buttons
    for (var i = 0; i < this.html.editMode.length; i++) {
      this.html.editMode[i].disabled = false;
    }
    // disable deleteNode if the game is at a node that already
    // existed before the edit session, even if user is kifu owner
    if (gameTree.currentNode.id < this.driverBackup.gameTree.nextNodeID) {
      this.html.deleteNode.disabled = true;
    }
    // disable play button
    this.html.play.disabled = true;
    // disable comments
    this.html.commentInput.disabled = true;
    this.html.commentSubmit.disabled = true;
  } else {
    // change buttons
    this.html.save.style.display = 'none';
    this.html.cancel.style.display = 'none';
    this.html.toggleEdit.style.display = 'inline-block';
    // disable buttons
    for (var i = 0; i < this.html.editMode.length; i++) {
      this.html.editMode[i].disabled = true;
    }
    // enable play button if not at end
    if (!gameTree.atEnd()) {
      this.html.play.disabled = false;
    }
    // enable comments (only when logged in)
    if (this.authStatus !== 0) {
      this.html.commentInput.disabled = false;
      this.html.commentSubmit.disabled = false;
    }
  }

  // check if next variation involves adding stone
  // addStone would only display when not in edit mode
  if (gameTree.nextVar.add.length !== 0 && !this.isEditing) {
    // remove addBlack and addWhite
    this.html.addBlack.style.display = 'none';
    this.html.addWhite.style.display = 'none';
    // add addStone
    this.html.addStone.style.display = 'inline-block';
    this.html.addStone.disabled = false;
  } else {
    // add addBlack and addWhite
    this.html.addBlack.style.display = 'inline-block';
    this.html.addWhite.style.display = 'inline-block';
    // remove addStone
    this.html.addStone.style.display = 'none';
  }

  // check if next variation involves pass
  // enable pass only when editting or when pass move is availabe and not autoplaying
  if (this.isEditing || gameTree.nextVar.pass !== -1) {
    // enable pass
    this.html.pass.disabled = false;
  } else {
    // disable pass
    this.html.pass.disabled = true;
  }

  // check cursor mode
  switch (this.cursorMode) {
    // play and select, remove active from all cursor buttons
    case constants.cursor.PLAY_AND_SELECT:
      for (var cur in this.cursorButtonMap) {
        this.cursorButtonMap[cur].classList.remove('active');
      }
      break;
    // all other cases
    default:
      // disable all edit buttons but the current cursor button
      for (var i = 0; i < this.html.editMode.length; i++) {
        this.html.editMode[i].disabled = true;
      }
      this.cursorButtonMap[this.cursorMode].disabled = false;
      // mark the enabled button as active
      this.cursorButtonMap[this.cursorMode].classList.add('active');
      break;
  }

  // check if addStone is active
  // note: pressing any other button would set isSelectingAdd to false
  if (this.isSelectingAdd) {
    // clear and populate addStoneMenu
    this.html.addStoneMenu.innerHTML = '';
    gameTree.nextVar.add.forEach(function(addVar) {
      this.html.addStoneMenu.appendChild(
        this.createAddVarElement(addVar.index)
      );
    }, this);
    // display addStoneMenu
    this.html.addStoneMenu.style.display = 'inline-block';
    // mark addStone as active
    this.html.addStone.classList.add('active');
  } else {
    // hide addStoneMenu
    this.html.addStoneMenu.style.display = 'none';
    // mark addStone as inactive
    this.html.addStone.classList.remove('active');
  }
};

Controller.prototype.createCommentElement = function(comment) {
  var c = document.createElement('li');
  c.setAttribute('comment-id', comment.id);
  
  var author = document.createElement('span');
  var timestamp = document.createElement('span');
  var text = document.createElement('p');

  author.textContent = comment.author_username + ' (' + comment.author_rank + ')';
  timestamp.textContent = comment.timestamp;
  text.textContent = comment.content;

  c.classList.add('comment');
  author.classList.add('user');
  timestamp.classList.add('time');
  text.classList.add('text');

  c.appendChild(author);
  c.appendChild(timestamp);
  c.appendChild(text);

  return c;
};

Controller.prototype.updateCommentList = function() {
  this.html.commentList.innerHTML = '';
  var nodeID = this.boardCanvas.driver.gameTree.currentNode.id;
  var comments = this.kifuComments[nodeID];
  // if comments exist
  if (comments) {
    var self = this;
    comments.forEach(function(comment) {
      self.html.commentList.appendChild(self.createCommentElement(comment));
    });
  // if there are no comments yet
  } else {
    var noComment = document.createElement('p');
    noComment.classList.add('no-comment');
    noComment.textContent = 'No comments';
    this.html.commentList.appendChild(noComment);
  }
};

Controller.prototype.initStarAuth = function() {
  // display star/unstar button
  if (this.starred) {
    this.html.unstarKifu.parentNode.display = 'inline-block';
    this.html.starKifu.parentNode.style.display = 'none';
  } else {
    this.html.starKifu.parentNode.display = 'inline-block';
    this.html.unstarKifu.parentNode.style.display = 'none';
  }

  switch(this.authStatus) {
    case 0:
      // not logged in, disable comments and edit button, remove delete button
      this.html.commentInput.disabled = true;
      this.html.commentSubmit.disabled = true;
      this.html.toggleEdit.disabled = true;
      // also hide star buttons
      this.html.starKifu.style.display = 'none';
      this.html.unstarKifu.style.display = 'none';
      
      this.html.deleteKifu.remove();
      break;
    case 1:
      // not owner, remove delete button
      this.html.deleteKifu.remove();
      break;
    case 2:
      // is owner, no action required (as of now)
      break;
  }
};

Controller.prototype.next = function(childIndex) {
  if (this.boardCanvas.next(childIndex)) {
    this.isSelectingAdd = false;
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.prev = function() {
  if (this.boardCanvas.prev()) {
    this.isSelectingAdd = false;
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.play = function(row, col) {
  if (this.boardCanvas.play(row, col)) {
    this.isSelectingAdd = false;
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.pass = function() {
  if (this.boardCanvas.pass()) {
    this.isSelectingAdd = false;
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.delete = function() {
  var node = this.boardCanvas.driver.gameTree.currentNode;
  if (this.boardCanvas.delete()) {
    this.isSelectingAdd = false;
    this.updateCommentList();
    this.updateNavEdit();
    // delete success, add the IDs of node and its descendants
    node.getChildren().forEach(function(child) {
      this.nodesDeletedDuringEdit.push(child.id);
    }, this);
    return true;
  }
  // delete failed, do nothing
  return false;
};

Controller.prototype.addStone = function(row, col, stone) {
  if (this.boardCanvas.addStone(row, col, stone)) {
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.addMarker = function(row, col, marker) {
  if (this.boardCanvas.addMarker(row, col, marker)) {
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

// add event listeners to canvas
Controller.prototype.addCanvasEventListeners = function() {
  var bc = this.boardCanvas;
  var self = this;

  // left click plays a move or chooses a variation
  bc.canvas.addEventListener('click', function(e) {
    // get board coordinates
    var rect = bc.canvas.getBoundingClientRect();
    var bx = utils.c2b(
      e.clientX - Math.floor(rect.left * globalZoom) + 1,
      config.canvas.sp * globalZoom / bc.scale,
      config.canvas.lw * globalZoom
    );
    var by = utils.c2b(
      e.clientY - Math.floor(rect.top * globalZoom) + 1,
      config.canvas.sp * globalZoom / bc.scale,
      config.canvas.lw * globalZoom
    );
    // check for invalid coordinates
    if (bx == -1 || by == -1) {
      return;
    }
    
    // different cursor modes
    switch(self.cursorMode) {
      case constants.cursor.PLAY_AND_SELECT:
        // check if clicking on an existing variation
        var playVars = bc.driver.gameTree.nextVar.play;
        var index = -1;
        for (var i = 0; i < playVars.length; i++) {
          if (playVars[i].row === by && playVars[i].col === bx) {
            index = playVars[i].index;
            break;
          }
        }
        // plays a new move (requires edit mode)
        if (index === -1) {
          if (self.isEditing) {
            self.play(by, bx);
          }
        // chooses a variation
        } else {
          self.next(index);
        }
        break;
      case constants.cursor.ADD_BLACK:
        self.addStone(by, bx, 'b');
        break;
      case constants.cursor.ADD_WHITE:
        self.addStone(by, bx, 'w');
        break;
      case constants.cursor.MARK_TRIANGLE:
        self.addMarker(by, bx, 't');
        break;
      case constants.cursor.MARK_SQUARE:
        self.addMarker(by, bx, 's');
        break;
      default:
        console.error('Unknown cursor mode: ' + self.cursorMode);
    }
  });

  /* 
  right click deletes the current node (requires edit mode) - currently disabled
  this.boardCanvas.canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (self.isEditing) {
      self.delete();
    }
  }); 
  */
};

// enable keyboard navigation and control
Controller.prototype.addKeyboardEventListeners = function() {
  var self = this;
  document.onkeydown = function(e) {
    if (document.activeElement == self.html.commentInput || document.activeElement.contentEditable == "true") {
      return;
    }
    switch (e.keyCode) {
      // left arrow goes to parent node 
      case 37:
        self.html.prev.click();
        break;
      // right arrow goes to next node (first child)
      case 39:
        self.html.next.click();
        break;
    }
  }
};

// add event listeners to action bar
Controller.prototype.addActionEventListeners = function() {
  var self = this;

  // star and unstar kifu
  this.html.starKifu.addEventListener('click', function(e) {
    if (!self.starred) {
      self.starKifu(self.kifu.id);
    }
  });
  this.html.unstarKifu.addEventListener('click', function(e) {
    if (self.starred) {
      self.unstarKifu(self.kifu.id);
    }
  });

  // delete kifu
  this.html.deleteKifu.addEventListener('click', function(e) {
    if (self.html.deleteKifu.style.display === 'none') {
      self.html.deleteKifu.style.display = 'block';
      self.html.deleteYes.parentNode.style.display = 'none';
    } else {
      self.html.deleteKifu.style.display = 'none';
      self.html.deleteYes.parentNode.style.display = 'block';
    }
  });

  this.html.deleteYes.addEventListener('click', function(e) {
    self.deleteKifu(self.kifu.id);
  });

  this.html.deleteNo.addEventListener('click', function(e) {
    self.html.deleteKifu.style.display = 'block';
    self.html.deleteYes.parentNode.style.display = 'none';
  });

  // download kifu
  this.html.downloadKifu.addEventListener('click', function(e) {
    window.location.replace('/download/' + self.kifu.id);
  });

  // share kifu
  var setShareLink = function(shareAtThisMove) {
    var currentNodeID = self.boardCanvas.driver.gameTree.currentNode.id;
    if (shareAtThisMove) {
      self.html.shareInput.value = kifuURL + '?node_id=' + currentNodeID;
    } else {
      self.html.shareInput.value = kifuURL;
    }
  }

  this.html.shareKifu.addEventListener('click', function(e) {
    // reset share-at-this-move toggle
    self.html.shareLabel.classList.remove('active');
    setShareLink(false);

    if (self.html.shareLabel.parentNode.style.display === 'block') {
      self.html.shareKifu.classList.remove('active');
      self.html.shareLabel.parentNode.style.display = 'none';
    } else {
      self.html.shareKifu.classList.add('active');
      self.html.shareLabel.parentNode.style.display = 'block'
    }
  });

  // toggle share-at-this-move
  this.html.shareLabel.addEventListener('click', function(e) {
    if (self.html.shareLabel.classList.contains('active')) {
      self.html.shareLabel.classList.remove('active');
      setShareLink(false);
    } else {
      self.html.shareLabel.classList.add('active');
      setShareLink(true);
    }
  });
};

// add event listeners to navigation
Controller.prototype.addNavigationEventListeners = function() {
  var self = this;

  this.html.beginning.addEventListener('click', function(e) {
    while (!self.boardCanvas.driver.gameTree.atFirstNode()) {
      self.boardCanvas.driver.prev();
    }
    self.boardCanvas.render();
    self.isSelectingAdd = false;
    self.updateCommentList();
    self.updateNavEdit();
  });

  this.html.prev.addEventListener('click', function(e) {
    self.prev();
  });

  this.html.play.addEventListener('click', function(e) {
    self.isAutoPlaying = true;
    // begin auto-play immediately
    if (!self.boardCanvas.driver.gameTree.atEnd()) {
      self.next();
    }
    self.autoPlayIntervalID = setInterval(function() {
      if (self.boardCanvas.driver.gameTree.atEnd() || !self.next()) {
        clearInterval(self.autoPlayIntervalID);
        self.isAutoPlaying = false;
        self.autoPlayIntervalID = null;
        self.updateNavEdit();
      }
    }, 500);
  });

  this.html.pause.addEventListener('click', function(e) {
    clearInterval(self.autoPlayIntervalID);
    self.isAutoPlaying = false;
    self.autoPlayIntervalID = null;
    self.updateNavEdit();
  });

  this.html.next.addEventListener('click', function(e) {
    self.next();
  });

  this.html.end.addEventListener('click', function(e) {
    while (!self.boardCanvas.driver.gameTree.atEnd()) {
      if (!self.boardCanvas.driver.next()) {
        break;
      }
    }
    self.boardCanvas.render();
    self.isSelectingAdd = false;
    self.updateCommentList();
    self.updateNavEdit();
  });

  // pass is in edit section, but could also be used in navigation
  this.html.pass.addEventListener('click', function(e) {
    self.pass();
  });

  // addStone also in edit section, but it is used for navigation
  this.html.addStone.addEventListener('click', function(e) {
    self.isSelectingAdd = self.isSelectingAdd ? false: true;
    self.updateNavEdit();
  });
};

// add event listeners to editting section
Controller.prototype.addEditEventListeners = function() {
  var self = this;

  // toggle edit
  this.html.toggleEdit.addEventListener('click', function(e) {
    self.isEditing = true;
    self.nodesDeletedDuringEdit = []; // reset deleted nodes
    self.isSelectingAdd = false;
    // backup controller state
    self.backupBoardCanvas();
    self.updateNavEdit();
  });

  // save all the changes
  this.html.save.addEventListener('click', function(e) {
    // restore cursorMode to PLAY_AND_SELECT
    if (self.cursorMode !== constants.cursor.PLAY_AND_SELECT) {
      self.cursorMode = constants.cursor.PLAY_AND_SELECT;
    }
    // update kifu
    self.updateKifu(
      self.kifu.id,
      SGF.print(self.boardCanvas.driver.gameTree.root),
      self.nodesDeletedDuringEdit
    );
  });

  // cancel changes
  this.html.cancel.addEventListener('click', function(e) {
    // restore cursorMode to PLAY_AND_SELECT
    if (self.cursorMode !== constants.cursor.PLAY_AND_SELECT) {
      self.cursorMode = constants.cursor.PLAY_AND_SELECT;
    }
    self.isEditing = false;
    self.updateNavEdit();
    // restore backup
    self.restoreBoardCanvas();
  });

  // delete node
  this.html.deleteNode.addEventListener('click', function(e) {
    self.delete();
  });

  // switch cursor modes
  cursors = Object.keys(this.cursorButtonMap).map(function(cur) {
    return parseInt(cur);
  });
  cursors.forEach(function(cur) {
    self.cursorButtonMap[cur].addEventListener('click', function(e) {
      self.cursorMode = self.cursorMode === cur? constants.cursor.PLAY_AND_SELECT: cur;
      self.updateNavEdit();
    });
  });
};

// add event listeners for updating game information (through contentEditable)
Controller.prototype.addInfoEventListeners = function() {
  var self = this;
  var addListener = function(contentElement, dataKey) {
    // clicking on editable info backs the info up
    contentElement.addEventListener('focus', function() {
      self.textBackup = contentElement.textContent;
      self.isFallbackContent = contentElement.classList.contains('fallback');
      // if contentElement is fallback, then clear the text and remove the fallback class
      if (self.isFallbackContent) {
        contentElement.textContent = '';
        contentElement.classList.remove('fallback');
      }
    });

    var update = function() {
      var xhr = new XMLHttpRequest();
      xhr.addEventListener('readystatechange', function() {
        // revert to backup if change failed
        // also re-add fallback class if content was originally fallback
        if (xhr.readyState === 4 && xhr.status !== 200) {
          contentElement.textContent = self.textBackup;
          if (self.isFallbackContent) {
            contentElement.classList.add('fallback');
          }
        }
      });
      // construct url and data
      var url = '/kifu/' + self.kifu.id;
      var data = {};
      data[dataKey] = contentElement.textContent;
      data = JSON.stringify(data);
      // if content has been changed to empty
      if (contentElement.textContent === '') {
        contentElement.textContent = self.textBackup;
        if (self.isFallbackContent) {
          contentElement.classList.add('fallback');
        }
      // if content has actually been changed
      } else if (self.textBackup !== contentElement.textContent) {
        xhr.open('UPDATE', url);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.send(data);
      }
    };
    // after user finishes changing the info, send change to server
    contentElement.addEventListener('blur', update);
    contentElement.addEventListener('keydown', function(e) {
      if (e.keyCode === 13) { // enter key
        e.preventDefault();
        contentElement.blur();
        update();
      }
    });
  };

  addListener(this.html.blackPlayer, 'blackPlayer');
  addListener(this.html.whitePlayer, 'whitePlayer');
  addListener(this.html.blackRank, 'blackRank');
  addListener(this.html.whiteRank, 'whiteRank');
  addListener(this.html.komi, 'komi');
  addListener(this.html.result, 'result');
  addListener(this.html.description, 'description');
  addListener(this.html.title, 'title');
};

// add event listeners to comment-list and comment-form
Controller.prototype.addCommentEventListeners = function() {
  var self = this;
  var submit = function() {
    var comment = (new FormData(self.html.commentForm)).get('comment-input');
    // only post non-empty comments
    if (comment.trim() !== '') {
      self.postComment(comment);
    }
  }

  // submit by clicking
  this.html.commentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    submit();
  });

  // submit by hitting ENTER
  this.html.commentForm.addEventListener('keydown', function(e) {
    if (e.keyCode === 13) {
      e.preventDefault();
      submit();
    }
  });
};

Controller.prototype.postComment = function(comment) {
  var kifuID = this.kifu.id;
  var nodeID = this.boardCanvas.driver.gameTree.currentNode.id;
  var self = this;

  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // post initiated
    if (xhr.readyState === 1) {
      // disable submit button
      self.html.commentSubmit.disabled = true;
    // post successful
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      // add current comment to kifuComments
      var comment = JSON.parse(xhr.responseText);
      if (!self.kifuComments[nodeID]) {
        self.kifuComments[nodeID] = [comment];
      } else {
        self.kifuComments[nodeID].push(comment);
      }
      // re-enable submit button
      self.html.commentSubmit.disabled = false;
      // clear comment field
      self.html.commentInput.value = '';
      // update comment-list
      self.updateCommentList();
    }
  });

  // send post request to server
  var url = '/comment/' + kifuID + '/' + nodeID;
  var data = JSON.stringify(comment);
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(data);
};

Controller.prototype.updateKifu = function(kifuID, newSGF, deletedNodes) {
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // post initiated
    if (xhr.readyState === 1) {
      // disable save and cancel button
      self.html.save.disabled = true;
      self.html.cancel.disabled = true;
    // post successful
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      // parse new kifu
      self.kifu = JSON.parse(xhr.responseText);
      // delete backup
      self.driverBackup = null;
      // exit edit mode
      self.isEditing = false;
      // update view
      self.updateNavEdit();
      self.updateCommentList();
      // re-enable save and cancel
      self.html.save.disabled = false;
      self.html.cancel.disabled = false;
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      // re-enable save and cancel
      self.html.save.disabled = false;
      self.html.cancel.disabled = false;
      // alert that save failed
      window.alert('Network Error: Save Failed');
      throw new exceptions.NetworkError(1, "Kifu SGF Update Failed");
    }
  });

  // send post request to server
  var url = '/kifu/' + kifuID;
  var data = JSON.stringify({
    'sgf': newSGF,
    'deletedNodes': deletedNodes,
    'img': createThumbnail(newSGF, config.tq)
  });
  xhr.open('UPDATE', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send(data);
};

Controller.prototype.deleteKifu = function(kifuID) {
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // post initiated
    if (xhr.readyState === 1) {
      // disable delete button
      self.html.deleteKifu.disabled = true;
    // post successful
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      window.location.replace(JSON.parse(xhr.responseText).redirect);
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      // re-enable delete button
      self.html.deleteKifu.disabled = false;
      throw new exceptions.NetworkError(2, "Kifu Deletion Failed");
    }
  });

  // send post request to server
  var url = '/kifu/' + kifuID;
  xhr.open('DELETE', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
};

Controller.prototype.starKifu = function(kifuID) {
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // if post successful
    if (xhr.readyState === 4 && xhr.status === 200) {
      self.starred = true;
      self.html.starKifu.parentNode.style.display = 'none';
      self.html.unstarKifu.parentNode.style.display = 'inline-block';
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      throw new exceptions.NetworkError(4, "Kifu Star/Unstar Failed");
    }
  });

  // send post request to server
  var url = '/star/kifu/' + kifuID;
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
}

Controller.prototype.unstarKifu = function(kifuID) {
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // if post successful
    if (xhr.readyState === 4 && xhr.status === 200) {
      self.starred = false;
      self.html.starKifu.parentNode.style.display = 'inline-block';
      self.html.unstarKifu.parentNode.style.display = 'none';
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      throw new exceptions.NetworkError(4, "Kifu Star/Unstar Failed");
    }
  });

  // send post request to server
  var url = '/unstar/kifu/' + kifuID;
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
}

Controller.prototype.backupBoardCanvas = function() {
  this.driverBackup = this.boardCanvas.driver.clone();
};

Controller.prototype.restoreBoardCanvas = function() {
  if (!this.driverBackup) {
    return false;
  }

  // restore boardCanvas
  this.boardCanvas.driver = this.driverBackup;

  // update state
  this.autoPlayIntervalID = null;
  this.isEditing = false;
  this.driverBackup = null; // backup is deleted

  // update view
  this.updateNavEdit();
  this.updateCommentList();
  this.boardCanvas.render();
};
