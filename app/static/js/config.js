var config = (function() {
  // board dimension
  var board_size = 19;

  // color palette
  var colors = {
    'bg': '#F1C070',
    'line': '#623F16',
    'star': '#623F16',
    'b': '#464646',
    'w': '#F8F8F8',
    'n': '#D44942',
    'mk': {
      '.': '#464646',
      'b': '#F8F8F8',
      'w': '#464646'
    }
  };

  // canvas appearance configuration
  var canvas = {
    'lw': 1, // line width
    'sp': 60, // spacing relative to line width
    'px': 600, // scale to how many pixels
    'er': 0.45, // click error range (see utils.c2b)
    'st': 0.5, // stone radius relative to spacing
    'mk': 0.3, // stone marker radius relative to spacing
    'mw': 2.5, // stone marker width relative to line width
    'sr': 0.1, // star point radius relative to spacing
    'nx': 0.32 // next move marker radius relative to spacing
  };

  // thumbnail quality
  var thumbnail_quality = 0.8;

  return {
    sz: board_size,
    colors: colors,
    canvas: canvas,
    tq: thumbnail_quality
  };
})();
