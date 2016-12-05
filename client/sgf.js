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

  while (bracketIndex !== -1) {
    var i = actionsStr.indexOf('[', start);
    actions.push(
      {
        'prop': actionsStr.substring(start, i),
        'value': actionsStr.substring(i+1, bracketIndex)
      }
    );

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

function test() {
  var root = new Node(null);
  var sgfStr = '(;GM[1]FF[4]CA[UTF-8]SZ[19]AB[pd][nc][pq][qp][qi]AW[qn][qk]C[White feels extreme and decides not to answer the pincer at R11 of black\'s.How to attack?](;B[oj]C[What if white plays Tenuki here? (A)]LB[aa:A](;W[aa];B[pl]C[Is this attack strong enough? White can live, but give black a lot of influence as well. Would that be a worth investment of 2 moves (pincer the group, then keima) as early as ~50 moves into the game?To me it feels very underwhelming.];W[ql];B[pm];W[pn];B[on];W[oo];B[nn];W[pp];B[op];W[po];B[oq]C[This one might awkward];W[ri]C[White can live here I guess?])(;W[ok]C[In books they mention this move but never show the variations. Ones that I show here is ones I\'d immediately consider in a real game, but they make for a very awkward shape for white](;B[nk];W[ol];B[nl]C[This is so painful by cheeks hurt when I look at it];W[nm];B[mm];W[nn])(;B[mj]C[I would play this as black on this diagram, though];W[nk];B[mk];W[ml];B[ll];W[mm]LB[om:A][rm:B]C[Feels weird as white, also A is painful later, especially in a combination with B])))(;B[ok]C[This is a mistake, but one seen quite often in kyu games. It makes bad shape for black and I\'d assume it\'s quite bad on this diagram as well.However! I don\'t know the sequence that would end up good for white here. Despite black having a weird shape, most variations end up very well for black.];W[pj];B[oi]C[But how to proceed from here? What is the pattern?](;W[oj];B[nj](;W[nk]C[This one looks very risky for white])(;W[pi];B[ph](;W[oh];B[ni];W[qh];B[pg];W[rh]C[This one is obviously underwhelming, but at least it settles white for the time being])(;W[ni];B[oh];W[nk];B[mj];W[ol]LB[nl:A][oh:B]C[Or ASame result as when cutting at B - settles white but gives black a lot])(;W[nk];B[oh];W[mk]C[If you atari at A it feels a bit overconcentrated and also goteIf black extends at A now it\'s kinda painful]LB[ol:A])(;W[qh];B[pg]LB[pk:A][ri:B]C[I think white have to defend against the push at A now? Otherwise when white connects, black\'s B looks very painful])))(;W[pi];B[ph](;W[oh];B[qh];W[oj];B[ni];W[nj]C[Doing weird kyu-things here, I think one more push would be \"sente\" for white (otherwise the hane makes for a painful shape of black\'s), but then again it gives black so much on the top-right.Also the p9 has some aji and can be pulled out later to prevent white\'s shape])(;W[qh];B[qg];W[rh];B[pg]C[Underwhelming for obvious reasons];W[oj];B[ni]C[Black can give up the stone and keep building];W[nj];B[mi])(;W[ri];B[rh];W[rj]C[This one settles white in gote I guess, but there is so much aji around A now that I\'m not sure]LB[rm:A])))(;B[rl]C[This one is obviously a bad attack for black here](;W[ql]C[This is a \"kyu\" variation, I think many SDK would be able to play this one out if they don\'t know the proper response here.Still quite good for white];B[rk];W[rm];B[qj];W[ol])(;W[rk]C[Proper sequence](;B[qm];W[pm];B[rn];W[ql];B[rm];W[ok])(;B[ql]C[Common kyu (mostly DDK) mistake. Try to read out the results of white\'s A here. Fairly basic shape.]LB[pl:A]))))'
  
  parse(sgfStr, root, 0);
  traverseGameTree(root, 4);
}

test();
