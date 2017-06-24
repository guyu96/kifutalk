var createThumbnail = function(sgfStr, quality) {
  var canvas = document.createElement('canvas');
  var driver = new Driver(sgfStr);
  // navigate to the end of kifu
  while (!driver.gameTree.atEnd()) {
    if (!driver.next()) {
      break;
    }
  }
  // render without markers/indicators and export as base64 image
  var bc = new BoardCanvas(canvas, canvas.getContext('2d'), driver);
  bc.simpleRender();
  var img = bc.canvas.toDataURL('image/jpeg', quality);
  // strip img of dataURL prefix
  return img.replace(/^data:image\/\w+;base64,/, '');
}
