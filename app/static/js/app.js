var bc = new BoardCanvas(
  document.getElementById('board'),
  document.getElementById('board').getContext('2d'),
  new Driver(kifu.sgf)
);

var controller = new Controller(
  kifu,
  kifuComments,
  bc,
  document.getElementById('control')
);
