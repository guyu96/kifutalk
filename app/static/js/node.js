var Node = function(parent) {
  // id used to identify the node in a game tree
  // -1 is placeholder value
  // first node in the tree should start with id number 0
  this.id = -1

  this.parent = parent;
  this.children = [];

  // an action is a prop-value pair
  // representation in sgf: P[V]
  // representation in javascript: {prop: P: value: V}
  this.actions = [];
};

Node.prototype.addChild = function(child) {
  this.children.push(child);
};

Node.prototype.addAction = function(prop, val) {
  this.actions.push({
    'prop': prop,
    'value': val
  });
};
