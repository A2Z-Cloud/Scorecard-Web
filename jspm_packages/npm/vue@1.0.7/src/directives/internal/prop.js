/* */ 
var _ = require('../../util/index');
var Watcher = require('../../watcher');
var bindingModes = require('../../config')._propBindingModes;
module.exports = {
  bind: function() {
    var child = this.vm;
    var parent = child._context;
    var prop = this.descriptor.prop;
    var childKey = prop.path;
    var parentKey = prop.parentPath;
    var twoWay = prop.mode === bindingModes.TWO_WAY;
    var parentWatcher = this.parentWatcher = new Watcher(parent, parentKey, function(val) {
      if (_.assertProp(prop, val)) {
        child[childKey] = val;
      }
    }, {
      twoWay: twoWay,
      filters: prop.filters,
      scope: this._scope
    });
    _.initProp(child, prop, parentWatcher.value);
    if (twoWay) {
      var self = this;
      child.$once('hook:created', function() {
        self.childWatcher = new Watcher(child, childKey, function(val) {
          parentWatcher.set(val);
        }, {sync: true});
      });
    }
  },
  unbind: function() {
    this.parentWatcher.teardown();
    if (this.childWatcher) {
      this.childWatcher.teardown();
    }
  }
};
