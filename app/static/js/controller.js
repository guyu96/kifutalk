var Controller = function(kifu, kifuComments, boardCanvas) {
  // retrieve data from server
  this.kifu = kifu;
  this.kifuComments = kifuComments;
  this.authStatus = authStatus;

  // HTML elements that controller needs
  this.html = {
    // comments
    'commentList': document.getElementById('comment-list'),
    'commentForm': document.getElementById('comment-form'),
    'commentInput': document.getElementById('comment-input'),
    'commentSubmit': document.getElementById('comment-submit'),
    // info
    'blackInfo': document.getElementById('black').getElementsByTagName('span')[0],
    'whiteInfo': document.getElementById('white').getElementsByTagName('span')[0],
    'komi': document.getElementById('komi'),
    'result': document.getElementById('result'),
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
    'triangle': document.getElementById('triangle'),
    'square': document.getElementById('square'),
    // action bar
    'deleteKifu': document.getElementById('delete-kifu'),
    'forkKifu': document.getElementById('fork'),
    'downloadKifu': document.getElementById('download')
  };

  // cursor modes mapped to buttons
  this.cursorButtonMap = {};
  this.cursorButtonMap[constants.cursor.ADD_BLACK] = this.html.addBlack;
  this.cursorButtonMap[constants.cursor.ADD_WHITE] = this.html.addWhite;
  this.cursorButtonMap[constants.cursor.MARK_TRIANGLE] = this.html.triangle;
  this.cursorButtonMap[constants.cursor.MARK_SQUARE] = this.html.square;

  // initialize game
  this.boardCanvas = boardCanvas;
  this.setGameInfo();
  this.initAuth();

  // application state variable
  this.autoPlayIntervalID = null; // to control auto play
  this.isAutoPlaying = false;
  this.isEditing = false;
  this.nodesDeletedDuringEdit = []; // keep track of which nodes are deleted during editting
  this.boardCanvasBackup = null;
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
};

