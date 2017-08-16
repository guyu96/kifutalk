// todo: prevent possible stack overflow errors

var SGF = (function() {
  var maxNodeID = -1;

  // a helper function that gets index of first ] that is not
  // escaped by a \ before it
  var noEscapeBracketIndex = function(s, start) {
    nebi = s.indexOf(']', start);
    if (nebi === -1) {
      return -1;
    }

    while (nebi !== -1 && s[nebi-1] === '\\') {
      start = nebi + 1;
      nebi = s.indexOf(']', start);
    }
    return nebi;
  };

  // parse a string containing actions into a list
  var parseActions = function(actionsStr) {
    var actions = [];
    var start = 0;
    // var bracketIndex = actionsStr.indexOf(']', start);
    var bracketIndex = noEscapeBracketIndex(actionsStr, start);

    // handle cases where one action is executed many times
    var lastActionProp = '';

    while (bracketIndex !== -1) {
      var i = actionsStr.indexOf('[', start);
      var prop = actionsStr.substring(start, i).trim().toUpperCase();
      var value = actionsStr.substring(i+1, bracketIndex).trim();

      actions.push(
        {
          'prop': prop === '' ? lastActionProp : prop,
          'value': value
        }
      );

      lastActionProp = prop === '' ? lastActionProp : prop;
      start = bracketIndex + 1;
      // bracketIndex = actionsStr.indexOf(']', start);
      bracketIndex = noEscapeBracketIndex(actionsStr, start);
    }

    return actions;
  }

  // Parse sgf string containing only 1 variation
  // Square brackets escaping is not enabled
  var parseVar = function(root, sgfStr) {
    var parent = root;
    // var nodeStrList = sgfStr.split(';');
    var nodeStrList = semValidSplit(sgfStr, ';');
    
    // i starts at 1 because the split list starts
    // with the empty string
    for (var i = 1; i < nodeStrList.length; i++) {
      var node = new Node(parent);
      node.actions = parseActions(nodeStrList[i]);
      // parse possible node id represented as an action
      for (var j = 0; j < node.actions.length; j++) {
        var action = node.actions[j];
        // id is present
        if (action.prop === 'ID') {
          var id = Number(action.value);
          if (Number.isNaN(id) || id < 0) {
            throw new exceptions.ParsingError(2, 'Invalid id: ' + action.value);
          // id is valid
          } else {
            // add id to node
            node.id = id;
            // update maxNodeID
            maxNodeID = node.id > maxNodeID? node.id: maxNodeID;
            // remove id from node.actions
            node.actions.splice(j, 1);
            break;
          }
        }
      }
      parent.addChild(node);
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

  // split a string using only semantically valid delimiters
  var semValidSplit = function(s, delim) {
    // first find indices of all occurences of delim in s
    delimIndices = [];
    for (var i = 0; i < s.length; i++) {
      if (s[i] === delim) {
        delimIndices.push(i);
      }
    }

    // remove semantically invalid delim indices
    var validDelimIndices = delimIndices.filter(function(i) {
      return isSemValid(s, i);
    });

    // finally, create the split list
    if (validDelimIndices.length === 0) {
      var splitList = [s];
    } else {
      var splitList = [];
      var start = 0;
      validDelimIndices.forEach(function(vdi) {
        splitList.push(s.substring(start, vdi));
        start = vdi + 1;
      });
      splitList.push(s.substring(start, s.length));
    }

    return splitList;
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
        if (end === -1) {
          throw new exceptions.ParsingError(1, 'Invalid SGF String');
        }
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
        if (end === -1) {
          throw new exceptions.ParsingError(1, 'Invalid SGF String');
        }
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
    // if parsing new kifu (without id tag)
    if (maxNodeID === -1) {
      // reset maxNodeID
      maxNodeID = -1;
      return new GameTree(root, addID(root));
    }
    // parsing kifu retrieved from database
    // reset maxNodeID
    var maxNodeIDCopy = maxNodeID;
    maxNodeID = -1;
    return new GameTree(root, maxNodeIDCopy+1);
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
      // print id
      if (node.id !== -1) {
        // in case the node has no actions
        if (node.actions.length === 0) {
          sgfStr += ';';
        }
        sgfStr += 'ID' + '[' + node.id + ']';
      }
      while (node.children.length === 1) {
        node = node.children[0];
        node.actions.forEach(function(action, i) {
          if (i === 0) {
            sgfStr += ';';
          }
          sgfStr += action.prop + '[' + action.value + ']';
        });
        // print id
        if (node.id !== -1) {
          // in case the node has no actions
          if (node.actions.length === 0) {
            sgfStr += ';';
          }
          sgfStr += 'ID' + '[' + node.id + ']';
        }
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
