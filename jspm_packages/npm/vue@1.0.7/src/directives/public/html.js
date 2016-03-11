/* */ 
var _ = require('../../util/index');
var templateParser = require('../../parsers/template');
module.exports = {
  bind: function() {
    if (this.el.nodeType === 8) {
      this.nodes = [];
      this.anchor = _.createAnchor('v-html');
      _.replace(this.el, this.anchor);
    }
  },
  update: function(value) {
    value = _.toString(value);
    if (this.nodes) {
      this.swap(value);
    } else {
      this.el.innerHTML = value;
    }
  },
  swap: function(value) {
    var i = this.nodes.length;
    while (i--) {
      _.remove(this.nodes[i]);
    }
    var frag = templateParser.parse(value, true, true);
    this.nodes = _.toArray(frag.childNodes);
    _.before(frag, this.anchor);
  }
};
