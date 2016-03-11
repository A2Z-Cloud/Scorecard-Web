/* */ 
var _ = require('../../util/index');
var transition = require('../../transition/index');
module.exports = {
  bind: function() {
    var next = this.el.nextElementSibling;
    if (next && _.attr(next, 'v-else') !== null) {
      this.elseEl = next;
    }
  },
  update: function(value) {
    this.apply(this.el, value);
    if (this.elseEl) {
      this.apply(this.elseEl, !value);
    }
  },
  apply: function(el, value) {
    function done() {
      el.style.display = value ? '' : 'none';
    }
    if (_.inDoc(el)) {
      transition.apply(el, value ? 1 : -1, done, this.vm);
    } else {
      done();
    }
  }
};
