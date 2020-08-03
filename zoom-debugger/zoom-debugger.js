(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["ZoomDebugger"] = factory();
	else
		root["ZoomDebugger"] = factory();
})(window, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/zoom-debugger/index.ts");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./node_modules/moo/moo.js":
/*!*********************************!*\
  !*** ./node_modules/moo/moo.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

var __WEBPACK_AMD_DEFINE_FACTORY__, __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;(function(root, factory) {
  if (true) {
    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_FACTORY__ = (factory),
				__WEBPACK_AMD_DEFINE_RESULT__ = (typeof __WEBPACK_AMD_DEFINE_FACTORY__ === 'function' ?
				(__WEBPACK_AMD_DEFINE_FACTORY__.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__)) : __WEBPACK_AMD_DEFINE_FACTORY__),
				__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__)) /* global define */
  } else {}
}(this, function() {
  'use strict';

  var hasOwnProperty = Object.prototype.hasOwnProperty
  var toString = Object.prototype.toString
  var hasSticky = typeof new RegExp().sticky === 'boolean'

  /***************************************************************************/

  function isRegExp(o) { return o && toString.call(o) === '[object RegExp]' }
  function isObject(o) { return o && typeof o === 'object' && !isRegExp(o) && !Array.isArray(o) }

  function reEscape(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  }
  function reGroups(s) {
    var re = new RegExp('|' + s)
    return re.exec('').length - 1
  }
  function reCapture(s) {
    return '(' + s + ')'
  }
  function reUnion(regexps) {
    if (!regexps.length) return '(?!)'
    var source =  regexps.map(function(s) {
      return "(?:" + s + ")"
    }).join('|')
    return "(?:" + source + ")"
  }

  function regexpOrLiteral(obj) {
    if (typeof obj === 'string') {
      return '(?:' + reEscape(obj) + ')'

    } else if (isRegExp(obj)) {
      // TODO: consider /u support
      if (obj.ignoreCase) throw new Error('RegExp /i flag not allowed')
      if (obj.global) throw new Error('RegExp /g flag is implied')
      if (obj.sticky) throw new Error('RegExp /y flag is implied')
      if (obj.multiline) throw new Error('RegExp /m flag is implied')
      if (obj.unicode) throw new Error('RegExp /u flag is not allowed')
      return obj.source

    } else {
      throw new Error('Not a pattern: ' + obj)
    }
  }

  function objectToRules(object) {
    var keys = Object.getOwnPropertyNames(object)
    var result = []
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var thing = object[key]
      var rules = [].concat(thing)
      if (key === 'include') {
        for (var j = 0; j < rules.length; j++) {
          result.push({include: rules[j]})
        }
        continue
      }
      var match = []
      rules.forEach(function(rule) {
        if (isObject(rule)) {
          if (match.length) result.push(ruleOptions(key, match))
          result.push(ruleOptions(key, rule))
          match = []
        } else {
          match.push(rule)
        }
      })
      if (match.length) result.push(ruleOptions(key, match))
    }
    return result
  }

  function arrayToRules(array) {
    var result = []
    for (var i = 0; i < array.length; i++) {
      var obj = array[i]
      if (obj.include) {
        var include = [].concat(obj.include)
        for (var j = 0; j < include.length; j++) {
          result.push({include: include[j]})
        }
        continue
      }
      if (!obj.type) {
        throw new Error('Rule has no type: ' + JSON.stringify(obj))
      }
      result.push(ruleOptions(obj.type, obj))
    }
    return result
  }

  function ruleOptions(type, obj) {
    if (!isObject(obj)) {
      obj = { match: obj }
    }
    if (obj.include) {
      throw new Error('Matching rules cannot also include states')
    }

    // nb. error and fallback imply lineBreaks
    var options = {
      defaultType: type,
      lineBreaks: !!obj.error || !!obj.fallback,
      pop: false,
      next: null,
      push: null,
      error: false,
      fallback: false,
      value: null,
      type: null,
      shouldThrow: false,
    }

    // Avoid Object.assign(), so we support IE9+
    for (var key in obj) {
      if (hasOwnProperty.call(obj, key)) {
        options[key] = obj[key]
      }
    }

    // type transform cannot be a string
    if (typeof options.type === 'string' && type !== options.type) {
      throw new Error("Type transform cannot be a string (type '" + options.type + "' for token '" + type + "')")
    }

    // convert to array
    var match = options.match
    options.match = Array.isArray(match) ? match : match ? [match] : []
    options.match.sort(function(a, b) {
      return isRegExp(a) && isRegExp(b) ? 0
           : isRegExp(b) ? -1 : isRegExp(a) ? +1 : b.length - a.length
    })
    return options
  }

  function toRules(spec) {
    return Array.isArray(spec) ? arrayToRules(spec) : objectToRules(spec)
  }

  var defaultErrorRule = ruleOptions('error', {lineBreaks: true, shouldThrow: true})
  function compileRules(rules, hasStates) {
    var errorRule = null
    var fast = Object.create(null)
    var fastAllowed = true
    var groups = []
    var parts = []

    // If there is a fallback rule, then disable fast matching
    for (var i = 0; i < rules.length; i++) {
      if (rules[i].fallback) {
        fastAllowed = false
      }
    }

    for (var i = 0; i < rules.length; i++) {
      var options = rules[i]

      if (options.include) {
        // all valid inclusions are removed by states() preprocessor
        throw new Error('Inheritance is not allowed in stateless lexers')
      }

      if (options.error || options.fallback) {
        // errorRule can only be set once
        if (errorRule) {
          if (!options.fallback === !errorRule.fallback) {
            throw new Error("Multiple " + (options.fallback ? "fallback" : "error") + " rules not allowed (for token '" + options.defaultType + "')")
          } else {
            throw new Error("fallback and error are mutually exclusive (for token '" + options.defaultType + "')")
          }
        }
        errorRule = options
      }

      var match = options.match
      if (fastAllowed) {
        while (match.length && typeof match[0] === 'string' && match[0].length === 1) {
          var word = match.shift()
          fast[word.charCodeAt(0)] = options
        }
      }

      // Warn about inappropriate state-switching options
      if (options.pop || options.push || options.next) {
        if (!hasStates) {
          throw new Error("State-switching options are not allowed in stateless lexers (for token '" + options.defaultType + "')")
        }
        if (options.fallback) {
          throw new Error("State-switching options are not allowed on fallback tokens (for token '" + options.defaultType + "')")
        }
      }

      // Only rules with a .match are included in the RegExp
      if (match.length === 0) {
        continue
      }
      fastAllowed = false

      groups.push(options)

      // convert to RegExp
      var pat = reUnion(match.map(regexpOrLiteral))

      // validate
      var regexp = new RegExp(pat)
      if (regexp.test("")) {
        throw new Error("RegExp matches empty string: " + regexp)
      }
      var groupCount = reGroups(pat)
      if (groupCount > 0) {
        throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: … ) instead")
      }

      // try and detect rules matching newlines
      if (!options.lineBreaks && regexp.test('\n')) {
        throw new Error('Rule should declare lineBreaks: ' + regexp)
      }

      // store regex
      parts.push(reCapture(pat))
    }


    // If there's no fallback rule, use the sticky flag so we only look for
    // matches at the current index.
    //
    // If we don't support the sticky flag, then fake it using an irrefutable
    // match (i.e. an empty pattern).
    var fallbackRule = errorRule && errorRule.fallback
    var flags = hasSticky && !fallbackRule ? 'ym' : 'gm'
    var suffix = hasSticky || fallbackRule ? '' : '|'
    var combined = new RegExp(reUnion(parts) + suffix, flags)

    return {regexp: combined, groups: groups, fast: fast, error: errorRule || defaultErrorRule}
  }

  function compile(rules) {
    var result = compileRules(toRules(rules))
    return new Lexer({start: result}, 'start')
  }

  function checkStateGroup(g, name, map) {
    var state = g && (g.push || g.next)
    if (state && !map[state]) {
      throw new Error("Missing state '" + state + "' (in token '" + g.defaultType + "' of state '" + name + "')")
    }
    if (g && g.pop && +g.pop !== 1) {
      throw new Error("pop must be 1 (in token '" + g.defaultType + "' of state '" + name + "')")
    }
  }
  function compileStates(states, start) {
    var all = states.$all ? toRules(states.$all) : []
    delete states.$all

    var keys = Object.getOwnPropertyNames(states)
    if (!start) start = keys[0]

    var ruleMap = Object.create(null)
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      ruleMap[key] = toRules(states[key]).concat(all)
    }
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      var rules = ruleMap[key]
      var included = Object.create(null)
      for (var j = 0; j < rules.length; j++) {
        var rule = rules[j]
        if (!rule.include) continue
        var splice = [j, 1]
        if (rule.include !== key && !included[rule.include]) {
          included[rule.include] = true
          var newRules = ruleMap[rule.include]
          if (!newRules) {
            throw new Error("Cannot include nonexistent state '" + rule.include + "' (in state '" + key + "')")
          }
          for (var k = 0; k < newRules.length; k++) {
            var newRule = newRules[k]
            if (rules.indexOf(newRule) !== -1) continue
            splice.push(newRule)
          }
        }
        rules.splice.apply(rules, splice)
        j--
      }
    }

    var map = Object.create(null)
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i]
      map[key] = compileRules(ruleMap[key], true)
    }

    for (var i = 0; i < keys.length; i++) {
      var name = keys[i]
      var state = map[name]
      var groups = state.groups
      for (var j = 0; j < groups.length; j++) {
        checkStateGroup(groups[j], name, map)
      }
      var fastKeys = Object.getOwnPropertyNames(state.fast)
      for (var j = 0; j < fastKeys.length; j++) {
        checkStateGroup(state.fast[fastKeys[j]], name, map)
      }
    }

    return new Lexer(map, start)
  }

  function keywordTransform(map) {
    var reverseMap = Object.create(null)
    var byLength = Object.create(null)
    var types = Object.getOwnPropertyNames(map)
    for (var i = 0; i < types.length; i++) {
      var tokenType = types[i]
      var item = map[tokenType]
      var keywordList = Array.isArray(item) ? item : [item]
      keywordList.forEach(function(keyword) {
        (byLength[keyword.length] = byLength[keyword.length] || []).push(keyword)
        if (typeof keyword !== 'string') {
          throw new Error("keyword must be string (in keyword '" + tokenType + "')")
        }
        reverseMap[keyword] = tokenType
      })
    }

    // fast string lookup
    // https://jsperf.com/string-lookups
    function str(x) { return JSON.stringify(x) }
    var source = ''
    source += 'switch (value.length) {\n'
    for (var length in byLength) {
      var keywords = byLength[length]
      source += 'case ' + length + ':\n'
      source += 'switch (value) {\n'
      keywords.forEach(function(keyword) {
        var tokenType = reverseMap[keyword]
        source += 'case ' + str(keyword) + ': return ' + str(tokenType) + '\n'
      })
      source += '}\n'
    }
    source += '}\n'
    return Function('value', source) // type
  }

  /***************************************************************************/

  var Lexer = function(states, state) {
    this.startState = state
    this.states = states
    this.buffer = ''
    this.stack = []
    this.reset()
  }

  Lexer.prototype.reset = function(data, info) {
    this.buffer = data || ''
    this.index = 0
    this.line = info ? info.line : 1
    this.col = info ? info.col : 1
    this.queuedToken = info ? info.queuedToken : null
    this.queuedThrow = info ? info.queuedThrow : null
    this.setState(info ? info.state : this.startState)
    this.stack = info && info.stack ? info.stack.slice() : []
    return this
  }

  Lexer.prototype.save = function() {
    return {
      line: this.line,
      col: this.col,
      state: this.state,
      stack: this.stack.slice(),
      queuedToken: this.queuedToken,
      queuedThrow: this.queuedThrow,
    }
  }

  Lexer.prototype.setState = function(state) {
    if (!state || this.state === state) return
    this.state = state
    var info = this.states[state]
    this.groups = info.groups
    this.error = info.error
    this.re = info.regexp
    this.fast = info.fast
  }

  Lexer.prototype.popState = function() {
    this.setState(this.stack.pop())
  }

  Lexer.prototype.pushState = function(state) {
    this.stack.push(this.state)
    this.setState(state)
  }

  var eat = hasSticky ? function(re, buffer) { // assume re is /y
    return re.exec(buffer)
  } : function(re, buffer) { // assume re is /g
    var match = re.exec(buffer)
    // will always match, since we used the |(?:) trick
    if (match[0].length === 0) {
      return null
    }
    return match
  }

  Lexer.prototype._getGroup = function(match) {
    var groupCount = this.groups.length
    for (var i = 0; i < groupCount; i++) {
      if (match[i + 1] !== undefined) {
        return this.groups[i]
      }
    }
    throw new Error('Cannot find token type for matched text')
  }

  function tokenToString() {
    return this.value
  }

  Lexer.prototype.next = function() {
    var index = this.index

    // If a fallback token matched, we don't need to re-run the RegExp
    if (this.queuedGroup) {
      var token = this._token(this.queuedGroup, this.queuedText, index)
      this.queuedGroup = null
      this.queuedText = ""
      return token
    }

    var buffer = this.buffer
    if (index === buffer.length) {
      return // EOF
    }

    // Fast matching for single characters
    var group = this.fast[buffer.charCodeAt(index)]
    if (group) {
      return this._token(group, buffer.charAt(index), index)
    }

    // Execute RegExp
    var re = this.re
    re.lastIndex = index
    var match = eat(re, buffer)

    // Error tokens match the remaining buffer
    var error = this.error
    if (match == null) {
      return this._token(error, buffer.slice(index, buffer.length), index)
    }

    var group = this._getGroup(match)
    var text = match[0]

    if (error.fallback && match.index !== index) {
      this.queuedGroup = group
      this.queuedText = text

      // Fallback tokens contain the unmatched portion of the buffer
      return this._token(error, buffer.slice(index, match.index), index)
    }

    return this._token(group, text, index)
  }

  Lexer.prototype._token = function(group, text, offset) {
    // count line breaks
    var lineBreaks = 0
    if (group.lineBreaks) {
      var matchNL = /\n/g
      var nl = 1
      if (text === '\n') {
        lineBreaks = 1
      } else {
        while (matchNL.exec(text)) { lineBreaks++; nl = matchNL.lastIndex }
      }
    }

    var token = {
      type: (typeof group.type === 'function' && group.type(text)) || group.defaultType,
      value: typeof group.value === 'function' ? group.value(text) : text,
      text: text,
      toString: tokenToString,
      offset: offset,
      lineBreaks: lineBreaks,
      line: this.line,
      col: this.col,
    }
    // nb. adding more props to token object will make V8 sad!

    var size = text.length
    this.index += size
    this.line += lineBreaks
    if (lineBreaks !== 0) {
      this.col = size - nl + 1
    } else {
      this.col += size
    }

    // throw, if no rule with {error: true}
    if (group.shouldThrow) {
      throw new Error(this.formatError(token, "invalid syntax"))
    }

    if (group.pop) this.popState()
    else if (group.push) this.pushState(group.push)
    else if (group.next) this.setState(group.next)

    return token
  }

  if (typeof Symbol !== 'undefined' && Symbol.iterator) {
    var LexerIterator = function(lexer) {
      this.lexer = lexer
    }

    LexerIterator.prototype.next = function() {
      var token = this.lexer.next()
      return {value: token, done: !token}
    }

    LexerIterator.prototype[Symbol.iterator] = function() {
      return this
    }

    Lexer.prototype[Symbol.iterator] = function() {
      return new LexerIterator(this)
    }
  }

  Lexer.prototype.formatError = function(token, message) {
    var value = token.text
    var index = token.offset
    var eol = token.lineBreaks ? value.indexOf('\n') : value.length
    var start = Math.max(0, index - token.col + 1)
    var firstLine = this.buffer.substring(start, index + eol)
    message += " at line " + token.line + " col " + token.col + ":\n\n"
    message += "  " + firstLine + "\n"
    message += "  " + Array(token.col).join(" ") + "^"
    return message
  }

  Lexer.prototype.clone = function() {
    return new Lexer(this.states, this.state)
  }

  Lexer.prototype.has = function(tokenType) {
    return true
  }


  return {
    compile: compile,
    states: compileStates,
    error: Object.freeze({error: true}),
    fallback: Object.freeze({fallback: true}),
    keywords: keywordTransform,
  }

}));


