/* */ 
var _ = require('../util/index');
var transition = require('../transition/index');
function Fragment(linker, vm, frag, host, scope, parentFrag) {
  this.children = [];
  this.childFrags = [];
  this.vm = vm;
  this.scope = scope;
  this.inserted = false;
  this.parentFrag = parentFrag;
  if (parentFrag) {
    parentFrag.childFrags.push(this);
  }
  this.unlink = linker(vm, frag, host, scope, this);
  var single = this.single = frag.childNodes.length === 1;
  if (single) {
    this.node = frag.childNodes[0];
    this.before = singleBefore;
    this.remove = singleRemove;
  } else {
    this.node = _.createAnchor('fragment-start');
    this.end = _.createAnchor('fragment-end');
    this.frag = frag;
    _.prepend(this.node, frag);
    frag.appendChild(this.end);
    this.before = multiBefore;
    this.remove = multiRemove;
  }
  this.node.__vfrag__ = this;
}
Fragment.prototype.callHook = function(hook) {
  var i,
      l;
  for (i = 0, l = this.children.length; i < l; i++) {
    hook(this.children[i]);
  }
  for (i = 0, l = this.childFrags.length; i < l; i++) {
    this.childFrags[i].callHook(hook);
  }
};
Fragment.prototype.destroy = function() {
  if (this.parentFrag) {
    this.parentFrag.childFrags.$remove(this);
  }
  this.unlink();
};
function singleBefore(target, withTransition) {
  this.inserted = true;
  var method = withTransition !== false ? transition.before : _.before;
  method(this.node, target, this.vm);
  if (_.inDoc(this.node)) {
    this.callHook(attach);
  }
}
function singleRemove() {
  this.inserted = false;
  var shouldCallRemove = _.inDoc(this.node);
  var self = this;
  self.callHook(destroyChild);
  transition.remove(this.node, this.vm, function() {
    if (shouldCallRemove) {
      self.callHook(detach);
    }
    self.destroy();
  });
}
function multiBefore(target, withTransition) {
  this.inserted = true;
  var vm = this.vm;
  var method = withTransition !== false ? transition.before : _.before;
  _.mapNodeRange(this.node, this.end, function(node) {
    method(node, target, vm);
  });
  if (_.inDoc(this.node)) {
    this.callHook(attach);
  }
}
function multiRemove() {
  this.inserted = false;
  var self = this;
  var shouldCallRemove = _.inDoc(this.node);
  self.callHook(destroyChild);
  _.removeNodeRange(this.node, this.end, this.vm, this.frag, function() {
    if (shouldCallRemove) {
      self.callHook(detach);
    }
    self.destroy();
  });
}
function attach(child) {
  if (!child._isAttached) {
    child._callHook('attached');
  }
}
function destroyChild(child) {
  child.$destroy(false, true);
}
function detach(child) {
  if (child._isAttached) {
    child._callHook('detached');
  }
}
module.exports = Fragment;