// set game information
Controller.prototype.setGameInfo = function() {
  var info = this.boardCanvas.driver.gameTree.infoString();
  this.html.blackInfo.textContent = info.blackPlayer + ' ' + info.blackRank;
  this.html.whiteInfo.textContent = info.whitePlayer + ' ' + info.whiteRank;
  this.html.komi.textContent = 'Komi: ' + info.komi;
  this.html.result.textContent = 'Result: ' + info.result;
};

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
    // enable toggleEdit if user owns kifu
    if (this.authStatus === 2) {
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
    // enable comments
    this.html.commentInput.disabled = false;
    this.html.commentSubmit.disabled = false;
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
  // again, disable pass only when not editting
  if (gameTree.nextVar.pass === -1 && !this.isEditing) {
    // disable pass
    this.html.pass.disabled = true;
  } else {
    // enable pass
    this.html.pass.disabled = false;
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
};

Controller.prototype.createCommentElement = function(comment) {
  var c = document.createElement('li');
  var author = document.createElement('span');
  var timestamp = document.createElement('span');
  var text = document.createElement('p');

  author.textContent = comment.author_username;
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

Controller.prototype.initAuth = function() {
  switch(this.authStatus) {
    case 0:
      // not logged in, disable comments and edit button
      this.html.commentInput.disabled = true;
      this.html.commentSubmit.disabled = true;
      this.html.toggleEdit.disabled = true;
      break;
    case 1:
      // not owner, remove delete button and disable edit
      this.html.deleteKifu.remove();
      this.html.toggleEdit.disabled = true;
      break;
    case 2:
      // is owner, remove fork button
      this.html.forkKifu.remove();
      break;
  }
};

Controller.prototype.next = function(childIndex) {
  if (this.boardCanvas.next(childIndex)) {
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.prev = function() {
  if (this.boardCanvas.driver.gameTree.atFirstNode()) {
    return false;
  }
  if (this.boardCanvas.prev()) {
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.play = function(row, col) {
  if (this.boardCanvas.play(row, col)) {
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.pass = function() {
  if (this.boardCanvas.pass()) {
    this.updateCommentList();
    this.updateNavEdit();
    return true;
  }
  return false;
};

Controller.prototype.delete = function() {
  var node = this.boardCanvas.driver.gameTree.currentNode;
  if (this.boardCanvas.delete()) {
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
    var bx = utils.c2b(e.clientX - rect.left, config.canvas.sp/bc.scale, config.canvas.lw);
    var by = utils.c2b(e.clientY - rect.top, config.canvas.sp/bc.scale, config.canvas.lw);

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
    switch (e.keyCode) {
      // left arrow goes to parent node 
      case 37:
        self.prev();
        break;
      // right arrow goes to next node (first child)
      case 39:
        self.next();
        break;
      // // 'p' passes
      // case 80:
      //   self.pass();
      //   break;
    }
  }
};

// add event listeners to action bar
Controller.prototype.addActionEventListeners = function() {
  var self = this;

  // delete kifu
  this.html.deleteKifu.addEventListener('click', function(e) {
    self.deleteKifu(self.kifu.id);
  });

  // fork kifu
  this.html.forkKifu.addEventListener('click', function(e) {
    self.forkKifu(self.kifu.id);
  });

  // download kifu
  this.html.downloadKifu.addEventListener('click', function(e) {
    window.location.replace('/download/' + self.kifu.id);
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
      if (!self.boardCanvas.driver.gameTree.atEnd()) {
        self.next();
      } else {
        // as if pressing pause (see below)
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
      self.boardCanvas.driver.next();
    }
    self.boardCanvas.render();
    self.updateCommentList();
    self.updateNavEdit();
  });

  // pass is in edit section, but could also be used in navigation
  this.html.pass.addEventListener('click', function(e) {
    self.pass();
  });
};

// add event listeners to editting section
Controller.prototype.addEditEventListeners = function() {
  var self = this;

  // toggle edit
  this.html.toggleEdit.addEventListener('click', function(e) {
    self.isEditing = true;
    self.nodesDeletedDuringEdit = []; // reset deleted nodes
    self.updateNavEdit();
    // backup controller state
    self.backupBoardCanvas();
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

// add event listeners to comment-list and comment-form
Controller.prototype.addCommentEventListeners = function() {
  var self = this;
  // submit comment
  this.html.commentForm.addEventListener('submit', function(e) {
    e.preventDefault();
    var formData = new FormData(self.html.commentForm);
    self.postComment(formData.get('comment-input'));
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
    console.log('here');
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
      self.boardCanvasBackup = null;
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
    'newSGF': newSGF,
    'deletedNodes': deletedNodes
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

Controller.prototype.forkKifu = function(kifuID) {
  var self = this;
  var xhr = new XMLHttpRequest();
  xhr.addEventListener('readystatechange', function() {
    // post initiated
    if (xhr.readyState === 1) {
      // disable fork button
      self.html.forkKifu.disabled = true;
    // post successful
    } else if (xhr.readyState === 4 && xhr.status === 200) {
      window.location.replace(JSON.parse(xhr.responseText).redirect);
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      // re-enable fork button
      self.html.forkKifu.disabled = false;
      throw new exceptions.NetworkError(3, "Kifu Fork Failed");
    }
  });

  // send post request to server
  var url = '/fork/' + kifuID;
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
};

Controller.prototype.backupBoardCanvas = function() {
  this.boardCanvasBackup = new BoardCanvas(
    this.boardCanvas.canvas,
    this.boardCanvas.ctx,
    this.boardCanvas.driver.clone()
  );
};

Controller.prototype.restoreBoardCanvas = function() {
  if (!this.boardCanvasBackup) {
    return false;
  }

  // restore boardCanvas
  this.boardCanvas = this.boardCanvasBackup;

  // update state
  this.autoPlayIntervalID = null;
  this.isEditing = false;
  this.boardCanvasBackup = null; // backup is deleted

  // update view
  this.updateNavEdit();
  this.updateCommentList();
  this.boardCanvas.render();
};