/***/ }),

/***/ "./node_modules/nearley/lib/nearley.js":
/*!*********************************************!*\
  !*** ./node_modules/nearley/lib/nearley.js ***!
  \*********************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

(function(root, factory) {
    if ( true && module.exports) {
        module.exports = factory();
    } else {
        root.nearley = factory();
    }
}(this, function() {

    function Rule(name, symbols, postprocess) {
        this.id = ++Rule.highestId;
        this.name = name;
        this.symbols = symbols;        // a list of literal | regex class | nonterminal
        this.postprocess = postprocess;
        return this;
    }
    Rule.highestId = 0;

    Rule.prototype.toString = function(withCursorAt) {
        function stringifySymbolSequence (e) {
            return e.literal ? JSON.stringify(e.literal) :
                   e.type ? '%' + e.type : e.toString();
        }
        var symbolSequence = (typeof withCursorAt === "undefined")
                             ? this.symbols.map(stringifySymbolSequence).join(' ')
                             : (   this.symbols.slice(0, withCursorAt).map(stringifySymbolSequence).join(' ')
                                 + " ● "
                                 + this.symbols.slice(withCursorAt).map(stringifySymbolSequence).join(' ')     );
        return this.name + " → " + symbolSequence;
    }


    // a State is a rule at a position from a given starting point in the input stream (reference)
    function State(rule, dot, reference, wantedBy) {
        this.rule = rule;
        this.dot = dot;
        this.reference = reference;
        this.data = [];
        this.wantedBy = wantedBy;
        this.isComplete = this.dot === rule.symbols.length;
    }

    State.prototype.toString = function() {
        return "{" + this.rule.toString(this.dot) + "}, from: " + (this.reference || 0);
    };

    State.prototype.nextState = function(child) {
        var state = new State(this.rule, this.dot + 1, this.reference, this.wantedBy);
        state.left = this;
        state.right = child;
        if (state.isComplete) {
            state.data = state.build();
        }
        return state;
    };

    State.prototype.build = function() {
        var children = [];
        var node = this;
        do {
            children.push(node.right.data);
            node = node.left;
        } while (node.left);
        children.reverse();
        return children;
    };

    State.prototype.finish = function() {
        if (this.rule.postprocess) {
            this.data = this.rule.postprocess(this.data, this.reference, Parser.fail);
        }
    };


    function Column(grammar, index) {
        this.grammar = grammar;
        this.index = index;
        this.states = [];
        this.wants = {}; // states indexed by the non-terminal they expect
        this.scannable = []; // list of states that expect a token
        this.completed = {}; // states that are nullable
    }


    Column.prototype.process = function(nextColumn) {
        var states = this.states;
        var wants = this.wants;
        var completed = this.completed;

        for (var w = 0; w < states.length; w++) { // nb. we push() during iteration
            var state = states[w];

            if (state.isComplete) {
                state.finish();
                if (state.data !== Parser.fail) {
                    // complete
                    var wantedBy = state.wantedBy;
                    for (var i = wantedBy.length; i--; ) { // this line is hot
                        var left = wantedBy[i];
                        this.complete(left, state);
                    }

                    // special-case nullables
                    if (state.reference === this.index) {
                        // make sure future predictors of this rule get completed.
                        var exp = state.rule.name;
                        (this.completed[exp] = this.completed[exp] || []).push(state);
                    }
                }

            } else {
                // queue scannable states
                var exp = state.rule.symbols[state.dot];
                if (typeof exp !== 'string') {
                    this.scannable.push(state);
                    continue;
                }

                // predict
                if (wants[exp]) {
                    wants[exp].push(state);

                    if (completed.hasOwnProperty(exp)) {
                        var nulls = completed[exp];
                        for (var i = 0; i < nulls.length; i++) {
                            var right = nulls[i];
                            this.complete(state, right);
                        }
                    }
                } else {
                    wants[exp] = [state];
                    this.predict(exp);
                }
            }
        }
    }

    Column.prototype.predict = function(exp) {
        var rules = this.grammar.byName[exp] || [];

        for (var i = 0; i < rules.length; i++) {
            var r = rules[i];
            var wantedBy = this.wants[exp];
            var s = new State(r, 0, this.index, wantedBy);
            this.states.push(s);
        }
    }

    Column.prototype.complete = function(left, right) {
        var copy = left.nextState(right);
        this.states.push(copy);
    }


    function Grammar(rules, start) {
        this.rules = rules;
        this.start = start || this.rules[0].name;
        var byName = this.byName = {};
        this.rules.forEach(function(rule) {
            if (!byName.hasOwnProperty(rule.name)) {
                byName[rule.name] = [];
            }
            byName[rule.name].push(rule);
        });
    }

    // So we can allow passing (rules, start) directly to Parser for backwards compatibility
    Grammar.fromCompiled = function(rules, start) {
        var lexer = rules.Lexer;
        if (rules.ParserStart) {
          start = rules.ParserStart;
          rules = rules.ParserRules;
        }
        var rules = rules.map(function (r) { return (new Rule(r.name, r.symbols, r.postprocess)); });
        var g = new Grammar(rules, start);
        g.lexer = lexer; // nb. storing lexer on Grammar is iffy, but unavoidable
        return g;
    }


    function StreamLexer() {
      this.reset("");
    }

    StreamLexer.prototype.reset = function(data, state) {
        this.buffer = data;
        this.index = 0;
        this.line = state ? state.line : 1;
        this.lastLineBreak = state ? -state.col : 0;
    }

    StreamLexer.prototype.next = function() {
        if (this.index < this.buffer.length) {
            var ch = this.buffer[this.index++];
            if (ch === '\n') {
              this.line += 1;
              this.lastLineBreak = this.index;
            }
            return {value: ch};
        }
    }

    StreamLexer.prototype.save = function() {
      return {
        line: this.line,
        col: this.index - this.lastLineBreak,
      }
    }

    StreamLexer.prototype.formatError = function(token, message) {
        // nb. this gets called after consuming the offending token,
        // so the culprit is index-1
        var buffer = this.buffer;
        if (typeof buffer === 'string') {
            var nextLineBreak = buffer.indexOf('\n', this.index);
            if (nextLineBreak === -1) nextLineBreak = buffer.length;
            var line = buffer.substring(this.lastLineBreak, nextLineBreak)
            var col = this.index - this.lastLineBreak;
            message += " at line " + this.line + " col " + col + ":\n\n";
            message += "  " + line + "\n"
            message += "  " + Array(col).join(" ") + "^"
            return message;
        } else {
            return message + " at index " + (this.index - 1);
        }
    }


    function Parser(rules, start, options) {
        if (rules instanceof Grammar) {
            var grammar = rules;
            var options = start;
        } else {
            var grammar = Grammar.fromCompiled(rules, start);
        }
        this.grammar = grammar;

        // Read options
        this.options = {
            keepHistory: false,
            lexer: grammar.lexer || new StreamLexer,
        };
        for (var key in (options || {})) {
            this.options[key] = options[key];
        }

        // Setup lexer
        this.lexer = this.options.lexer;
        this.lexerState = undefined;

        // Setup a table
        var column = new Column(grammar, 0);
        var table = this.table = [column];

        // I could be expecting anything.
        column.wants[grammar.start] = [];
        column.predict(grammar.start);
        // TODO what if start rule is nullable?
        column.process();
        this.current = 0; // token index
    }

    // create a reserved token for indicating a parse fail
    Parser.fail = {};

    Parser.prototype.feed = function(chunk) {
        var lexer = this.lexer;
        lexer.reset(chunk, this.lexerState);

        var token;
        while (token = lexer.next()) {
            // We add new states to table[current+1]
            var column = this.table[this.current];

            // GC unused states
            if (!this.options.keepHistory) {
                delete this.table[this.current - 1];
            }

            var n = this.current + 1;
            var nextColumn = new Column(this.grammar, n);
            this.table.push(nextColumn);

            // Advance all tokens that expect the symbol
            var literal = token.text !== undefined ? token.text : token.value;
            var value = lexer.constructor === StreamLexer ? token.value : token;
            var scannable = column.scannable;
            for (var w = scannable.length; w--; ) {
                var state = scannable[w];
                var expect = state.rule.symbols[state.dot];
                // Try to consume the token
                // either regex or literal
                if (expect.test ? expect.test(value) :
                    expect.type ? expect.type === token.type
                                : expect.literal === literal) {
                    // Add it
                    var next = state.nextState({data: value, token: token, isToken: true, reference: n - 1});
                    nextColumn.states.push(next);
                }
            }

            // Next, for each of the rules, we either
            // (a) complete it, and try to see if the reference row expected that
            //     rule
            // (b) predict the next nonterminal it expects by adding that
            //     nonterminal's start state
            // To prevent duplication, we also keep track of rules we have already
            // added

            nextColumn.process();

            // If needed, throw an error:
            if (nextColumn.states.length === 0) {
                // No states at all! This is not good.
                var err = new Error(this.reportError(token));
                err.offset = this.current;
                err.token = token;
                throw err;
            }

            // maybe save lexer state
            if (this.options.keepHistory) {
              column.lexerState = lexer.save()
            }

            this.current++;
        }
        if (column) {
          this.lexerState = lexer.save()
        }

        // Incrementally keep track of results
        this.results = this.finish();

        // Allow chaining, for whatever it's worth
        return this;
    };

    Parser.prototype.reportError = function(token) {
        var lines = [];
        var tokenDisplay = (token.type ? token.type + " token: " : "") + JSON.stringify(token.value !== undefined ? token.value : token);
        lines.push(this.lexer.formatError(token, "Syntax error"));
        lines.push('Unexpected ' + tokenDisplay + '. Instead, I was expecting to see one of the following:\n');
        var lastColumnIndex = this.table.length - 2;
        var lastColumn = this.table[lastColumnIndex];
        var expectantStates = lastColumn.states
            .filter(function(state) {
                var nextSymbol = state.rule.symbols[state.dot];
                return nextSymbol && typeof nextSymbol !== "string";
            });
        
        // Display a "state stack" for each expectant state
        // - which shows you how this state came to be, step by step. 
        // If there is more than one derivation, we only display the first one.
        var stateStacks = expectantStates
            .map(function(state) {
                var stacks = this.buildStateStacks(state, []);
                return stacks[0];
            }, this);
        // Display each state that is expecting a terminal symbol next.
        stateStacks.forEach(function(stateStack) {
            var state = stateStack[0];
            var nextSymbol = state.rule.symbols[state.dot];
            var symbolDisplay = this.getSymbolDisplay(nextSymbol);
            lines.push('A ' + symbolDisplay + ' based on:');
            this.displayStateStack(stateStack, lines);
        }, this);
            
        lines.push("");
        return lines.join("\n");
    };

    Parser.prototype.displayStateStack = function(stateStack, lines) {
        var lastDisplay;
        var sameDisplayCount = 0;
        for (var j = 0; j < stateStack.length; j++) {
            var state = stateStack[j];
            var display = state.rule.toString(state.dot);
            if (display === lastDisplay) {
                sameDisplayCount++;
            } else {
                if (sameDisplayCount > 0) {
                    lines.push('    ⬆ ︎' + sameDisplayCount + ' more lines identical to this');
                }
                sameDisplayCount = 0;
                lines.push('    ' + display);
            }
            lastDisplay = display;
        }
    };

    Parser.prototype.getSymbolDisplay = function(symbol) {
        var type = typeof symbol;
        if (type === "string") {
            return symbol;
        } else if (type === "object" && symbol.literal) {
            return JSON.stringify(symbol.literal);
        } else if (type === "object" && symbol instanceof RegExp) {
            return 'character matching ' + symbol;
        } else if (type === "object" && symbol.type) {
            return symbol.type + ' token';
        } else {
            throw new Error('Unknown symbol type: ' + symbol);
        }
    };

    /*
    Builds a number of "state stacks". You can think of a state stack as the call stack
    of the recursive-descent parser which the Nearley parse algorithm simulates.
    A state stack is represented as an array of state objects. Within a 
    state stack, the first item of the array will be the starting
    state, with each successive item in the array going further back into history.
    
    This function needs to be given a starting state and an empty array representing
    the visited states, and it returns an array of state stacks. 
    
    */
    Parser.prototype.buildStateStacks = function(state, visited) {
        if (visited.indexOf(state) !== -1) {
            // Found cycle, return empty array (meaning no stacks)
            // to eliminate this path from the results, because
            // we don't know how to display it meaningfully
            return [];
        }
        if (state.wantedBy.length === 0) {
            return [[state]];
        }
        var that = this;

        return state.wantedBy.reduce(function(stacks, prevState) {
            return stacks.concat(that.buildStateStacks(
                prevState,
                [state].concat(visited))
                .map(function(stack) {
                    return [state].concat(stack);
                }));
        }, []);
    };

    Parser.prototype.save = function() {
        var column = this.table[this.current];
        column.lexerState = this.lexerState;
        return column;
    };

    Parser.prototype.restore = function(column) {
        var index = column.index;
        this.current = index;
        this.table[index] = column;
        this.table.splice(index + 1);
        this.lexerState = column.lexerState;

        // Incrementally keep track of results
        this.results = this.finish();
    };

    // nb. deprecated: use save/restore instead!
    Parser.prototype.rewind = function(index) {
        if (!this.options.keepHistory) {
            throw new Error('set option `keepHistory` to enable rewinding')
        }
        // nb. recall column (table) indicies fall between token indicies.
        //        col 0   --   token 0   --   col 1
        this.restore(this.table[index]);
    };

    Parser.prototype.finish = function() {
        // Return the possible parsings
        var considerations = [];
        var start = this.grammar.start;
        var column = this.table[this.table.length - 1]
        column.states.forEach(function (t) {
            if (t.rule.name === start
                    && t.dot === t.rule.symbols.length
                    && t.reference === 0
                    && t.data !== Parser.fail) {
                considerations.push(t);
            }
        });
        return considerations.map(function(c) {return c.data; });
    };

    return {
        Parser: Parser,
        Grammar: Grammar,
        Rule: Rule,
    };

}));


