var driver = new Driver(kifu.sgf);

if (nodeID) {
  try {
    driver.navigateTo(parseInt(nodeID));
  } catch (e) {
    console.error(e);
  }
}

var bc = new BoardCanvas(
  document.getElementById('board'),
  document.getElementById('board').getContext('2d'),
  driver
);

var controller = new Controller(
  kifu,
  kifuComments,
  bc,
  document.getElementById('control')
);

// if commentID is also available (nodeID must be available too)
// scroll that comment into view
if (nodeID && commentID) {
  try {
    // find the comment element
    var commentElements = controller.html.commentList.childNodes;
    var commentElement = null;
    for (var i = 0; i < commentElements.length; i++) {
      if (commentElements[i].getAttribute('comment-id') === commentID) {
        commentElement = commentElements[i];
        commentElement.classList.add('highlight');
        break;
      }
    }
    if (commentElement) {
      commentElement.scrollIntoView();
    }
  } catch (e) {
    console.error(e);
  }
}

if (edit === 'True') {
  controller.html.toggleEdit.click();
}
