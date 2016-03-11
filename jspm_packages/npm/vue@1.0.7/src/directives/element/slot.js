/* */ 
var _ = require('../../util/index');
var templateParser = require('../../parsers/template');
module.exports = {
  priority: 1750,
  params: ['name'],
  bind: function() {
    var host = this.vm;
    var raw = host.$options._content;
    var content;
    if (!raw) {
      this.fallback();
      return;
    }
    var context = host._context;
    var slotName = this.params.name;
    if (!slotName) {
      var self = this;
      var compileDefaultContent = function() {
        self.compile(extractFragment(raw.childNodes, raw, true), context, host);
      };
      if (!host._isCompiled) {
        host.$once('hook:compiled', compileDefaultContent);
      } else {
        compileDefaultContent();
      }
    } else {
      var selector = '[slot="' + slotName + '"]';
      var nodes = raw.querySelectorAll(selector);
      if (nodes.length) {
        content = extractFragment(nodes, raw);
        if (content.hasChildNodes()) {
          this.compile(content, context, host);
        } else {
          this.fallback();
        }
      } else {
        this.fallback();
      }
    }
  },
  fallback: function() {
    this.compile(_.extractContent(this.el, true), this.vm);
  },
  compile: function(content, context, host) {
    if (content && context) {
      var scope = host ? host._scope : this._scope;
      this.unlink = context.$compile(content, host, scope, this._frag);
    }
    if (content) {
      _.replace(this.el, content);
    } else {
      _.remove(this.el);
    }
  },
  unbind: function() {
    if (this.unlink) {
      this.unlink();
    }
  }
};
function extractFragment(nodes, parent, main) {
  var frag = document.createDocumentFragment();
  for (var i = 0,
      l = nodes.length; i < l; i++) {
    var node = nodes[i];
    if (main && !node.__v_selected) {
      append(node);
    } else if (!main && node.parentNode === parent) {
      node.__v_selected = true;
      append(node);
    }
  }
  return frag;
  function append(node) {
    if (_.isTemplate(node) && !node.hasAttribute('v-if') && !node.hasAttribute('v-for')) {
      node = templateParser.parse(node);
    }
    node = templateParser.clone(node);
    frag.appendChild(node);
  }
}
