var require = function (window) {

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
        baseUrl: '/js',
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
                res.push(fn(arr[key], key, obj));
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

    _.pathJoin = function (paths) {
        _.forEach(paths, function (path) {
            if (!_.isString(path)) {
                throw Error('each single item of paths must be a string.')
            }
        })
        return paths.join('/');
    };

    _.genRandomID = function () {
        return Math.random().toString(32).slice(2);
    };

    _.isEmptyArray = function (deps) {
        return this.isArray(deps) && deps.length === 0
    }

    function loadModule(moduleName) {
        var url = _.pathJoin(config.baseUrl, moduleName, '.js');
        loadJS(url, function () {
            var mod = modules[moduleName];
            mod.state = STATE.LOADED;
            mod.notify();
        });
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

    function Module(name = '', deps = [], state = STATE.NULL, context = null, content = null, depteds = []) {
        this.name = name;
        this.deps = deps;
        this.state = state;
        this.context = context;
        this.content = content;
        this.depteds = depteds;
    };

    Module.prototype.sub = function (name) {
        modules[name].push(this.name);
    };

    Module.prototype.notify = function () {
        if (this.checkDeps()) {
            this.state = STATE.DONE;
            _.forEach(this.depteds, function (name) {
                modules[name].notify();
            })
        }
    };

    Module.prototype.checkDeps = function () {
        return _.isEmptyArray(this.deps) ? true 
        :  _.every(this.deps, function (depName) {
            return depName in modules && modules[depName].state === STATE.DONE;
        })
    };
    
    Module.prototype.done = function(){
        this.deps = deps;
        this.state = STATE.DONE;
        this.context = callback;
        this.content = callback();
    }

    var require = function (selfName,deps, callback) {
        var selfMod = modules[selfName];
        if (self) {
            callback();
        }
        else {
            var task = modules[selfName]
            _.forEach(deps, function (depName) {
                let depModule = modules[depName];
                if (depModule) {
                    switch (depModule.state) {
                        case STATE.DONE:
                            task.checkDeps() && callback();
                        case STATE.LOADING:
                            task.sub(depName);
                            break;
                        case STATE.NULL:
                            depModule.state = LOADING;
                            depModule.sub(depName);
                            loadModule(depName);
                            break;
                        default:
                            break;
                    }
                }
                else {
                    modules[depName] = new Module(depName, [], STATE.LOADING, null, null);
                    task.sub(depName);
                    loadModule(depName);
                }
            });
        }
    };

    var define = function (moduleName, deps, callback) {
        var mod = modules[moduleName];
        if(mod){
            if (_.isEmptyArray(deps)) {
                mod.done();
                mod.notify();
            }
            else {

            }
        }
    };

    require.config = function (o) {
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

}(window || {})