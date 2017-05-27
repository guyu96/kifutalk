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
    'navigation': document.getElementById('navigation'),
    'play': document.getElementById('play'),
    'beginning': document.getElementById('beginning'),
    'prev': document.getElementById('prev'),
    'next': document.getElementById('next'),
    'end': document.getElementById('end'),
    // edit
    'deleteNode': document.getElementById('delete-node'),
    // control
    'editMode': document.getElementsByClassName('edit-mode'),
    'navAssist': document.getElementsByClassName('nav-assist'),
    // action bar
    'deleteKifu': document.getElementById('delete-kifu'),
    'forkKifu': document.getElementById('fork')
  };
  this.initEditToggle();

  // initialize game
  this.boardCanvas = boardCanvas;
  this.setGameInfo();

  // application state variable
  this.autoPlayIntervalID = null; // to control auto play
  this.isEditting = false;
  this.nodesDeletedDuringEdit = []; // keep track of which nodes are deleted during editting
  this.boardCanvasBackup = null;

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
}

// initialize edit, save, and cancel buttons
Controller.prototype.initEditToggle = function() {
  var toggleEdit = document.createElement('button');
  toggleEdit.id = 'toggle-edit';
  toggleEdit.classList.add('edit');
  toggleEdit.innerHTML = '<span>Edit</span>'
  this.html['toggleEdit'] = toggleEdit;

  var save = document.createElement('button');
  save.id = 'save';
  save.classList.add('edit');
  save.innerHTML = '<span>Save</span>'
  this.html['save'] = save;

  var cancel = document.createElement('button');
  cancel.id = 'cancel';
  cancel.classList.add('edit');
  cancel.innerHTML = '<span>Cancel</span>'
  this.html['cancel'] = cancel;
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
  // check for beginning/end
  var gameTree = this.boardCanvas.driver.gameTree;
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
  } else {
    this.html.end.disabled = false;
    this.html.next.disabled = false;
  }

  // check if in edit mode
  if (this.isEditting) {
    // change buttons
    this.html.toggleEdit.remove();
    this.html.navigation.appendChild(this.html.save);
    this.html.navigation.appendChild(this.html.cancel);
    // enable buttons
    for (var i = 0; i < this.html.editMode.length; i++) {
      this.html.editMode[i].disabled = false;
    }
  } else {
    // change buttons
    this.html.save.remove();
    this.html.cancel.remove();
    this.html.navigation.appendChild(this.html.toggleEdit);
    // disable buttons
    for (var i = 0; i < this.html.editMode.length; i++) {
      this.html.editMode[i].disabled = true;
    }
  }

  // authentication status (the code above assumes authStatus === 2)
  if (authStatus === 0) {
    // not logged in, disable comments and edit button
    this.html.commentInput.disabled = true;
    this.html.commentSubmit.disabled = true;
    this.html.toggleEdit.disabled = true;
  } else if (authStatus === 1) {
    // logged in, but not owner, disable edit button
    this.html.toggleEdit.disabled = true;
  }
}

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
}

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
      if (self.isEditting) {
        self.play(by, bx);
      }
    // chooses a variation
    } else {
      self.next(index);
    }
  });

  // right click deletes the current node (requires edit mode)
  this.boardCanvas.canvas.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    if (self.isEditting) {
      self.delete();
    }
  });
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
    if (!self.autoPlayIntervalID) {
      // begin auto-play immediately
      if (!self.boardCanvas.driver.gameTree.atEnd()) {
        self.next();
        self.html.play.classList.add('playing');
      }
      self.autoPlayIntervalID = setInterval(function() {
        if (!self.boardCanvas.driver.gameTree.atEnd()) {
          self.next();
          self.html.play.classList.add('playing');
        }
      }, 500);
    } else {
      clearInterval(self.autoPlayIntervalID);
      self.autoPlayIntervalID = null;
      self.html.play.classList.remove('playing');
    }
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
};

// add event listeners to editting section
Controller.prototype.addEditEventListeners = function() {
  var self = this;

  // toggle edit
  this.html.toggleEdit.addEventListener('click', function(e) {
    self.isEditting = true;
    self.nodesDeletedDuringEdit = []; // reset deleted nodes
    self.updateNavEdit();
    // backup controller state
    self.backupBoardCanvas();
    // disable comments
    self.html.commentInput.disabled = true;
    self.html.commentSubmit.disabled = true;
  });

  // save all the changes
  this.html.save.addEventListener('click', function(e) {
    self.updateKifu(
      self.kifu.id,
      SGF.print(self.boardCanvas.driver.gameTree.root),
      self.nodesDeletedDuringEdit
    )
  });

  // cancel changes
  this.html.cancel.addEventListener('click', function(e) {
    self.isEditting = false;
    self.updateNavEdit();
    // restore backup
    self.restoreBoardCanvas();
    // enable comments
    self.html.commentInput.disabled = false;
    self.html.commentSubmit.disabled = false;
  });

  // delete node
  this.html.deleteNode.addEventListener('click', function(e) {
    self.delete();
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
      self.boardCanvasBackup = null;
      // enable comments
      self.html.commentInput.disabled = false;
      self.html.commentSubmit.disabled = false;
      // exit edit mode
      self.isEditting = false;
      // update view
      self.updateNavEdit();
      self.updateCommentList();
      // re-enable save and cancel button
      self.html.save.disabled = false;
      self.html.cancel.disabled = false;
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      // re-enable save and cancel button
      self.html.save.disabled = false;
      self.html.cancel.disabled = false;
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
}

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
}

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
      console.log(xhr.responseText);
      window.location.replace(JSON.parse(xhr.responseText).redirect);
    // post failed
    } else if (xhr.readyState === 4 && xhr.status !== 200) {
      // re-enable delete button
      self.html.forkKifu.disabled = false;
      throw new exceptions.NetworkError(3, "Kifu Fork Failed");
    }
  });

  // send post request to server
  var url = '/fork/' + kifuID;
  xhr.open('POST', url);
  xhr.setRequestHeader('Content-type', 'application/json');
  xhr.send();
}

Controller.prototype.backupBoardCanvas = function() {
  this.boardCanvasBackup = new BoardCanvas(
    this.boardCanvas.canvas,
    this.boardCanvas.ctx,
    this.boardCanvas.driver.clone()
  );
}

Controller.prototype.restoreBoardCanvas = function() {
  if (!this.boardCanvasBackup) {
    return false;
  }

  // restore boardCanvas
  this.boardCanvas = this.boardCanvasBackup;

  // update state
  this.autoPlayIntervalID = null;
  this.isEditting = false;
  this.boardCanvasBackup = null; // backup is deleted

  // update view
  this.updateNavEdit();
  this.updateCommentList();
  this.boardCanvas.render();
}
