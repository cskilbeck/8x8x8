// Don't obfuscate this file! We depend on the toString() of functions!
// this was all nicked from https://github.com/CodeCosmos/codecosmos/blob/master/www/js/sandbox.js

(function(mainApp) {

    'use strict';
    var esprima = window.esprima,
        estraverse = window.estraverse,
        escodegen = window.escodegen,
        errors = [],
        eng,
        Syntax = estraverse.Syntax;

    // This implements the jankiest possible "source map", where we keep an array
    // of [generatedLine, knownSourceLine]. Seems to essentially work.
    function SourceNode(line, col, _sourceMap, generated) {
        this.line = line;
        this.col = col;
        this.generated = generated;
    }

    SourceNode.prototype.toStringWithSourceMap = function toStringWithSourceMap() {
        var code = [];
        var mapLines = {};
        var map = [];
        // assumes that wrapCode adds two lines
        var line = 3;
        var lastMapLine = null;

        function walk(node) {
            if (typeof(node) === "string") {
                if (node) {
                    code.push(node);
                    var matches = node.match(/\n/g);
                    if (matches !== null) {
                        line += matches.length;
                    }
                }
            } else if (node instanceof SourceNode) {
                if (node.line !== null) {
                    if (!mapLines[line]) {
                        map.push([line, node.line]);
                        mapLines[line] = node.line;
                    }
                }
                walk(node.generated);
            } else {
                node.forEach(walk);
            }
        }
        walk(this);
        return {
            code: code.join(''),
            map: map
        };
    };

    SourceNode.prototype.toString = function toString() {
        return this.toStringWithSourceMap().code;
    };

    // This is used by escodegen
    window.sourceMap = {
        SourceNode: SourceNode
    };

    // TODO (chs): add in all the things that need to be masked
    function runWrapper($userCode, __sys) {
        var clear = __sys.clear,
            setpixel = __sys.setpixel,
            getpixel = __sys.getpixel,
            getpixeli = __sys.getpixeli,
            keypress = __sys.keypress,
            keyrelease = __sys.keyrelease,
            keyheld = __sys.keyheld,
            reset = __sys.reset;
        __sys.userFunction = __sys.catchErrors($userCode);
    }

    function extractCode(fn) {
        var code = fn.toString();
        return code.substring(code.indexOf('{') + 1, code.lastIndexOf('}'));
    }

    function makeOneLine(code) {
        return code.replace(/(\/\/[^\n]+|\n\s|\r\n\s*)/g, '');
    }

    var runTemplate = makeOneLine(extractCode(runWrapper));

    function wrapCode(code, template, functionName, postCode) {
        // avoid interpretation of the replacement string by using a fun.
        // otherwise mo' $ mo problems.
        // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace#Specifying_a_string_as_a_parameter
        return ("'use strict';" + template.replace(/\$userCode/, function() {
            return 'function ' + functionName + '() {\n' + code + postCode + '\n}';
        }));
    }

    var injectStatement = esprima.parse("if (++__sys.ctr >= __sys.maxctr) { __sys.cont = false; throw new Error('Script ran for too long'); }").body[0];

    function CallExpression(callee, args) {
        this.callee = callee;
        this.arguments = args;
    }
    CallExpression.prototype.type = Syntax.CallExpression;

    function Identifier(name) {
        this.name = name;
    }
    Identifier.prototype.type = Syntax.Identifier;

    function BlockStatement(body) {
        this.body = body;
    }
    BlockStatement.prototype.type = Syntax.BlockStatement;

    function ReturnStatement(argument) {
        this.argument = argument;
    }
    ReturnStatement.prototype.type = Syntax.ReturnStatement;

    function FunctionExpression(id, params, body) {
        this.id = id;
        this.params = params;
        this.body = body;
        this.defaults = [];
        this.expression = false;
        this.generator = false;
        this.rest = null;
    }
    FunctionExpression.prototype.type = Syntax.FunctionExpression;

    function wrapId(node, defaultName) {
        if (node.loc) {
            var id = (node.id || {
                name: null,
                loc: null
            });
            var loc = id.loc || node.loc;
            var name = id.name || defaultName;
            return new Identifier(name + '$' + loc.start.line);
        } else {
            return node.id;
        }
    }

    function instrumentAST(ast) {
        var identifierStack = [];

        function pushIdentifier(s) {
            identifierStack[identifierStack.length - 1].push(s);
        }

        function popIdentifierStack() {
            identifierStack.pop();
        }

        function pushIdentifierStack() {
            identifierStack.push([]);
        }

        function peekLastIdentifier() {
            var lastStackIdx = identifierStack.length - 1;
            if (lastStackIdx >= 0) {
                var stack = identifierStack[lastStackIdx];
                if (stack.length) {
                    return stack[stack.length - 1];
                }
            }
            return '';
        }
        pushIdentifierStack();
        return estraverse.replace(ast, {
            enter: function enterAST(node) {
                switch (node.type) {
                    case Syntax.VariableDeclarator:
                        if (node.id.type === Syntax.Identifier) {
                            pushIdentifier(node.id.name);
                        }
                        break;
                    case Syntax.MemberExpression:
                        if (node.object.type === Syntax.Identifier) {
                            var id = node.object.name;
                            if (node.property.type === Syntax.Identifier) {
                                id += '__dot__' + node.property.name;       // huh? why mangle these?
                                // console.log(id);
                            }
                            pushIdentifier(id);
                        } else if (node.property.type === Syntax.Identifier) {
                            pushIdentifier(node.property.name);
                        }
                        break;
                    case Syntax.FunctionDeclaration:
                        pushIdentifierStack();
                        break;
                    case Syntax.FunctionExpression:
                        pushIdentifierStack();
                        break;
                    default:
                        break;
                }
                return node;
            },
            leave: function leaveAST(node) {
                switch (node.type) {
                    case Syntax.DoWhileStatement:
                        break;
                    case Syntax.ForStatement:
                        break;
                    case Syntax.FunctionDeclaration:
                        break;
                    case Syntax.FunctionExpression:
                        break;
                    case Syntax.WhileStatement:
                        break;
                    default:
                        return estraverse.SKIP;
                }
                // modify the BlockStatement in-place to inject the instruction counter

                if(node.body.body === undefined) {
                    // they have used a non-block statement as the body of a function or loop construct
                    // i.e. they haven't used { and }
                    // return an error!
                    errors.push({
                        message: "Missing {",
                        line: node.loc.start.line,
                        column: node.loc.start.column
                    });
                    // push an error onto the list
                    return estraverse.SKIP;
                }

                node.body.body.unshift(injectStatement);
                if (node.type === Syntax.FunctionExpression) {
                    popIdentifierStack();
                    // __catchErrors(node)
                    node.id = wrapId(node, peekLastIdentifier());
                    return new CallExpression(
                        new Identifier("__catchErrors"), [node]);
                }
                if (node.type === Syntax.FunctionDeclaration) {
                    popIdentifierStack();
                    // modify the BlockStatement in-place to be
                    // return __catchErrors(function id() { body });
                    var funBody = node.body;
                    node.body = new BlockStatement([
                        new ReturnStatement(
                            new CallExpression(
                                new CallExpression(
                                    new Identifier("__sys.catchErrors"), [new FunctionExpression(
                                        wrapId(node, peekLastIdentifier()), [],
                                        funBody)]), []))
                    ]);
                }
                return node;
            }
        });
    }

    // mainApp.sandbox('var a = 1; function update(frame) { clear(0); }').code

    // give it the source code as a string
    mainApp.sandbox = function(code) {
        var rc = {};
        this.errors = [];
        try {
            this.ast = instrumentAST(esprima.parse(code, { range: true, loc: true }));
            this.map = escodegen.generate(this.ast, { sourceMap: true, sourceMapWithCode: true });
            this.code = wrapCode(this.map.code, runTemplate, '', ';\n__sys.updateFunction = (typeof update === "function") ? update : null;');
        }
        catch(e) {
            console.log("ERROR:", e);
            this.errors.push({
                message: e.description,
                line: e.lineNumber,
                column: e.column 
            });
        }
        if(this.code) {
            this.code = "eng.clientFunction = function(__sys) {" + this.code + "};";
        }
    };

    mainApp.sandbox.searchMap = function(needle) {
        // binary search
        var lo = 0;
        var hi = this.map.length;
        var mid, here;
        while (true) {
            mid = lo + ((hi - lo) >> 1);
            here = this.map[mid];
            if (mid === lo || here[0] === needle) {
                return here[1];
            } else if (here[0] > needle) {
                hi = mid;
            } else {
                lo = mid;
            }
        }
    };

})(mainApp);
