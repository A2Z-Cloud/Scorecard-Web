/* */ 
var _ = require('../util/index');
var uid = 0;
function Dep() {
  this.id = uid++;
  this.subs = [];
}
Dep.target = null;
Dep.prototype.addSub = function(sub) {
  this.subs.push(sub);
};
Dep.prototype.removeSub = function(sub) {
  this.subs.$remove(sub);
};
Dep.prototype.depend = function() {
  Dep.target.addDep(this);
};
Dep.prototype.notify = function() {
  var subs = _.toArray(this.subs);
  for (var i = 0,
      l = subs.length; i < l; i++) {
    subs[i].update();
  }
};
module.exports = Dep;
