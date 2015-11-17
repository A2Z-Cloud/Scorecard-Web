/* */ 
var _ = require('../../util/index');
module.exports = {
  bind: function() {
    this.attr = this.el.nodeType === 3 ? 'data' : 'textContent';
  },
  update: function(value) {
    this.el[this.attr] = _.toString(value);
  }
};
