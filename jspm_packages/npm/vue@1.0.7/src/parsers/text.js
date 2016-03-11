/* */ 
var Cache = require('../cache');
var config = require('../config');
var dirParser = require('./directive');
var regexEscapeRE = /[-.*+?^${}()|[\]\/\\]/g;
var cache,
    tagRE,
    htmlRE;
function escapeRegex(str) {
  return str.replace(regexEscapeRE, '\\$&');
}
exports.compileRegex = function() {
  var open = escapeRegex(config.delimiters[0]);
  var close = escapeRegex(config.delimiters[1]);
  var unsafeOpen = escapeRegex(config.unsafeDelimiters[0]);
  var unsafeClose = escapeRegex(config.unsafeDelimiters[1]);
  tagRE = new RegExp(unsafeOpen + '(.+?)' + unsafeClose + '|' + open + '(.+?)' + close, 'g');
  htmlRE = new RegExp('^' + unsafeOpen + '.*' + unsafeClose + '$');
  cache = new Cache(1000);
};
exports.parse = function(text) {
  if (!cache) {
    exports.compileRegex();
  }
  var hit = cache.get(text);
  if (hit) {
    return hit;
  }
  text = text.replace(/\n/g, '');
  if (!tagRE.test(text)) {
    return null;
  }
  var tokens = [];
  var lastIndex = tagRE.lastIndex = 0;
  var match,
      index,
      html,
      value,
      first,
      oneTime;
  while (match = tagRE.exec(text)) {
    index = match.index;
    if (index > lastIndex) {
      tokens.push({value: text.slice(lastIndex, index)});
    }
    html = htmlRE.test(match[0]);
    value = html ? match[1] : match[2];
    first = value.charCodeAt(0);
    oneTime = first === 42;
    value = oneTime ? value.slice(1) : value;
    tokens.push({
      tag: true,
      value: value.trim(),
      html: html,
      oneTime: oneTime
    });
    lastIndex = index + match[0].length;
  }
  if (lastIndex < text.length) {
    tokens.push({value: text.slice(lastIndex)});
  }
  cache.put(text, tokens);
  return tokens;
};
exports.tokensToExp = function(tokens) {
  if (tokens.length > 1) {
    return tokens.map(function(token) {
      return formatToken(token);
    }).join('+');
  } else {
    return formatToken(tokens[0], true);
  }
};
function formatToken(token, single) {
  return token.tag ? inlineFilters(token.value, single) : '"' + token.value + '"';
}
var filterRE = /[^|]\|[^|]/;
function inlineFilters(exp, single) {
  if (!filterRE.test(exp)) {
    return single ? exp : '(' + exp + ')';
  } else {
    var dir = dirParser.parse(exp);
    if (!dir.filters) {
      return '(' + exp + ')';
    } else {
      return 'this._applyFilters(' + dir.expression + ',null,' + JSON.stringify(dir.filters) + ',false)';
    }
  }
}
