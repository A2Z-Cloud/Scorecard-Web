/* */ 
var _ = require('../util/index');
var Cache = require('../cache');
var templateCache = new Cache(1000);
var idSelectorCache = new Cache(1000);
var map = {
  _default: [0, '', ''],
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>']
};
map.td = map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];
map.option = map.optgroup = [1, '<select multiple="multiple">', '</select>'];
map.thead = map.tbody = map.colgroup = map.caption = map.tfoot = [1, '<table>', '</table>'];
map.g = map.defs = map.symbol = map.use = map.image = map.text = map.circle = map.ellipse = map.line = map.path = map.polygon = map.polyline = map.rect = [1, '<svg ' + 'xmlns="http://www.w3.org/2000/svg" ' + 'xmlns:xlink="http://www.w3.org/1999/xlink" ' + 'xmlns:ev="http://www.w3.org/2001/xml-events"' + 'version="1.1">', '</svg>'];
function isRealTemplate(node) {
  return _.isTemplate(node) && node.content instanceof DocumentFragment;
}
var tagRE = /<([\w:]+)/;
var entityRE = /&\w+;|&#\d+;|&#x[\dA-F]+;/;
function stringToFragment(templateString) {
  var hit = templateCache.get(templateString);
  if (hit) {
    return hit;
  }
  var frag = document.createDocumentFragment();
  var tagMatch = templateString.match(tagRE);
  var entityMatch = entityRE.test(templateString);
  if (!tagMatch && !entityMatch) {
    frag.appendChild(document.createTextNode(templateString));
  } else {
    var tag = tagMatch && tagMatch[1];
    var wrap = map[tag] || map._default;
    var depth = wrap[0];
    var prefix = wrap[1];
    var suffix = wrap[2];
    var node = document.createElement('div');
    node.innerHTML = prefix + templateString.trim() + suffix;
    while (depth--) {
      node = node.lastChild;
    }
    var child;
    while (child = node.firstChild) {
      frag.appendChild(child);
    }
  }
  templateCache.put(templateString, frag);
  return frag;
}
function nodeToFragment(node) {
  if (isRealTemplate(node)) {
    _.trimNode(node.content);
    return node.content;
  }
  if (node.tagName === 'SCRIPT') {
    return stringToFragment(node.textContent);
  }
  var clone = exports.clone(node);
  var frag = document.createDocumentFragment();
  var child;
  while (child = clone.firstChild) {
    frag.appendChild(child);
  }
  _.trimNode(frag);
  return frag;
}
var hasBrokenTemplate = (function() {
  if (_.inBrowser) {
    var a = document.createElement('div');
    a.innerHTML = '<template>1</template>';
    return !a.cloneNode(true).firstChild.innerHTML;
  } else {
    return false;
  }
})();
var hasTextareaCloneBug = (function() {
  if (_.inBrowser) {
    var t = document.createElement('textarea');
    t.placeholder = 't';
    return t.cloneNode(true).value === 't';
  } else {
    return false;
  }
})();
exports.clone = function(node) {
  if (!node.querySelectorAll) {
    return node.cloneNode();
  }
  var res = node.cloneNode(true);
  var i,
      original,
      cloned;
  if (hasBrokenTemplate) {
    var clone = res;
    if (isRealTemplate(node)) {
      node = node.content;
      clone = res.content;
    }
    original = node.querySelectorAll('template');
    if (original.length) {
      cloned = clone.querySelectorAll('template');
      i = cloned.length;
      while (i--) {
        cloned[i].parentNode.replaceChild(exports.clone(original[i]), cloned[i]);
      }
    }
  }
  if (hasTextareaCloneBug) {
    if (node.tagName === 'TEXTAREA') {
      res.value = node.value;
    } else {
      original = node.querySelectorAll('textarea');
      if (original.length) {
        cloned = res.querySelectorAll('textarea');
        i = cloned.length;
        while (i--) {
          cloned[i].value = original[i].value;
        }
      }
    }
  }
  return res;
};
exports.parse = function(template, clone, noSelector) {
  var node,
      frag;
  if (template instanceof DocumentFragment) {
    _.trimNode(template);
    return clone ? exports.clone(template) : template;
  }
  if (typeof template === 'string') {
    if (!noSelector && template.charAt(0) === '#') {
      frag = idSelectorCache.get(template);
      if (!frag) {
        node = document.getElementById(template.slice(1));
        if (node) {
          frag = nodeToFragment(node);
          idSelectorCache.put(template, frag);
        }
      }
    } else {
      frag = stringToFragment(template);
    }
  } else if (template.nodeType) {
    frag = nodeToFragment(template);
  }
  return frag && clone ? exports.clone(frag) : frag;
};