/***/ }),

/***/ "./src/lexer.js":
/*!**********************!*\
  !*** ./src/lexer.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const moo = __webpack_require__(/*! moo */ "./node_modules/moo/moo.js");

const lexer = moo.compile({
    ws: /[ \t]+/,
    nl: { match: "\n", lineBreaks: true },
    lte: "<=",
    lt: "<",
    gte: ">=",
    gt: ">",
    eq: "==",
    ne: "!=",
    not: "!",
    lparan: "(",
    rparan: ")",
    comma: ",",
    lbracket: "[",
    rbracket: "]",
    lbrace: "{",
    rbrace: "}",
    assignment: "=",
    plus: "+",
    minus: "-",
    multiply: "*",
    divide: "/",
    modulo: "%",
    colon: ":",
    comment: {
        match: /#[^\n]*/,
        value: s => s.substring(1)
    },
    string_literal: {
        match: /"(?:[^\n\\"]|\\["\\ntbfr])*"/,
        value: s => JSON.parse(s)
    },
    number_literal: {
        match: /[0-9]+(?:\.[0-9]+)?/,
        value: s => Number(s)
    },
    identifier: {
        match: /[a-z_][a-zA-Z_0-9]*/,
        type: moo.keywords({
            def: "def",
            while: "while",
            for: "for",
            else: "else",
            in: "in",
            if: "if",
            return: "return",
            and: "and",
            or: "or",
            true: "true",
            false: "false",
            break: "break"
        })
    }
});

module.exports = lexer;


/***/ }),

/***/ "./src/parser.js":
/*!***********************!*\
  !*** ./src/parser.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

const nearley = __webpack_require__(/*! nearley */ "./node_modules/nearley/lib/nearley.js");
const grammar = __webpack_require__(/*! ./play-lang */ "./src/play-lang.js");

exports.parse = function parse(code) {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(code);
    if (parser.results.length > 1) {
        throw new Error("The parser found ambiguous parses.");
    }
    if (parser.results.length === 0) {
        throw new Error("No parses found. Input appeared to be incomplete.");
    }
    const ast = parser.results[0];
    return ast;
}


/***/ }),

/***/ "./src/play-lang.js":
/*!**************************!*\
  !*** ./src/play-lang.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

// Generated automatically by nearley, version 2.19.0
// http://github.com/Hardmath123/nearley
(function () {
function id(x) { return x[0]; }

const lexer = __webpack_require__(/*! ./lexer */ "./src/lexer.js");

