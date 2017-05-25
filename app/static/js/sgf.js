// todo: prevent possible stack overflow errors

var SGF = (function() {
  // parse a string containing actions into a list
  var parseActions = function(actionsStr) {
    var actions = [];
    var start = 0;
    var bracketIndex = actionsStr.indexOf(']', start);

    // handle cases where one action is executed many times
    var lastActionProp = '';

    while (bracketIndex !== -1) {
      var i = actionsStr.indexOf('[', start);
      var prop = actionsStr.substring(start, i).toUpperCase();
      var value = actionsStr.substring(i+1, bracketIndex);

      actions.push(
        {
          'prop': prop === '' ? lastActionProp : prop,
          'value': value
        }
      );

      lastActionProp = prop === '' ? lastActionProp : prop;
      start = bracketIndex + 1;
      bracketIndex = actionsStr.indexOf(']', start);
    }

    return actions;
  }

  // Parse sgf string containing only 1 variation
  // Square brackets escaping is not enabled
  var parseVar = function(root, sgfStr) {
    var parent = root;
    nodeStrList = sgfStr.split(';');
    // i starts at 1 because the split list starts
    // with the empty string
    for (var i = 1; i < nodeStrList.length; i++) {
      var node = new Node(parent);
      parent.addChild(node);
      node.actions = parseActions(nodeStrList[i]);
      parent = node;
    }

    // this is the last node in the game tree
    return parent;
  }

  // check if sgfStr[i] is semantically valid
  // that is, it is not enclosed within []
  var isSemValid = function(sgfStr, i) {
    var iLeft = iRight = i;
    // go left and look for '['
    // if found, '[' must occur before ']'
    while (iLeft >= 0) {
      if (sgfStr[iLeft] === '[')
        break;
      // ']' occurs before '['
      if (sgfStr[iLeft] === ']')
        return true;
      // '[' is not found
      if (iLeft === 0)
        return true;
      iLeft--;
    }
    // go right and look for ']'
    // if found, ']' must occur before '['
    while (iRight < sgfStr.length) {
      if (sgfStr[iRight] === ']')
        break;
      // '[' occurs before ']'
      if (sgfStr[iRight] === '[')
        return true;
      // ']' is not found
      if (iRight === sgfStr.length - 1)
        return true;
      iRight++;
    }

    return false;
  }

  // return the index of matching close parenthesis
  // only semantically valid parentheses are considered
  var findValidPrtsMatch = function(sgfStr, i) {
    if (sgfStr[i] !== '(' || !isSemValid(sgfStr, i)) {
      throw new exceptions.ParsingError(0, 'Invalid Character: ' + sgfStr[i]);
      return -2;
    }

    var cnt = 0;
    while (i < sgfStr.length) {
      if (sgfStr[i] === '(' && isSemValid(sgfStr, i)) {
        cnt++;
      } else if (sgfStr[i] === ')' && isSemValid(sgfStr, i)) {
        cnt--;
      }
      if (cnt === 0) {
        return i;
      }
      i++;
    }
    
    return -1;
  }

  // find the end index of variation beginning at i
  var findVarEndIdx = function(sgfStr, i) {
    // find the first valid '(' or ')' appearing
    // after index i
    while (i < sgfStr.length) {
      if (sgfStr[i] === '(' || sgfStr[i] === ')') {
        if (isSemValid(sgfStr, i)) {
          return i;
        }
      }
      i++;
    }
    return -1;
  }

  // recursively parse sgf string and anchor them at root
  var parseHelper = function(sgfStr, root, i) {
    var parent = root;
    while (i < sgfStr.length) {
      // if whitespace
      if (/\s/.test(sgfStr[i])) {
        i++;
      // if close parenthesis
      } else if (sgfStr[i] === ')') {
        i++;
      } else if (sgfStr[i] === ';') {
        // find the end index of current variation
        var end = findVarEndIdx(sgfStr, i);
        // where to go after parsing current variation
        var next = sgfStr[end] === '(' ? end : end+1;
        // parse the current variation and set 
        // parent to the last node of the variation
        parent = parseVar(parent, sgfStr.substring(i, end));
        // move pointer i
        i = next;
      } else if (sgfStr[i] === '(') {
        // find the matching close parenthesis
        var end = findValidPrtsMatch(sgfStr, i);
        // recursively parse the subvariation
        // delete the open parenthesis but keep the close one
        parseHelper(sgfStr.substring(i+1, end+1), parent, 0);
        i = end + 1;
      } else {
        throw new exceptions.ParsingError(1, 'Invalid SGF String');
        break;
      }
    }
  }

  // add id to nodes in a game tree
  // return the next node's id shoud be
  var addID = function(root) {
    var id = 0;
    var helper = function(root) {
      root.id = id++;
      root.children.forEach(function(child) {
        helper(child);
      });
    };

    helper(root);
    return id;
  }

  // parse sgf string and return a game tree
  var parse = function(sgfStr) {
    var root = new Node(null);
    parseHelper(sgfStr, root, 0);
    return new GameTree(root, addID(root));
  }

  // convert a game tree into a SGF string
  var print = function(root) {
    var sgfStr = '';

    var helper = function(node) {
      // each variation starts with (
      sgfStr += '(';
      // print actions
      node.actions.forEach(function(action, i) {
        if (i === 0) {
          sgfStr += ';';
        }
        sgfStr += action.prop + '[' + action.value + ']';
      });
      // if there is only one branch
      while (node.children.length === 1) {
        node = node.children[0];
        node.actions.forEach(function(action, i) {
          if (i === 0) {
            sgfStr += ';';
          }
          sgfStr += action.prop + '[' + action.value + ']';
        });
      };
      // more than one branch
      node.children.forEach(function(child) {
        helper(child);
      });
      sgfStr += ')';
    }

    helper(root);
    return sgfStr;
  }

  return {
    parse: parse,
    print: print
  };
})();
