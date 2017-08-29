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

if (edit === 'True') {
  controller.html.toggleEdit.click();
}
