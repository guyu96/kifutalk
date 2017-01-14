var Node = function(parent) {
  this.parent = parent;
  this.children = [];
  // an action is a prop-value pair
  // representation in sgf: P[V]
  // representation in javascript: {prop: P: value: V}
  this.actions = [];
}

Node.prototype.addChild = function(child) {
  this.children.push(child);
};

// parse a string containing actions into a list
function parseActions(actionsStr) {
  var actions = [];
  var start = 0;
  var bracketIndex = actionsStr.indexOf(']', start);

  // handle cases where one action is executed many times
  var lastActionProp = '';
  while (bracketIndex !== -1) {
    var i = actionsStr.indexOf('[', start);
    var prop = actionsStr.substring(start, i);
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

// Parse sgf string with no variations
// Square brackets escaping is not enabled
// Note: sgf string does not contain ()
function parseHelper(root, sgfStr) {
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
function isSemValid(sgfStr, i) {
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
function findValidPrtsMatch(sgfStr, i) {
  if (sgfStr[i] !== '(' || !isSemValid(sgfStr, i)) {
    console.error('Character NOT valid.');
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
function findVarEndIdx(sgfStr, i) {
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

// parse sgf
function parse(sgfStr, root, i) {
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
      parent = parseHelper(parent, sgfStr.substring(i, end));
      // move pointer i
      i = next;
    } else if (sgfStr[i] === '(') {
      // find the matching close parenthesis
      var end = findValidPrtsMatch(sgfStr, i);
      // recursively parse the subvariation
      // delete the open parenthesis but keep the close one
      parse(sgfStr.substring(i+1, end+1), parent, 0);
      i = end + 1;
    } else {
      console.error('Invalid SGF String.');
      break;
    }
  }
}

// print out a list of actions
function printActions(actions, offset) {
  var s = ' '.repeat(offset);
  actions.forEach(function(action) {
    s += action.prop + '[' + action.value + '] '
  });
  console.log(s);
}

// traverse the game tree and print out nodes
function traverseGameTree(root, i) {
  printActions(root.actions, i);
  root.children.forEach(function(child) {
    traverseGameTree(child, i+3);
  });
}
