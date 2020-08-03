var Jsonr = (function (exports) {
    'use strict';

    var stringify_2 = stringify;

    function stringify(value, indent) {
        const tally = new Map();
        tallyRefCounts(value, tally);
        const refIds = new Map();
        assignRefIds(tally, refIds);
        const visited = new Set();
        return _stringify(value, refIds, visited, indent, 0);
    }

    var assignRefIds_1 = assignRefIds;
    function assignRefIds(tally, refsMap) {
        let nextId = 1;
        for (let [value, count] of tally) {
            if (count > 1) {
                refsMap.set(value, nextId);
                nextId++;
            }
        }
    }

    var tallyRefCounts_1 = tallyRefCounts;
    function tallyRefCounts(value, tally) {
        if (Array.isArray(value)) {
            const count = tally.get(value) || 0;
            tally.set(value, count + 1);
            if (count === 0) {
                for (let i = 0; i < value.length; i++) {
                    tallyRefCounts(value[i], tally);
                }
            }
        } else if (isObject(value)) {
            const count = tally.get(value) || 0;
            tally.set(value, count + 1);
            if (count === 0) {
                for (let key in value) {
                    tallyRefCounts(value[key], tally);
                }
            }
        }
    }

    function isObject(value) {
        return (typeof value === "object") && (value !== null);
    }

    function _stringify(value, refIds, visited, indent, level) {
        const baseIndent = Array(level + 1).join(indent);
        if (Array.isArray(value)) {
            if (visited.has(value)) {
                return "*" + refIds.get(value);
            }
            visited.add(value);
            const refId = refIds.get(value);
            let arrayString = "";
            if (refId) {
                arrayString += "&" + refId + " ";
            }
            arrayString += "[";
            for (let i = 0; i < value.length; i++) {
                if (indent) {
                    arrayString += "\n" + baseIndent + indent;
                }
                arrayString += _stringify(value[i], refIds, visited, indent, level + 1);
                if (i < value.length - 1) {
                    arrayString += ",";
                }
            }
            if (indent) {
                arrayString += "\n" + baseIndent;
            }
            arrayString += "]";
            return arrayString;
        } else if (isObject(value)) {
            if (visited.has(value)) {
                return "*" + refIds.get(value);
            }
            visited.add(value);
            const refId = refIds.get(value);
            let objectString = "";
            if (refId) {
                objectString += "&" + refId + " ";
            }
            objectString += "{";
            let keys = Object.keys(value);
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                if (indent) {
                    objectString += "\n" + baseIndent + indent;
                }
                objectString += quote(key) + ": " + _stringify(value[key], refIds, visited, indent, level + 1);
                if (i < keys.length - 1) {
                    objectString += ",";
                }
            }
            if (indent) {
                objectString += "\n" + baseIndent;
            }
            objectString += "}";
            return objectString;
        } else if (typeof value === "string") {
            return quote(value);
        } else {
            return String(value);
        }
    }

    function quote(str) {
        return '"' + str.replace(/\"/g, "\\\"") + '"';
    }

    var stringify_1 = {
    	stringify: stringify_2,
    	assignRefIds: assignRefIds_1,
    	tallyRefCounts: tallyRefCounts_1
    };

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    	  path: basedir,
    	  exports: {},
    	  require: function (path, base) {
          return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
        }
    	}, fn(module, module.exports), module.exports;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var nearley = createCommonjsModule(function (module) {
    (function(root, factory) {
        if ( module.exports) {
            module.exports = factory();
        } else {
            root.nearley = factory();
        }
    }(commonjsGlobal, function() {

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
        };


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
        };

        Column.prototype.predict = function(exp) {
            var rules = this.grammar.byName[exp] || [];

            for (var i = 0; i < rules.length; i++) {
                var r = rules[i];
                var wantedBy = this.wants[exp];
                var s = new State(r, 0, this.index, wantedBy);
                this.states.push(s);
            }
        };

        Column.prototype.complete = function(left, right) {
            var copy = left.nextState(right);
            this.states.push(copy);
        };


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
        };


        function StreamLexer() {
          this.reset("");
        }

        StreamLexer.prototype.reset = function(data, state) {
            this.buffer = data;
            this.index = 0;
            this.line = state ? state.line : 1;
            this.lastLineBreak = state ? -state.col : 0;
        };

        StreamLexer.prototype.next = function() {
            if (this.index < this.buffer.length) {
                var ch = this.buffer[this.index++];
                if (ch === '\n') {
                  this.line += 1;
                  this.lastLineBreak = this.index;
                }
                return {value: ch};
            }
        };

        StreamLexer.prototype.save = function() {
          return {
            line: this.line,
            col: this.index - this.lastLineBreak,
          }
        };

        StreamLexer.prototype.formatError = function(token, message) {
            // nb. this gets called after consuming the offending token,
            // so the culprit is index-1
            var buffer = this.buffer;
            if (typeof buffer === 'string') {
                var nextLineBreak = buffer.indexOf('\n', this.index);
                if (nextLineBreak === -1) nextLineBreak = buffer.length;
                var line = buffer.substring(this.lastLineBreak, nextLineBreak);
                var col = this.index - this.lastLineBreak;
                message += " at line " + this.line + " col " + col + ":\n\n";
                message += "  " + line + "\n";
                message += "  " + Array(col).join(" ") + "^";
                return message;
            } else {
                return message + " at index " + (this.index - 1);
            }
        };


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
                  column.lexerState = lexer.save();
                }

                this.current++;
            }
            if (column) {
              this.lexerState = lexer.save();
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
                    return this.buildFirstStateStack(state, []);
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
        Builds a the first state stack. You can think of a state stack as the call stack
        of the recursive-descent parser which the Nearley parse algorithm simulates.
        A state stack is represented as an array of state objects. Within a
        state stack, the first item of the array will be the starting
        state, with each successive item in the array going further back into history.

        This function needs to be given a starting state and an empty array representing
        the visited states, and it returns an single state stack.

        */
        Parser.prototype.buildFirstStateStack = function(state, visited) {
            if (visited.indexOf(state) !== -1) {
                // Found cycle, return null
                // to eliminate this path from the results, because
                // we don't know how to display it meaningfully
                return null;
            }
            if (state.wantedBy.length === 0) {
                return [state];
            }
            var prevState = state.wantedBy[0];
            var childVisited = [state].concat(visited);
            var childResult = this.buildFirstStateStack(prevState, childVisited);
            if (childResult === null) {
                return null;
            }
            return [state].concat(childResult);
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
            var column = this.table[this.table.length - 1];
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
    });

    var Ref_1 = Ref;
    function Ref(id) {
        this.id = id;
    }

    var resolveRefs_1 = resolveRefs;
    function resolveRefs(value, refDict, visited) {
        if (value instanceof Ref) {
            value = refDict[value.id];
        }

        if (visited.has(value)) {
            return value;
        }

        visited.add(value);

        if (Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                value[i] = resolveRefs(value[i], refDict, visited);
            }
        } else if (typeof value === "object") {
            for (let key in value) {
                value[key] = resolveRefs(value[key], refDict, visited);
            }
        }
        return value;
    }

    var refs = {
    	Ref: Ref_1,
    	resolveRefs: resolveRefs_1
    };

    var jsonrGrammar = createCommonjsModule(function (module) {
    // Generated automatically by nearley, version 2.19.1
    // http://github.com/Hardmath123/nearley
    (function () {
    function id(x) { return x[0]; }

    const { Ref, resolveRefs } = refs;
    const refDict = {};
    var grammar = {
        Lexer: undefined,
        ParserRules: [
        {"name": "jsonr", "symbols": ["element"], "postprocess": 
            data => {
                return resolveRefs(data[0], refDict, new Set())
            }
                },
        {"name": "value", "symbols": ["object"], "postprocess": id},
        {"name": "value", "symbols": ["array"], "postprocess": id},
        {"name": "value", "symbols": ["string"], "postprocess": id},
        {"name": "value", "symbols": ["number"], "postprocess": id},
        {"name": "value$string$1", "symbols": [{"literal":"t"}, {"literal":"r"}, {"literal":"u"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
        {"name": "value", "symbols": ["value$string$1"], "postprocess": () => true},
        {"name": "value$string$2", "symbols": [{"literal":"f"}, {"literal":"a"}, {"literal":"l"}, {"literal":"s"}, {"literal":"e"}], "postprocess": function joiner(d) {return d.join('');}},
        {"name": "value", "symbols": ["value$string$2"], "postprocess": () => false},
        {"name": "value$string$3", "symbols": [{"literal":"n"}, {"literal":"u"}, {"literal":"l"}, {"literal":"l"}], "postprocess": function joiner(d) {return d.join('');}},
        {"name": "value", "symbols": ["value$string$3"], "postprocess": () => null},
        {"name": "value", "symbols": ["ref"], "postprocess": id},
        {"name": "value", "symbols": ["ref_object_definition"], "postprocess": id},
        {"name": "value", "symbols": ["ref_array_definition"], "postprocess": id},
        {"name": "ref_object_definition", "symbols": ["ref_definition", "ws", "object"], "postprocess": 
            data => {
                return refDict[data[0]] = data[2]
            }
                    },
        {"name": "ref_array_definition", "symbols": ["ref_definition", "ws", "array"], "postprocess": 
            data => {
                return refDict[data[0]] = data[2]
            }
                    },
        {"name": "ref", "symbols": [{"literal":"*"}, "digits"], "postprocess": 
            data => new Ref(data[1])
                },
        {"name": "ref_definition", "symbols": [{"literal":"&"}, "digits"], "postprocess": 
            data => data[1]
                },
        {"name": "object", "symbols": [{"literal":"{"}, "ws", {"literal":"}"}], "postprocess": 
            data => ({})
                    },
        {"name": "object", "symbols": [{"literal":"{"}, "members", {"literal":"}"}], "postprocess": 
            data => data[1]
                    },
        {"name": "members", "symbols": ["member"], "postprocess": id},
        {"name": "members", "symbols": ["members", {"literal":","}, "member"], "postprocess": 
            data => {
                return {
                    ...data[0],
                    ...data[2]
                }
            }
                    },
        {"name": "member", "symbols": ["ws", "string", "ws", {"literal":":"}, "element"], "postprocess": 
            data => {
                return {
                    [data[1]]: data[4]
                }
            }
                    },
        {"name": "array", "symbols": [{"literal":"["}, "ws", {"literal":"]"}], "postprocess": 
            () => []
                    },
        {"name": "array", "symbols": [{"literal":"["}, "elements", {"literal":"]"}], "postprocess": 
            data => data[1]
                    },
        {"name": "elements", "symbols": ["element"], "postprocess": data => [data[0]]},
        {"name": "elements", "symbols": ["elements", {"literal":","}, "element"], "postprocess": 
            data => {
                return [...data[0], data[2]]
            }
                    },
        {"name": "element", "symbols": ["ws", "value", "ws"], "postprocess": data => data[1]},
        {"name": "string", "symbols": [{"literal":"\""}, "characters", {"literal":"\""}], "postprocess": data => data[1]},
        {"name": "characters", "symbols": [], "postprocess": () => ""},
        {"name": "characters", "symbols": ["characters", "character"], "postprocess": data => data[0] + data[1]},
        {"name": "character", "symbols": [/[^\\\"]/], "postprocess": id},
        {"name": "character", "symbols": [{"literal":"\\"}, "escape"], "postprocess": data => data[1]},
        {"name": "escape", "symbols": [{"literal":"\""}], "postprocess": () => '"'},
        {"name": "escape", "symbols": [{"literal":"\\"}], "postprocess": () => "\\"},
        {"name": "escape", "symbols": [{"literal":"/"}], "postprocess": () => "/"},
        {"name": "escape", "symbols": [{"literal":"b"}], "postprocess": () => "\b"},
        {"name": "escape", "symbols": [{"literal":"f"}], "postprocess": () => "\f"},
        {"name": "escape", "symbols": [{"literal":"n"}], "postprocess": () => "\n"},
        {"name": "escape", "symbols": [{"literal":"r"}], "postprocess": () => "\r"},
        {"name": "escape", "symbols": [{"literal":"t"}], "postprocess": () => "\t"},
        {"name": "escape", "symbols": [{"literal":"u"}, "hex", "hex", "hex", "hex"], "postprocess": 
            data =>
                String
                .fromCharCode(
                    ((((data[1] * 16) + data[2]) * 16) + data[3]) * 16 + data[4])
                    },
        {"name": "hex", "symbols": ["digit"], "postprocess": id},
        {"name": "hex", "symbols": [/[Aa]/], "postprocess": () => 10},
        {"name": "hex", "symbols": [/[Bb]/], "postprocess": () => 11},
        {"name": "hex", "symbols": [/[Cc]/], "postprocess": () => 12},
        {"name": "hex", "symbols": [/[Dd]/], "postprocess": () => 13},
        {"name": "hex", "symbols": [/[Ee]/], "postprocess": () => 14},
        {"name": "hex", "symbols": [/[Ff]/], "postprocess": () => 15},
        {"name": "number", "symbols": ["integer", "fraction", "exponent"], "postprocess": 
            data => {
                const numberString = data[0] + data[1] + data[2];
                return Number(numberString)
            }
                    },
        {"name": "integer", "symbols": ["digit"], "postprocess": id},
        {"name": "integer", "symbols": ["onenine", "digits"], "postprocess": 
            data => data[0] + data[1]
                    },
        {"name": "integer", "symbols": [{"literal":"-"}, "digit"], "postprocess": 
            data => "-" + data[1]
                    },
        {"name": "integer", "symbols": [{"literal":"-"}, "onenine", "digits"], "postprocess": 
            data => "-" + data[1] + data[2]
                    },
        {"name": "digits", "symbols": ["digit"], "postprocess": id},
        {"name": "digits", "symbols": ["digits", "digit"], "postprocess": data => data[0] + data[1]},
        {"name": "digit", "symbols": [{"literal":"0"}], "postprocess": id},
        {"name": "digit", "symbols": ["onenine"], "postprocess": id},
        {"name": "onenine", "symbols": [/[1-9]/], "postprocess": id},
        {"name": "fraction", "symbols": [], "postprocess": () => ""},
        {"name": "fraction", "symbols": [{"literal":"."}, "digits"], "postprocess": data => "." + data[1]},
        {"name": "exponent", "symbols": [], "postprocess": () => ""},
        {"name": "exponent", "symbols": [/[Ee]/, "sign", "digits"], "postprocess": 
            data => "e" + data[1] + data[2]
                    },
        {"name": "sign", "symbols": []},
        {"name": "sign", "symbols": [{"literal":"+"}]},
        {"name": "sign", "symbols": [{"literal":"-"}]},
        {"name": "ws", "symbols": []},
        {"name": "ws", "symbols": [{"literal":" "}, "ws"]},
        {"name": "ws", "symbols": [{"literal":"\n"}, "ws"]},
        {"name": "ws", "symbols": [{"literal":"\r"}, "ws"]},
        {"name": "ws", "symbols": [{"literal":"\t"}, "ws"]}
    ]
      , ParserStart: "jsonr"
    };
    {
       module.exports = grammar;
    }
    })();
    });

    var parse_2 = parse;
    function parse(jsonr) {
        const parser = new nearley.Parser(nearley.Grammar.fromCompiled(jsonrGrammar));
        parser.feed(jsonr);
        if (parser.results.length > 1) {
            const error = new Error("Parse tree is ambigous! See error.parser.results for more details.");
            error.parser = parser;
            throw error;
        }
        return parser.results[0];
    }

    var parse_1 = {
    	parse: parse_2
    };

    const { stringify: stringify$1 } = stringify_1;
    const { parse: parse$1 } = parse_1;

    var stringify_1$1 = stringify$1;
    var parse_1$1 = parse$1;

    var jsonr = {
    	stringify: stringify_1$1,
    	parse: parse_1$1
    };

    exports.default = jsonr;
    exports.parse = parse_1$1;
    exports.stringify = stringify_1$1;

    return exports;

}({}));