function tokenStart(token) {
    return {
        line: token.line,
        col: token.col - 1,
        offset: token.offset
    };
}

function tokenEnd(token) {
    const lastNewLine = token.text.lastIndexOf("\n");
    if (lastNewLine !== -1) {
        throw new Error("Unsupported case: token with line breaks");
    }
    return {
        line: token.line,
        col: token.col + token.text.length - 1,
        offset: token.offset + token.text.length
    };
}

function convertToken(token) {
    return {
        type: token.type,
        value: token.value,
        start: tokenStart(token),
        end: tokenEnd(token)
    };
}

function convertTokenId(data) {
    return convertToken(data[0]);
}

var grammar = {
    Lexer: lexer,
    ParserRules: [
    {"name": "input", "symbols": ["top_level_statements"], "postprocess": 
        d => ({
            type: "program",
            statements: d[0]
        })
            },
    {"name": "top_level_statements", "symbols": ["top_level_statement"], "postprocess": 
        d => [d[0]]
                },
    {"name": "top_level_statements", "symbols": ["top_level_statement", "_", {"literal":"\n"}, "_", "top_level_statements"], "postprocess": 
        d => [
            d[0],
            ...d[4]
        ]
                },
    {"name": "top_level_statements", "symbols": ["_", {"literal":"\n"}, "top_level_statements"], "postprocess": 
        d => d[2]
                },
    {"name": "top_level_statements", "symbols": ["_"], "postprocess": 
        d => []
                },
    {"name": "top_level_statement", "symbols": ["function_definition"], "postprocess": id},
    {"name": "top_level_statement", "symbols": ["line_comment"], "postprocess": id},
    {"name": "function_definition", "symbols": [{"literal":"def"}, "__", "identifier", "_", {"literal":"("}, "_", "parameter_list", "_", {"literal":")"}, "_", "code_block"], "postprocess": 
        d => ({
            type: "function_definition",
            name: d[2],
            parameters: d[6],
            body: d[10],
            start: tokenStart(d[0]),
            end: d[10].end
        })
                },
    {"name": "parameter_list", "symbols": [], "postprocess": () => []},
    {"name": "parameter_list", "symbols": ["identifier"], "postprocess": d => [d[0]]},
    {"name": "parameter_list", "symbols": ["identifier", "_", {"literal":","}, "_", "parameter_list"], "postprocess": 
        d => [d[0], ...d[4]]
                },
    {"name": "code_block", "symbols": [{"literal":"["}, "executable_statements", {"literal":"]"}], "postprocess": 
        (d) => ({
            type: "code_block",
            statements: d[1],
            start: tokenStart(d[0]),
            end: tokenEnd(d[2])
        })
            },
    {"name": "executable_statements", "symbols": ["_"], "postprocess": () => []},
    {"name": "executable_statements", "symbols": ["_", {"literal":"\n"}, "executable_statements"], "postprocess": (d) => d[2]},
    {"name": "executable_statements", "symbols": ["_", "executable_statement", "_"], "postprocess": d => [d[1]]},
    {"name": "executable_statements", "symbols": ["_", "executable_statement", "_", {"literal":"\n"}, "executable_statements"], "postprocess": 
        d => [d[1], ...d[4]]
                },
    {"name": "executable_statement", "symbols": ["return_statement"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["var_assignment"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["call_statement"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["line_comment"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["indexed_assignment"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["while_loop"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["if_statement"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["for_loop"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["function_definition"], "postprocess": id},
    {"name": "executable_statement", "symbols": ["break"], "postprocess": id},
    {"name": "return_statement$ebnf$1$subexpression$1", "symbols": ["__", "expression"]},
    {"name": "return_statement$ebnf$1", "symbols": ["return_statement$ebnf$1$subexpression$1"], "postprocess": id},
    {"name": "return_statement$ebnf$1", "symbols": [], "postprocess": function(d) {return null;}},
    {"name": "return_statement", "symbols": [{"literal":"return"}, "return_statement$ebnf$1"], "postprocess": 
        d => ({
            type: "return_statement",
            value: d[1] ? d[1][1] : null,
            start: tokenStart(d[0]),
            end: d[1] ? d[1][1].end : d[0].end
        })
               },
    {"name": "var_assignment", "symbols": ["identifier", "_", {"literal":"="}, "_", "expression"], "postprocess": 
        d => ({
            type: "var_assignment",
            var_name: d[0],
            value: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "call_statement", "symbols": ["call_expression"], "postprocess": id},
    {"name": "call_expression", "symbols": ["identifier", "_", {"literal":"("}, "argument_list", {"literal":")"}], "postprocess": 
        d => ({
            type: "call_expression",
            fun_name: d[0],
            arguments: d[3],
            start: d[0].start,
            end: tokenEnd(d[4])
        })
                },
    {"name": "indexed_access", "symbols": ["unary_expression", "_", {"literal":"["}, "_", "expression", "_", {"literal":"]"}], "postprocess": 
        d => ({
            type: "indexed_access",
            subject: d[0],
            index: d[4],
            start: d[0].start,
            end: tokenEnd(d[6])
        })
                },
    {"name": "indexed_assignment", "symbols": ["unary_expression", "_", {"literal":"["}, "_", "expression", "_", {"literal":"]"}, "_", {"literal":"="}, "_", "expression"], "postprocess": 
        d => ({
            type: "indexed_assignment",
            subject: d[0],
            index: d[4],
            value: d[10],
            start: d[0].start,
            end: d[10].end
        })
                },
    {"name": "while_loop", "symbols": [{"literal":"while"}, "__", "expression", "__", "code_block"], "postprocess": 
        d => ({
            type: "while_loop",
            condition: d[2],
            body: d[4],
            start: tokenStart(d[0]),
            end: d[4].end
        })
                },
    {"name": "if_statement", "symbols": [{"literal":"if"}, "__", "expression", "__", "code_block"], "postprocess": 
        d => ({
            type: "if_statement",
            condition: d[2],
            consequent: d[4],
            start: tokenStart(d[0]),
            end: d[4].end
        })
                },
    {"name": "if_statement", "symbols": [{"literal":"if"}, "__", "expression", "_", "code_block", "_", {"literal":"else"}, "__", "code_block"], "postprocess": 
        d => ({
            type: "if_statement",
            condition: d[2],
            consequent: d[4],
            alternate: d[8],
            start: tokenStart(d[0]),
            end: d[8].end
        })
                },
    {"name": "if_statement", "symbols": [{"literal":"if"}, "__", "expression", "_", "code_block", "_", {"literal":"else"}, "__", "if_statement"], "postprocess": 
        d => ({
            type: "if_statement",
            condition: d[2],
            consequent: d[4],
            alternate: d[8],
            start: tokenStart(d[0]),
            end: d[8].end
        })
               },
    {"name": "for_loop", "symbols": [{"literal":"for"}, "__", "identifier", "__", {"literal":"in"}, "__", "expression", "_", "code_block"], "postprocess": 
        d => ({
            type: "for_loop",
            loop_variable: d[2],
            iterable: d[6],
            body: d[8],
            start: tokenStart(d[0]),
            end: d[8].end
        })
                },
    {"name": "argument_list", "symbols": [], "postprocess": () => []},
    {"name": "argument_list", "symbols": ["_", "expression", "_"], "postprocess": d => [d[1]]},
    {"name": "argument_list", "symbols": ["_", "expression", "_", {"literal":","}, "argument_list"], "postprocess": 
        d => [d[1], ...d[4]]
                },
    {"name": "expression", "symbols": ["boolean_expression"], "postprocess": id},
    {"name": "boolean_expression", "symbols": ["comparison_expression"], "postprocess": id},
    {"name": "boolean_expression", "symbols": ["comparison_expression", "_", "boolean_operator", "_", "boolean_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: convertToken(d[2]),
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "boolean_operator", "symbols": [{"literal":"and"}], "postprocess": id},
    {"name": "boolean_operator", "symbols": [{"literal":"or"}], "postprocess": id},
    {"name": "comparison_expression", "symbols": ["additive_expression"], "postprocess": id},
    {"name": "comparison_expression", "symbols": ["additive_expression", "_", "comparison_operator", "_", "comparison_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: d[2],
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "comparison_operator", "symbols": [{"literal":">"}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":">="}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"<"}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"<="}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"=="}], "postprocess": convertTokenId},
    {"name": "comparison_operator", "symbols": [{"literal":"!="}], "postprocess": convertTokenId},
    {"name": "additive_expression", "symbols": ["multiplicative_expression"], "postprocess": id},
    {"name": "additive_expression", "symbols": ["multiplicative_expression", "_", /[+-]/, "_", "additive_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: convertToken(d[2]),
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "multiplicative_expression", "symbols": ["maybe_not_expression"], "postprocess": id},
    {"name": "multiplicative_expression", "symbols": ["maybe_not_expression", "_", /[*\/%]/, "_", "multiplicative_expression"], "postprocess": 
        d => ({
            type: "binary_operation",
            operator: convertToken(d[2]),
            left: d[0],
            right: d[4],
            start: d[0].start,
            end: d[4].end
        })
                },
    {"name": "maybe_not_expression", "symbols": [{"literal":"!"}, "_", "unary_expression"], "postprocess": 
        data => ({
            type: "not_operation",
            subject: data[2]
        })
                },
    {"name": "maybe_not_expression", "symbols": ["unary_expression"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["number"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["identifier"], "postprocess": 
        d => ({
            type: "var_reference",
            var_name: d[0],
            start: d[0].start,
            end: d[0].end
        })
                },
    {"name": "unary_expression", "symbols": ["call_expression"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["string_literal"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["list_literal"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["dictionary_literal"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["boolean_literal"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["indexed_access"], "postprocess": id},
    {"name": "unary_expression", "symbols": ["function_expression"], "postprocess": id},
    {"name": "unary_expression", "symbols": [{"literal":"("}, "expression", {"literal":")"}], "postprocess": 
        data => data[1]
                },
    {"name": "list_literal", "symbols": [{"literal":"["}, "list_items", {"literal":"]"}], "postprocess": 
        d => ({
            type: "list_literal",
            items: d[1],
            start: tokenStart(d[0]),
            end: tokenEnd(d[2])
        })
                },
    {"name": "list_items", "symbols": [], "postprocess": () => []},
    {"name": "list_items", "symbols": ["_ml", "expression", "_ml"], "postprocess": d => [d[1]]},
    {"name": "list_items", "symbols": ["_ml", "expression", "_ml", {"literal":","}, "list_items"], "postprocess": 
        d => [
            d[1],
            ...d[4]
        ]
                },
    {"name": "dictionary_literal", "symbols": [{"literal":"{"}, "dictionary_entries", {"literal":"}"}], "postprocess": 
        d => ({
            type: "dictionary_literal",
            entries: d[1],
            start: tokenStart(d[0]),
            end: tokenEnd(d[2])
        })
                },
    {"name": "dictionary_entries", "symbols": [], "postprocess": () => []},
    {"name": "dictionary_entries", "symbols": ["_ml", "dictionary_entry", "_ml"], "postprocess": 
        d => [d[1]]
                },
    {"name": "dictionary_entries", "symbols": ["_ml", "dictionary_entry", "_ml", {"literal":","}, "dictionary_entries"], "postprocess": 
        d => [d[1], ...d[4]]
                },
    {"name": "dictionary_entry", "symbols": ["identifier", "_ml", {"literal":":"}, "_ml", "expression"], "postprocess": 
        d => [d[0], d[4]]
                },
    {"name": "dictionary_entry", "symbols": ["string_literal", "_ml", {"literal":":"}, "_ml", "expression"], "postprocess": 
        d => [d[0], d[4]]
                },
    {"name": "boolean_literal", "symbols": [{"literal":"true"}], "postprocess": 
        d => ({
            type: "boolean_literal",
            value: true,
            start: tokenStart(d[0]),
            end: tokenEnd(d[0])
        })
                },
    {"name": "boolean_literal", "symbols": [{"literal":"false"}], "postprocess": 
        d => ({
            type: "boolean_literal",
            value: false,
            start: tokenStart(d[0]),
            end: tokenEnd(d[0])
        })
                },
    {"name": "function_expression", "symbols": [{"literal":"def"}, "_", {"literal":"("}, "_", "parameter_list", "_", {"literal":")"}, "_", "code_block"], "postprocess": 
        d => ({
            type: "function_expression",
            parameters: d[4],
            body: d[8],
            start: tokenStart(d[0]),
            end: d[8].end
        })
                },
    {"name": "line_comment", "symbols": [(lexer.has("comment") ? {type: "comment"} : comment)], "postprocess": convertTokenId},
    {"name": "string_literal", "symbols": [(lexer.has("string_literal") ? {type: "string_literal"} : string_literal)], "postprocess": convertTokenId},
    {"name": "number", "symbols": [(lexer.has("number_literal") ? {type: "number_literal"} : number_literal)], "postprocess": convertTokenId},
    {"name": "identifier", "symbols": [(lexer.has("identifier") ? {type: "identifier"} : identifier)], "postprocess": convertTokenId},
    {"name": "break", "symbols": [{"literal":"break"}], "postprocess": convertTokenId},
    {"name": "_ml$ebnf$1", "symbols": []},
    {"name": "_ml$ebnf$1", "symbols": ["_ml$ebnf$1", "multi_line_ws_char"], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_ml", "symbols": ["_ml$ebnf$1"]},
    {"name": "multi_line_ws_char", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "multi_line_ws_char", "symbols": [{"literal":"\n"}]},
    {"name": "__$ebnf$1", "symbols": [(lexer.has("ws") ? {type: "ws"} : ws)]},
    {"name": "__$ebnf$1", "symbols": ["__$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "__", "symbols": ["__$ebnf$1"]},
    {"name": "_$ebnf$1", "symbols": []},
    {"name": "_$ebnf$1", "symbols": ["_$ebnf$1", (lexer.has("ws") ? {type: "ws"} : ws)], "postprocess": function arrpush(d) {return d[0].concat([d[1]]);}},
    {"name": "_", "symbols": ["_$ebnf$1"]}
]
  , ParserStart: "input"
}
if ( true&& typeof module.exports !== 'undefined') {
   module.exports = grammar;
} else {
   window.grammar = grammar;
}
})();


/***/ }),

/***/ "./src/traverser.js":
/*!**************************!*\
  !*** ./src/traverser.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports) {

/*
traverse(ast, (node) => {
    return false;
})
*/
exports.traverse = 
function traverse(node, visit) {
    const result = visit(node);
    if (result === false) {
        return;
    }
    switch (node.type) {
        case "program":
            for (let childNode of node.statements) {
                traverse(childNode, visit);
            }
            break;
        case "comment":
            break;
        case "function_definition":
            traverse(node.body, visit);
            break;
        case "code_block":
            for (let childNode of node.statements) {
                traverse(childNode, visit);
            }
            break;
        case "call_expression":
            for (let childNode of node.arguments) {
                traverse(childNode, visit);
            }
            break;
        case "string_literal":
            break;
        case "var_assignment":
            traverse(node.value, visit);
            break;
        case "var_reference":
            break;
        case "dictionary_literal":
            for (let entry of node.entries) {
                const entryKey = entry[0];
                const entryValue = entry[1];
                traverse(entryKey, visit);
                traverse(entryValue, visit);
            }
            break;
        case "list_literal":
            for (let item of node.items) {
                traverse(item, visit);
            }
            break;
        case "for_loop":
            traverse(node.iterable, visit);
            traverse(node.body, visit);
            break;
        case "while_loop":
            traverse(node.condition, visit);
            traverse(node.body, visit);
            break;
        case "number_literal":
            break;
        case "boolean_literal":
            break;
        case "if_statement":
            traverse(node.condition, visit);
            traverse(node.consequent, visit);
            if (node.alternate) {
                traverse(node.alternate, visit);
            }
            break;
        case "indexed_assignment":
            traverse(node.subject, visit);
            traverse(node.index, visit);
            break;
        case "binary_operation":
            traverse(node.left, visit);
            traverse(node.right, visit);
            break;
        case "indexed_access":
            traverse(node.subject, visit);
            traverse(node.index, visit);
            break;
        case "indexed_assignment":
            traverse(node.subject, visit);
            traverse(node.index, visit);
            traverse(node.value, visit);
            break;
        case "function_expression":
            traverse(node.body, visit);
            break;
        case "identifier":
            break;
        case "return_statement":
            if (node.value) {
                traverse(node.value, visit);
            }
            break;
        case "not_operation":
            traverse(node.subject, visit);
            break;
        case "while_loop":
            traverse(node.condition, visit);
            traverse(node.body, visit);
            break;
        case "break":
            break;
        default:
            throw new Error("Unhandled node type: " + node.type);
    }
};

exports.traverseAndCollect = function traverseAndCollect(node, visit) {
    const result = visit(node);
    if (result) {
        return result;
    }

    if (node.type === "binary_operation") {
        return [
            ...traverseAndCollect(node.left, visit),
            ...traverseAndCollect(node.right, visit)
        ];
    } else if (node.type === "boolean_literal") {
        return [];
    } else if (node.type === "call_expression") {
        const result = [];
        for (let arg of node.arguments) {
            result.push(...traverseAndCollect(arg, visit));
        }
        return result;
    } else if (node.type === "code_block" || node.type === "program") {
        const result = [];
        for (let statement of node.statements) {
            result.push(...traverseAndCollect(statement, visit));
        }
        return result;
    } else if (node.type === "comment") {
        return [];
    } else if (node.type === "dictionary_literal") {
        const result = [];
        for (let entry of node.entries) {
            result.push(...traverseAndCollect(entry[0], visit));
            result.push(...traverseAndCollect(entry[1], visit));
        }
        return result;
    } else if (node.type === "for_loop") {
        return [
            ...traverseAndCollect(node.iterable, visit),
            ...traverseAndCollect(node.body, visit)
        ];
    } else if (
        node.type === "function_definition" ||
        node.type === "function_expression") {
        return traverseAndCollect(node.body, visit);
    } else if (node.type === "identifier") {
        return [];
    } else if (node.type === "if_statement") {
        const conditionClosures = traverseAndCollect(node.condition, visit);
        const consequentClosures = traverseAndCollect(node.consequent, visit);
        const alternateClosures =
            node.alternate &&
            traverseAndCollect(node.alternate, visit) ||
            [];
        return [
            ...conditionClosures,
            ...consequentClosures,
            ...alternateClosures
        ];
    } else if (node.type === "indexed_access") {
        return [
            ...traverseAndCollect(node.subject, visit),
            ...traverseAndCollect(node.index, visit)
        ];
    } else if (node.type === "indexed_assignment") {
        return [
            ...traverseAndCollect(node.subject, visit),
            ...traverseAndCollect(node.index, visit),
            ...traverseAndCollect(node.value, visit)
        ];
    } else if (node.type === "list_literal") {
        const result = [];
        for (let item of node.items) {
            result.push(...traverseAndCollect(item, visit));
        }
        return result;
    } else if (node.type === "number_literal") {
        return [];
    } else if (node.type === "string_literal") {
        return [];
    } else if (node.type === "return_statement") {
        return traverseAndCollect(node.value, visit);
    } else if (node.type === "var_assignment") {
        return traverseAndCollect(node.value, visit);
    } else if (node.type === "var_reference") {
        return [];
    } else if (node.type === "while_loop") {
        return [
            ...traverseAndCollect(node.condition, visit),
            ...traverseAndCollect(node.body, visit)
        ];
    } else {
        console.log("node", node);
        throw new Error("Unhandled node type: " + node.type);
    }
}


/***/ }),

/***/ "./src/zoom-debugger/code-scope-renderer.ts":
/*!**************************************************!*\
  !*** ./src/zoom-debugger/code-scope-renderer.ts ***!
  \**************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var fit_box_1 = __webpack_require__(/*! ./fit-box */ "./src/zoom-debugger/fit-box.ts");
var traverser_1 = __webpack_require__(/*! ../traverser */ "./src/traverser.js");
var CODE_LINE_HEIGHT = 1.5;
var CODE_FONT_FAMILY = "Monaco";
var LINE_NUMBER_COLOR = "#489dff";
var CODE_COLOR = "black";
var VARIABLE_DISPLAY_COLOR = "#f0b155";
var CodeScopeRenderer = /** @class */ (function () {
    function CodeScopeRenderer(entries, callExprCode, ast, code, textMeasurer) {
        this.entries = entries;
        this.callExprCode = callExprCode;
        this.ast = ast;
        this.code = code;
        this.textMeasurer = textMeasurer;
    }
    CodeScopeRenderer.prototype.render = function (ctx, bbox, viewport) {
        var e_1, _a;
        // TODO: move this logic to container
        if (bbox.x + bbox.width < viewport.x ||
            bbox.y + bbox.height < viewport.y ||
            bbox.x > viewport.width ||
            bbox.y > viewport.height) {
            return new Map();
        }
        var myArea = bbox.width * bbox.height;
        var myAreaRatio = myArea / (viewport.width * viewport.height);
        var firstEntry = this.entries[0];
        var stackFrame = firstEntry.stack[firstEntry.stack.length - 1];
        var funName = stackFrame.funName;
        var funNode = findFunction(this.ast, funName);
        var userDefinedFunctions = findNodesOfType(this.ast, "function_definition");
        var userDefinedFunctionNames = userDefinedFunctions.map(function (fun) { return fun.name.value; });
        ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
        var _b = groupHistoryEntries(funNode, this.entries, userDefinedFunctionNames), currentEntries = _b.currentEntries, childEntries = _b.childEntries;
        if (myAreaRatio < 0.4) {
            // not rendering children
            var textBox = {
                type: "text",
                text: this.callExprCode
            };
            fit_box_1.fitBox(textBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, this.textMeasurer, CODE_LINE_HEIGHT, ctx);
        }
        else {
            var _c = this.getCodeBox(this.code, currentEntries, childEntries, userDefinedFunctionNames, this.ast), codeBox = _c.codeBox, childMap = _c.childMap;
            var bboxMap = fit_box_1.fitBox(codeBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, this.textMeasurer, CODE_LINE_HEIGHT, ctx);
            var childRenderables = new Map();
            try {
                for (var childMap_1 = __values(childMap), childMap_1_1 = childMap_1.next(); !childMap_1_1.done; childMap_1_1 = childMap_1.next()) {
                    var _d = __read(childMap_1_1.value, 2), box = _d[0], renderable = _d[1];
                    var childBBox = bboxMap.get(box);
                    childRenderables.set(childBBox, renderable);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (childMap_1_1 && !childMap_1_1.done && (_a = childMap_1["return"])) _a.call(childMap_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return childRenderables;
        }
        return new Map();
    };
    CodeScopeRenderer.prototype.getCodeBox = function (code, currentEntries, childEntries, userDefinedFunctionNames, ast) {
        // rendering children
        //console.log(indent + "myAreaRatio >= 0.5");
        var codeLines = code.split("\n");
        var firstEntry = currentEntries[0];
        var stackFrame = firstEntry.stack[firstEntry.stack.length - 1];
        var funName = stackFrame.funName;
        var funNode = findFunction(ast, funName);
        var lineNumberWidth = 3;
        var childMap = new Map();
        var codeBox = {
            type: "container",
            direction: "vertical",
            children: []
        };
        // layout the function signature
        codeBox.children.push(this.layoutFunctionSignature(funNode, stackFrame, codeLines, lineNumberWidth));
        var _loop_1 = function (i) {
            var e_2, _a, e_3, _b, _c, _d;
            var entry = currentEntries[i];
            var nextEntry = currentEntries[i + 1];
            if (nextEntry && entry.line === nextEntry.line) {
                return "continue";
            }
            var line = codeLines[entry.line - 1];
            var lineNumberBox = {
                type: "text",
                text: String(entry.line).padEnd(lineNumberWidth) + "  ",
                color: LINE_NUMBER_COLOR
            };
            var lineBox = {
                type: "container",
                direction: "horizontal",
                children: [
                    lineNumberBox
                ]
            };
            // See if there are callExpr nodes
            var curpos = 0;
            var callExprNodes = findNodesOfTypeOnLine(funNode, "call_expression", entry.line);
            try {
                for (var callExprNodes_1 = __values(callExprNodes), callExprNodes_1_1 = callExprNodes_1.next(); !callExprNodes_1_1.done; callExprNodes_1_1 = callExprNodes_1.next()) {
                    var callExprNode = callExprNodes_1_1.value;
                    if (!userDefinedFunctionNames.includes(callExprNode.fun_name.value)) {
                        continue;
                    }
                    var startIdx = callExprNode.start.col;
                    var endIdx = callExprNode.end.col;
                    var previousCode = line.slice(curpos, startIdx);
                    lineBox.children.push({
                        type: "text",
                        text: previousCode,
                        color: CODE_COLOR
                    });
                    var callExprCode = line.slice(startIdx, endIdx);
                    var callExprTextBox = {
                        type: "text",
                        text: callExprCode,
                        color: CODE_COLOR
                    };
                    childMap.set(callExprTextBox, new CodeScopeRenderer(childEntries.get(callExprNode), callExprCode, this_1.ast, this_1.code, this_1.textMeasurer));
                    lineBox.children.push(callExprTextBox);
                    curpos = endIdx;
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (callExprNodes_1_1 && !callExprNodes_1_1.done && (_a = callExprNodes_1["return"])) _a.call(callExprNodes_1);
                }
                finally { if (e_2) throw e_2.error; }
            }
            // wrap up
            var rest = line.slice(curpos);
            if (rest.length > 0) {
                lineBox.children.push({
                    type: "text",
                    text: rest,
                    color: CODE_COLOR
                });
            }
            var valueDisplayStrings = [];
            var _loop_2 = function (callExprNode) {
                var myChildEntries = childEntries.get(callExprNode);
                if (!myChildEntries) {
                    return "continue";
                }
                var lastChildEntry = myChildEntries[myChildEntries.length - 1];
                var lastChildEntryStackFrame = lastChildEntry.stack[lastChildEntry.stack.length - 1];
                var funName_1 = lastChildEntryStackFrame.funName;
                var funDefNode = findNodesOfType(ast, "function_definition").find(function (node) { return node.name.value === funName_1; });
                var parameterList = funDefNode.parameters.map(function (param) {
                    var paramName = param.value;
                    var paramValue = lastChildEntryStackFrame.parameters[paramName];
                    return paramValue;
                });
                var callExprCode = funName_1 + "(" + parameterList + ")";
                var retVal = String(lastChildEntryStackFrame.variables["<ret val>"]);
                var actualCallExprBox = {
                    type: "text",
                    text: "" + callExprCode,
                    color: VARIABLE_DISPLAY_COLOR
                };
                childMap.set(actualCallExprBox, new CodeScopeRenderer(childEntries.get(callExprNode), callExprCode, this_1.ast, this_1.code, this_1.textMeasurer));
                valueDisplayStrings.push([
                    actualCallExprBox,
                    {
                        type: "text",
                        text: " = ",
                        color: VARIABLE_DISPLAY_COLOR
                    },
                    {
                        type: "text",
                        text: retVal,
                        border: {
                            width: 3,
                            color: "black"
                        },
                        color: VARIABLE_DISPLAY_COLOR
                    }
                ]);
            };
            try {
                for (var callExprNodes_2 = __values(callExprNodes), callExprNodes_2_1 = callExprNodes_2.next(); !callExprNodes_2_1.done; callExprNodes_2_1 = callExprNodes_2.next()) {
                    var callExprNode = callExprNodes_2_1.value;
                    _loop_2(callExprNode);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (callExprNodes_2_1 && !callExprNodes_2_1.done && (_b = callExprNodes_2["return"])) _b.call(callExprNodes_2);
                }
                finally { if (e_3) throw e_3.error; }
            }
            // Display variable values for assignments
            var assignmentNode = findNodesOfTypeOnLine(funNode, "var_assignment", entry.line)[0];
            if (assignmentNode) {
                var varName = assignmentNode.var_name.value;
                var nextStackFrame = nextEntry.stack[nextEntry.stack.length - 1];
                var varValue = nextStackFrame.variables[varName];
                if (typeof varValue === "object") {
                    // heap reference
                    varValue = nextEntry.heap[varValue.id];
                }
                var varValueDisplay = this_1.getVarValueDisplay(varValue, childMap, nextEntry.heap);
                var prefix_1 = varName + " = ";
                var tboxes = varValueDisplay.map(function (boxes, idx) {
                    if (idx === 0) {
                        return __spread([
                            {
                                type: "text",
                                text: prefix_1,
                                color: VARIABLE_DISPLAY_COLOR
                            }
                        ], boxes);
                    }
                    else {
                        return __spread([
                            {
                                type: "text",
                                text: Array(prefix_1.length + 1).join(" ")
                            }
                        ], boxes);
                    }
                });
                valueDisplayStrings.push.apply(valueDisplayStrings, __spread(tboxes));
            }
            // Display variable values for return statements
            var returnStatement = findNodesOfTypeOnLine(funNode, "return_statement", entry.line)[0];
            if (returnStatement) {
                var nextStackFrame = nextEntry.stack[nextEntry.stack.length - 1];
                var varValue = String(nextStackFrame.variables["<ret val>"]);
                valueDisplayStrings.push([
                    {
                        type: "text",
                        text: "<ret val> = ",
                        color: VARIABLE_DISPLAY_COLOR
                    },
                    {
                        type: "text",
                        text: varValue,
                        border: {
                            width: 3,
                            color: "black"
                        },
                        color: VARIABLE_DISPLAY_COLOR
                    }
                ]);
            }
            codeBox.children.push(lineBox);
            if (valueDisplayStrings.length > 0) {
                lineBox.children.push({
                    type: "text",
                    text: "  "
                });
                (_c = lineBox.children).push.apply(_c, __spread(valueDisplayStrings[0]));
                for (var i_1 = 1; i_1 < valueDisplayStrings.length; i_1++) {
                    var blankLineBox = {
                        type: "container",
                        direction: "horizontal",
                        children: []
                    };
                    blankLineBox.children.push({
                        type: "text",
                        text: "".padStart(lineNumberWidth + line.length + 4)
                    });
                    (_d = blankLineBox.children).push.apply(_d, __spread(valueDisplayStrings[i_1]));
                    codeBox.children.push(blankLineBox);
                }
            }
        };
        var this_1 = this;
        // Go through current entries and layout the code line by line
        for (var i = 0; i < currentEntries.length; i++) {
            _loop_1(i);
        }
        return {
            codeBox: codeBox,
            childMap: childMap
        };
    };
    CodeScopeRenderer.prototype.layoutFunctionSignature = function (funNode, stackFrame, codeLines, lineNumberWidth) {
        var e_4, _a;
        var funSigBox = {
            type: "container",
            direction: "horizontal",
            children: [
                {
                    type: "text",
                    text: String(funNode.start.line).padEnd(lineNumberWidth) + "  ",
                    color: LINE_NUMBER_COLOR
                },
                {
                    type: "text",
                    text: codeLines[funNode.start.line - 1],
                    color: CODE_COLOR
                }
            ]
        };
        try {
            for (var _b = __values(funNode.parameters), _c = _b.next(); !_c.done; _c = _b.next()) {
                var param = _c.value;
                var paramName = param.value;
                var value = stackFrame.variables[paramName];
                funSigBox.children.push({
                    type: "text",
                    text: "  " + paramName + " = " + value,
                    color: VARIABLE_DISPLAY_COLOR
                });
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_4) throw e_4.error; }
        }
        return funSigBox;
    };
    CodeScopeRenderer.prototype.getVarValueDisplay = function (varValue, childMap, heap) {
        var _this = this;
        var textAttrs = {
            border: {
                width: 3,
                color: "black"
            },
            color: VARIABLE_DISPLAY_COLOR
        };
        if (typeof varValue === "string") {
            return [[__assign({ type: "text", text: '"' + varValue + '"' }, textAttrs)]];
        }
        else if (Array.isArray(varValue)) {
            var array = varValue;
            return [array.map(function (item) {
                    var textBox = __assign({ type: "text", text: " " + JSON.stringify(item) + " " }, textAttrs);
                    if (typeof item === "object") {
                        childMap.set(textBox, {
                            render: function (ctx, bbox, viewport) {
                                var e_5, _a;
                                var myArea = bbox.width * bbox.height;
                                var myAreaRatio = myArea / (viewport.width * viewport.height);
                                if (myAreaRatio > 0.001) {
                                    var value = heap[item.id];
                                    ctx.clearRect(bbox.x, bbox.y, bbox.width, bbox.height);
                                    var childMap_2 = new Map();
                                    var rows = _this.getVarValueDisplay(value, childMap_2, heap);
                                    var outerBox = {
                                        type: "container",
                                        direction: "vertical",
                                        children: rows.map(function (cells) { return ({
                                            type: "container",
                                            direction: "horizontal",
                                            children: cells
                                        }); })
                                    };
                                    var bboxMap = fit_box_1.fitBox(outerBox, bbox, viewport, CODE_FONT_FAMILY, "normal", true, _this.textMeasurer, CODE_LINE_HEIGHT, ctx);
                                    var childBboxMap = new Map();
                                    try {
                                        for (var _b = __values(bboxMap.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                                            var _d = __read(_c.value, 2), box = _d[0], renderable = _d[1];
                                            childBboxMap.set(bboxMap.get(box), renderable);
                                        }
                                    }
                                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                                    finally {
                                        try {
                                            if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
                                        }
                                        finally { if (e_5) throw e_5.error; }
                                    }
                                    //return childBboxMap;
                                }
                                return new Map();
                            }
                        });
                    }
                    return textBox;
                })];
        }
        else if (typeof varValue === "object") {
            var dict = varValue;
            var boxes = [];
            for (var key in dict) {
                var value = dict[key];
                boxes.push([
                    __assign({ type: "text", text: " " + key + " " }, textAttrs),
                    __assign({ type: "text", text: " " + JSON.stringify(value) + " " }, textAttrs)
                ]);
            }
            return boxes;
        }
        else {
            return [[
                    __assign({ type: "text", text: String(varValue) }, textAttrs)
                ]];
        }
    };
    CodeScopeRenderer.prototype.toString = function () {
        return this.callExprCode;
    };
    return CodeScopeRenderer;
}());
exports.CodeScopeRenderer = CodeScopeRenderer;
function groupHistoryEntries(funNode, entries, userDefinedFunctionNames) {
    var e_6, _a;
    var currentStackHeight = entries[0].stack.length;
    var childEntries = new Map();
    var currentEntries = [];
    var currentLine = null;
    var callExprs = null;
    var currentCallExprIdx = null;
    try {
        for (var entries_1 = __values(entries), entries_1_1 = entries_1.next(); !entries_1_1.done; entries_1_1 = entries_1.next()) {
            var entry = entries_1_1.value;
            if (entry.stack.length === currentStackHeight) {
                if (currentLine !== entry.line) {
                    currentLine = entry.line;
                    // initialize context for this line
                    currentEntries.push(entry);
                    // find call expressions on this line
                    callExprs = findNodesOfTypeOnLine(funNode, "call_expression", entry.line)
                        .filter(function (expr) { return userDefinedFunctionNames.includes(expr.fun_name.value); });
                    currentCallExprIdx = 0;
                }
                else { // currentLine === entry.line
                    currentCallExprIdx++;
                }
            }
            else {
                // nested scope execution
                var callExpr = callExprs[currentCallExprIdx];
                if (!childEntries.has(callExpr)) {
                    childEntries.set(callExpr, []);
                }
                childEntries.get(callExpr).push(entry);
            }
        }
    }
    catch (e_6_1) { e_6 = { error: e_6_1 }; }
    finally {
        try {
            if (entries_1_1 && !entries_1_1.done && (_a = entries_1["return"])) _a.call(entries_1);
        }
        finally { if (e_6) throw e_6.error; }
    }
    return {
        currentEntries: currentEntries,
        childEntries: childEntries
    };
}
function findLine(ast, lineNo) {
    var found;
    traverser_1.traverse(ast, function (node) {
        if (node.start && node.start.line === lineNo) {
            found = node;
            return false;
        }
        else {
            return undefined;
        }
    });
    return found;
}
function findFunction(ast, name) {
    var fun;
    traverser_1.traverse(ast, function (node) {
        if (node.type === "function_definition" && node.name.value === name) {
            fun = node;
        }
    });
    return fun;
}
function findNodesOfType(node, type) {
    var defs = [];
    traverser_1.traverse(node, function (childNode) {
        if (childNode.type === type) {
            defs.push(childNode);
        }
    });
    return defs;
}
function findNodesOfTypeOnLine(node, type, lineNo) {
    var defs = [];
    traverser_1.traverse(node, function (childNode) {
        if (childNode.type === type && childNode.start.line === lineNo) {
            defs.push(childNode);
        }
    });
    return defs;
}


/***/ }),

/***/ "./src/zoom-debugger/fit-box.ts":
/*!**************************************!*\
  !*** ./src/zoom-debugger/fit-box.ts ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var TextMeasurer = /** @class */ (function () {
    function TextMeasurer(ctx, fixedWidth) {
        this.fixedWidth = fixedWidth;
        this.widthTable = {};
        this.fixedWidthFontRatio = {};
        this.ctx = ctx;
    }
    TextMeasurer.prototype.setFont = function (fontSetting) {
        this.fontSetting = fontSetting;
        this.font = fontSetting.weight + " " + fontSetting.size + "px " + fontSetting.family;
        if (this.fixedWidth) {
            this.font = fontSetting.weight + " " + fontSetting.size + "px " + fontSetting.family;
            var key = fontSetting.weight + "-" + fontSetting.family;
            if (!(key in this.fixedWidthFontRatio)) {
                this.ctx.font = fontSetting.weight + " 10px " + fontSetting.family;
                var ratio = this.ctx.measureText("i").width / 10;
                this.fixedWidthFontRatio[key] = ratio;
            }
        }
        else {
            this.ctx.font = this.font;
        }
    };
    TextMeasurer.prototype.measureText = function (text) {
        var e_1, _a;
        if (this.fixedWidth) {
            var ratio = this.fixedWidthFontRatio[this.fontSetting.weight + "-" + this.fontSetting.family];
            return text.length * ratio * this.fontSetting.size;
        }
        else {
            var totalWidth = 0;
            try {
                for (var text_1 = __values(text), text_1_1 = text_1.next(); !text_1_1.done; text_1_1 = text_1.next()) {
                    var chr = text_1_1.value;
                    var chrKey = chr + this.font;
                    var width_1 = this.widthTable[chrKey];
                    if (!width_1) {
                        width_1 = this.ctx.measureText(chr).width;
                        this.widthTable[chrKey] = width_1;
                    }
                    totalWidth += width_1;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (text_1_1 && !text_1_1.done && (_a = text_1["return"])) _a.call(text_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var width = totalWidth;
            if (this.fontSetting.size > 10000) {
                width = width * (this.fontSetting.size / 10000);
            }
            return width;
        }
    };
    return TextMeasurer;
}());
exports.TextMeasurer = TextMeasurer;
/*
const layoutSearchTimes: number[] = [];
const layoutSearchTries: number[] = [];
const renderTimes: number[] = [];

function displayLayoutSearchTimeStats() {
    const sum = layoutSearchTimes.reduce((sum, curr) => sum + curr, 0);
    const average = sum / layoutSearchTimes.length;
    const min = Math.min(...layoutSearchTimes);
    const max = Math.max(...layoutSearchTimes);
    console.log("layout search times", "avg:", average.toFixed(1), "min:", min.toFixed(1), "max:", max.toFixed(1));
}

function displayLayoutSearchTriesStats() {
    const sum = layoutSearchTries.reduce((sum, curr) => sum + curr, 0);
    const average = sum / layoutSearchTries.length;
    const min = Math.min(...layoutSearchTries);
    const max = Math.max(...layoutSearchTries);
    console.log("layout search tries", "avg:", average.toFixed(1), "min:", min.toFixed(1), "max:", max.toFixed(1));
}

function displayRenderTimeStats() {
    const sum = renderTimes.reduce((sum, curr) => sum + curr, 0);
    const average = sum / renderTimes.length;
    const min = Math.min(...renderTimes);
    const max = Math.max(...renderTimes);
    console.log("fitBox render times", "avg:", average.toFixed(1), "min:", min.toFixed(1), "max:", max.toFixed(1));
}

setInterval(() => {
    displayLayoutSearchTimeStats();
    displayLayoutSearchTriesStats();
    displayRenderTimeStats();
}, 5000);
*/
/*
Entry point of the fit box algorithm. Given a box to calculate the layout for,
bounding box to fit the box within, a specificed font family and font weight,
and a canvas rendering context (2D), it will first find the best layout for the box
to fit into the provided bounding box, and then it will render the box.
*/
function fitBox(box, bbox, visibleBox, fontFamily, fontWeight, fixedWidth, textMeasurer, lineHeight, ctx) {
    var e_2, _a;
    var lowerFontSize = null;
    var upperFontSize = null;
    var fontSize = 5;
    var bboxMap;
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
    while (true) {
        if (fontSize === 0) {
            throw new Error("Unexpected condition");
        }
        textMeasurer.setFont({
            weight: fontWeight,
            size: fontSize,
            family: fontFamily
        });
        bboxMap = layout(box, { x: bbox.x, y: bbox.y }, fontSize, textMeasurer, lineHeight);
        var myBBox = bboxMap.get(box);
        var allFit = myBBox.height <= bbox.height && myBBox.width <= bbox.width;
        //console.log(`Trying fontSize: ${fontSize}, bbox.width = ${bbox.width}, bbox.height = ${bbox.height}, myBBox.width = ${myBBox.width}, myBBox.height = ${myBBox.height}`);
        if (allFit) {
            //console.log("All fit");
            lowerFontSize = fontSize;
            if (upperFontSize) {
                var newFontSize = Math.floor((upperFontSize + fontSize) / 2);
                if (newFontSize === fontSize) {
                    //console.log("Break out of loop");
                    break;
                }
                fontSize = newFontSize;
            }
            else {
                fontSize *= 2;
            }
        }
        else {
            //console.log("Didn't fit");
            upperFontSize = fontSize;
            if (lowerFontSize) {
                var newFontSize = Math.floor((lowerFontSize + fontSize) / 2);
                if (newFontSize === fontSize) {
                    break;
                }
                fontSize = newFontSize;
            }
            else {
                fontSize = Math.floor(fontSize / 2);
            }
        }
    }
    //console.log("font size:", fontSize);
    ctx.font = fontWeight + " " + fontSize + "px " + fontFamily;
    var resultBBox = bboxMap.get(box);
    // compare resultBBox to bbox
    var xOffset = (bbox.width - resultBBox.width) / 2;
    var yOffset = (bbox.height - resultBBox.height) / 2;
    try {
        for (var _b = __values(bboxMap.keys()), _c = _b.next(); !_c.done; _c = _b.next()) {
            var aBox = _c.value;
            var aBBox = bboxMap.get(aBox);
            aBBox.x += xOffset;
            aBBox.y += yOffset;
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
        }
        finally { if (e_2) throw e_2.error; }
    }
    render(box, bboxMap, visibleBox, fontSize, lineHeight, ctx);
    return bboxMap;
}
exports.fitBox = fitBox;
/*
Given a box, an offset, a font size, and a canvas rendering context. layout calculates
a bounding box for each box (parents and descendents included) as a map that maps a Box
to a BoundingBox.
*/
function layout(box, offset, fontSize, textMeasurer, lineHeight) {
    var e_3, _a, e_4, _b;
    if (box.type === "text") {
        if (typeof box.text !== "string") {
            throw new Error("BLARGH");
        }
        var width = textMeasurer.measureText(box.text);
        //console.log("measureText:", box.text, fontSize, "=", width);
        var height = fontSize * lineHeight;
        var bbox = __assign({}, offset, { width: width, height: height });
        return new Map([[box, bbox]]);
    }
    else if (box.type === "container") {
        if (box.direction === "vertical") {
            var entries = [];
            var yOffset = offset.y;
            var myWidth = 0;
            var myHeight = 0;
            try {
                for (var _c = __values(box.children), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var child = _d.value;
                    var bboxMap = layout(child, { x: offset.x, y: yOffset }, fontSize, textMeasurer, lineHeight);
                    entries.push.apply(entries, __spread(bboxMap));
                    var childBBox = bboxMap.get(child);
                    var previousYOffset = yOffset;
                    yOffset += childBBox.height;
                    if (previousYOffset >= 0 && yOffset < 0) {
                        throw new Error("Number wrapped around: " + previousYOffset + ", " + childBBox.height + ", " + yOffset);
                    }
                    myHeight += childBBox.height;
                    if (childBBox.width > myWidth) {
                        myWidth = childBBox.width;
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c["return"])) _a.call(_c);
                }
                finally { if (e_3) throw e_3.error; }
            }
            var containerBBox = __assign({}, offset, { height: myHeight, width: myWidth });
            entries.push([box, containerBBox]);
            return new Map(entries);
        }
        else if (box.direction === "horizontal") {
            var entries = [];
            var xOffset = offset.x;
            var myWidth = 0;
            var myHeight = 0;
            try {
                for (var _e = __values(box.children), _f = _e.next(); !_f.done; _f = _e.next()) {
                    var child = _f.value;
                    var bboxMap = layout(child, { x: xOffset, y: offset.y }, fontSize, textMeasurer, lineHeight);
                    entries.push.apply(entries, __spread(bboxMap));
                    var childBBox = bboxMap.get(child);
                    var previousXOffset = xOffset;
                    xOffset += childBBox.width;
                    if (previousXOffset >= 0 && xOffset < 0) {
                        throw new Error("Number wrapped around: " + previousXOffset + ", " + childBBox.width + ", " + xOffset);
                    }
                    myWidth += childBBox.width;
                    if (childBBox.height > myHeight) {
                        myHeight = childBBox.height;
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_f && !_f.done && (_b = _e["return"])) _b.call(_e);
                }
                finally { if (e_4) throw e_4.error; }
            }
            var containerBBox = __assign({}, offset, { height: myHeight, width: myWidth });
            entries.push([box, containerBBox]);
            return new Map(entries);
        }
        else {
            throw new Error("Not implemented");
        }
    }
    else {
        throw new Error("Not implemented");
    }
}
exports.layout = layout;
/*
Given a box and a mapping between box and bounding box (you can get
from layout, and a canvas rendering context, renders the box.

Pre-condition: You set the font property on the canvas context.
*/
function render(box, bBoxMap, visibleBox, fontSize, lineHeight, ctx) {
    var e_5, _a;
    var mybbox = bBoxMap.get(box);
    if (mybbox.x + mybbox.width < visibleBox.x ||
        mybbox.y + mybbox.height < visibleBox.y ||
        mybbox.x > visibleBox.width ||
        mybbox.y > visibleBox.height) {
        return;
    }
    if (box.type === "text") {
        ctx.save();
        if (box.color) {
            ctx.fillStyle = box.color;
        }
        var yOffset = fontSize * ((lineHeight - 1) / 2);
        if (box.border) {
            var width = box.border.width || 1;
            var color = box.border.color || "black";
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.strokeRect(mybbox.x, mybbox.y, mybbox.width, mybbox.height);
        }
        ctx.fillText(box.text, mybbox.x, mybbox.y + yOffset);
        ctx.restore();
    }
    else if (box.type === "container") {
        try {
            for (var _b = __values(box.children), _c = _b.next(); !_c.done; _c = _b.next()) {
                var child = _c.value;
                render(child, bBoxMap, visibleBox, fontSize, lineHeight, ctx);
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_5) throw e_5.error; }
        }
    }
    else {
        throw new Error("Not implemented");
    }
}
exports.render = render;
/*
Given a bounding box, and the canvas rendering context, draw its outline.
*/
function strokeBBox(bbox, ctx) {
    ctx.strokeRect(bbox.x, bbox.y, bbox.width, bbox.height);
}
exports.strokeBBox = strokeBBox;


/***/ }),

/***/ "./src/zoom-debugger/index.ts":
/*!************************************!*\
  !*** ./src/zoom-debugger/index.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
var __spread = (this && this.__spread) || function () {
    for (var ar = [], i = 0; i < arguments.length; i++) ar = ar.concat(__read(arguments[i]));
    return ar;
};
exports.__esModule = true;
var parser_1 = __webpack_require__(/*! ../parser */ "./src/parser.js");
var fit_box_1 = __webpack_require__(/*! ./fit-box */ "./src/zoom-debugger/fit-box.ts");
var code_scope_renderer_1 = __webpack_require__(/*! ./code-scope-renderer */ "./src/zoom-debugger/code-scope-renderer.ts");
function initZoomDebugger(element, code, history) {
    var canvasWidth = element.offsetWidth * 2;
    var canvasHeight = element.offsetHeight * 2;
    if (canvasWidth === 0 || canvasHeight === 0) {
        throw new Error("Container element has 0 dimension.");
    }
    var dragging = false;
    var dragStartX;
    var dragStartY;
    var ast = parser_1.parse(code);
    var canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    canvas.style.border = "1px solid black";
    canvas.style.transform = "scale(0.5) translate(-" + canvas.width / 2 + "px, -" + canvas.height / 2 + "px)";
    var viewport = {
        top: -canvas.height / 2,
        left: -canvas.width / 2,
        zoom: 0.5
    };
    var ctx = canvas.getContext("2d");
    element.appendChild(canvas);
    ctx.textBaseline = "top";
    var textMeasurer = new fit_box_1.TextMeasurer(ctx, true);
    var mainScope = {
        bbox: {
            y: 0,
            x: 0,
            width: canvas.width,
            height: canvas.height
        },
        renderable: new code_scope_renderer_1.CodeScopeRenderer(history, "main()", ast, code, textMeasurer)
    };
    var currentScopeChain = [mainScope];
    // Scope chain looks like [inner most, middle scope, outer most]
    requestRender();
    element.addEventListener("mousedown", function (e) {
        var _a;
        dragging = true;
        _a = __read(pointScreenToCanvas(e), 2), dragStartX = _a[0], dragStartY = _a[1];
    });
    element.addEventListener("mouseup", function () {
        dragging = false;
    });
    element.addEventListener("mousemove", function (e) {
        if (dragging) {
            var _a = __read(pointScreenToCanvas(e), 2), pointerX = _a[0], pointerY = _a[1];
            var _b = __read(pointCanvasToWorld(pointerX, pointerY), 2), worldPointerX = _b[0], worldPointerY = _b[1];
            var _c = __read(pointCanvasToWorld(dragStartX, dragStartY), 2), worldDragStartX = _c[0], worldDragStartY = _c[1];
            viewport.left -= worldPointerX - worldDragStartX;
            viewport.top -= worldPointerY - worldDragStartY;
            dragStartX = pointerX;
            dragStartY = pointerY;
            requestRender();
        }
    });
    element.addEventListener("wheel", function (e) {
        e.preventDefault();
        var delta = e.deltaY;
        var _a = __read(pointScreenToCanvas(e), 2), pointerX = _a[0], pointerY = _a[1];
        var newZoom = Math.max(0.5, viewport.zoom * (1 - delta * 0.01));
        var _b = __read(pointCanvasToWorld(pointerX, pointerY), 2), worldPointerX = _b[0], worldPointerY = _b[1];
        var newLeft = -(pointerX / newZoom - worldPointerX);
        var newTop = -(pointerY / newZoom - worldPointerY);
        var newViewport = {
            top: newTop,
            left: newLeft,
            zoom: newZoom
        };
        viewport = newViewport;
        requestRender();
    }, { passive: false });
    function requestRender() {
        requestAnimationFrame(render);
    }
    function entirelyContainsViewport(bbox) {
        return bbox.x <= 0 && bbox.y <= 0 &&
            (bbox.x + bbox.width > canvasWidth) &&
            (bbox.y + bbox.height > canvasHeight);
    }
    function renderZoomRenderable(renderable, bbox, ancestry) {
        var e_1, _a;
        var viewportBBox = { x: 0, y: 0, width: canvas.width, height: canvas.height };
        var childRenderables = renderable.render(ctx, bbox, viewportBBox);
        var childEnclosingRenderable = null;
        var myScope = {
            bbox: boxCanvasToWorld(bbox),
            renderable: renderable
        };
        try {
            for (var _b = __values(childRenderables.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
                var _d = __read(_c.value, 2), childBBox = _d[0], renderable_1 = _d[1];
                var result = renderZoomRenderable(renderable_1, childBBox, __spread([myScope], ancestry));
                if (result) {
                    childEnclosingRenderable = result;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b["return"])) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (childEnclosingRenderable) {
            return childEnclosingRenderable;
        }
        else {
            if (entirelyContainsViewport(bbox)) {
                return __spread([myScope], ancestry);
            }
            else {
                return null;
            }
        }
    }
    function render() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        var currentScope = currentScopeChain[0];
        var bBox = boxWorldToCanvas(currentScope.bbox);
        var enclosingScopeChain = renderZoomRenderable(currentScope.renderable, bBox, currentScopeChain.slice(1));
        if (enclosingScopeChain) {
            currentScopeChain = enclosingScopeChain;
        }
        else {
            if (currentScopeChain.length > 1) {
                currentScopeChain = currentScopeChain.slice(1);
            }
            else {
                currentScopeChain = [mainScope];
            }
        }
    }
    function pointScreenToCanvas(e) {
        return [
            e.offsetX,
            e.offsetY
        ];
    }
    function pointCanvasToWorld(x, y) {
        return [
            x / viewport.zoom + viewport.left,
            y / viewport.zoom + viewport.top
        ];
    }
    function boxWorldToCanvas(box) {
        return {
            y: (box.y - viewport.top) * viewport.zoom,
            x: (box.x - viewport.left) * viewport.zoom,
            width: box.width * viewport.zoom,
            height: box.height * viewport.zoom
        };
    }
    function boxCanvasToWorld(box) {
        return {
            y: (box.y / viewport.zoom) + viewport.top,
            x: (box.x / viewport.zoom) + viewport.left,
            width: box.width / viewport.zoom,
            height: box.height / viewport.zoom
        };
    }
}
exports.initZoomDebugger = initZoomDebugger;


/***/ })

/******/ });
});
//# sourceMappingURL=zoom-debugger.js.map