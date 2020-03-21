(function (window) {

    var STATE = {
        NULL: 0,
        LOADING: 1,
        LOADED: 3,
        DONE: 4,
        FAIL: 5
    };

    var _ = {};

    var modules = {};

    var config = {
        baseUrl: '/',
    };

    _.isObject = function (o) {
        return typeof o === 'object';
    }

    _.isFunction = function (o) {
        return typeof o === 'function'
    };

    _.isString = function (o) {
        return typeof o === 'string';
    };

    _.isArray = function (o) {
        return this.isObject(o) && o instanceof Array ? true : false;
    };

    _.forEach = function (o, fn) {
        if (this.isFunction(fn)) {
            for (var key in o) {
                fn(o[key], key, o);
            };
        }
        else {
            throw Error('the first argument must be iteratble.')
        }
    };

    _.map = function (arr, fn) {
        if (this.isArray(arr) && this.isFunction(fn)) {
            var res = [];
            for (var key in arr) {
                res.push(fn(arr[key], key, arr));
            }
            return res;
        }
        else {
            throw Error('arr must be an array & fn must be a function.')
        }
    };

    _.every = function (arr, fn) {
        if (this.isArray(arr) && this.isFunction(fn)) {
            var res = true;
            for (var key in arr) {
                res = res && !!fn(arr[key], key, arr);
                if (!res) {
                    return false
                }
            }
            return true;
        }
        else {
            throw Error('arr must be an array & fn must be a function.')
        }
    };

    _.filter = function (arr, fn) {
        if (this.isArray(arr) && this.isFunction(fn)) {
            var res = [];
            for (var key in arr) {
                if (fn(arr[key], key, arr)) {
                    res.push(arr[key])
                }
            }
            return res;
        }
        else {
            throw Error('arr must be an array & fn must be a function.')
        }
    };

    _.genRandomID = function () {
        return Math.random().toString(32).slice(2);
    };

    _.isEmptyArray = function (deps) {
        return this.isArray(deps) && deps.length === 0
    }

    function loadModule(moduleName) {
        var url = window.location.href + config.baseUrl + '/' + moduleName + '.js';
        loadJS(url);
    };

    function loadJS(url, cb) {
        var node = document.createElement('script');
        node.async = true;
        node.type = 'text/javascript';
        node.onload = function () {
            if (_.isFunction(cb)) {
                cb();
            }
        };
        node.error = function () {
            throw Error('load script:' + url + 'fail');
        };
        node.src = url;
        var head = document.getElementsByTagName('head')[0];
        head.appendChild(node);
    };

    function Module(name = '', deps = [], state = STATE.NULL, context = null, content = null, deptas = []) {
        this.name = name;
        this.deps = deps;
        this.state = state;
        this.context = context;
        this.content = content;
        this.deptas = deptas;
    };

    Module.prototype.sub = function (deptaName) {
        if(modules[deptaName].deptas.indexOf(this.name) === -1){
            modules[deptaName].deptas.push(this.name);
        }
    };

    Module.prototype.notify = function () {
        _.forEach(this.deptas, function (name) {
            modules[name].require();
        });
    };

    Module.prototype.checkDeps = function () {
        return _.isEmptyArray(this.deps) ?
            true
            :
            _.every(this.deps, function (depName) {
                return depName in modules && modules[depName].state === STATE.DONE;
            });
    };

    Module.prototype.require = function () {
        if (!this.content && this.checkDeps()) {
            this.content = this.context.apply(this, _.map(this.deps, function (depName) {
                return modules[depName].content;
            }));
            this.state = STATE.DONE;
            this.notify();
        }
        else {
            var self = this;
            _.forEach(this.deps, function (depName) {
                let depModule = modules[depName];
                if (depModule) {
                    switch (depModule.state) {
                        case STATE.LOADING:
                            self.sub(depName);
                            break;
                        case STATE.LOADED:
                            self.sub(depName);
                            depModule.require();
                            break;
                        case STATE.NULL:
                            depModule.state = LOADING;
                            self.sub(depName);
                            loadModule(depName);
                            break;
                        default:
                            break;
                    }
                }
                else {
                    modules[depName] = new Module(depName, [], STATE.LOADING, null, null);
                    self.sub(depName);
                    loadModule(depName);
                }
            });
        }
    };

    var define = function (moduleName, deps, callback) {
        var mod = modules[moduleName];
        if(mod){
            mod.deps = deps;
            mod.context = callback;
            mod.require();
        }
        else{
            modules[moduleName] = new Module(moduleName,deps,STATE.LOADED,callback,null);
        }
    };

    Module.prototype.require.config = function (o) {
        if (_.isObject(o)) {
            if (o.baseUrl) {
                config = o;
            }
            else {
                throw Error('config must have baseUrl property.')
            }
        }
        else {
            throw Error('config must be an object.')
        }
    }

    window.require = function (deps, callback) {
        var task = new Module(_.genRandomID(), deps, STATE.LOADED, callback, null);
        modules[task.name] = task;
        task.require();
    }
    window.define = define;
}(window||{}))