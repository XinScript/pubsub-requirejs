(function (window) {

    /**
     * NULL:initialization
     * LOADING: Script is downloading
     * LOADED: Script has been loaded but not executed
     * DONE: Script has been executed
     * FAIL: Other cases
     */
    var STATE = {
        NULL: 0,
        LOADING: 1,
        LOADED: 3,
        DONE: 4,
        FAIL: 5
    };
    //util object
    var _ = {};

    //storage of module informations
    var modules = {};

    //config of requirejs
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


    /**
     * load module via module name
     * @param {String} moduleName 
     */
    function loadModule(moduleName) {
        var url = window.location.href + config.baseUrl + '/' + moduleName + '.js';
        loadJS(url);
    };


    /**
     * loading script 
     * @param {String} url 
     * @param {Functino} cb 
     */
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

    /**
     * Module Constructor
     * @param {String} name module name
     * @param {Array} deps module deps
     * @param {Enum} state module loading state
     * @param {*} context module code
     * @param {*} content module context after code execuation
     * @param {*} deptas the modules rely on this module
     */
    function Module(name = '', deps = [], state = STATE.NULL, context = null, content = null, deptas = []) {
        this.name = name;
        this.deps = deps;
        this.state = state;
        this.context = context;
        this.content = content;
        this.deptas = deptas;
    };

    /**
     * subscribe modules as to get notifications when it is done
     * @param {String} depName the modules need to subscribe
     */
    Module.prototype.sub = function (deptaName) {
        if(modules[deptaName].deptas.indexOf(this.name) === -1){
            modules[deptaName].deptas.push(this.name);
        }
    };

    /**
     * propogate the news of this moudle has been ready to the deptas
     */
    Module.prototype.notify = function () {
        _.forEach(this.deptas, function (name) {
            if(modules[name].isReady()){
                modules[name].complete();
            }
        });
    };

    /**
     * check if deps are all ready
     */
    Module.prototype.checkDeps = function () {
        return _.isEmptyArray(this.deps) ?
            true
            :
            _.every(this.deps, function (depName) {
                return depName in modules && modules[depName].state === STATE.DONE;
            });
    };

    /**
     * executed the code & propogate the news to deptas 
     */
    Module.prototype.complete = function(){
            this.state = STATE.DONE;
            this.content = this.context.apply(this, _.map(this.deps, function (depName) {
                return modules[depName].content;
            }));
            this.notify();
    }

    /**
     * check if the deps are ready & this module hasnt been executed
     */
    Module.prototype.isReady = function(){
        return !this.content && this.checkDeps();
    }

    /**
     * require deps, start loading deps
     */
    Module.prototype.require = function () {
        // just run if ready
        if(this.isReady()){
            this.complete();
        }
        else {
            var self = this;
            _.forEach(this.deps, function (depName) {
                let depModule = modules[depName];
                if (depModule) {
                    switch (depModule.state) {
                        // subscribe if loading
                        case STATE.LOADING:
                            self.sub(depName);
                            break;
                        // the module context has been loaded but its deps might not, sub & require 
                        case STATE.LOADED:
                            self.sub(depName);
                            depModule.require();
                            break;
                        // the module context remains unknow, sub & start loading the script
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
                    // the module has not been initialized yet
                    modules[depName] = new Module(depName, [], STATE.LOADING, null, null);
                    self.sub(depName);
                    loadModule(depName);
                }
            });
        }
    };

    /**
     * definiation a module
     * @param {String} moduleName 
     * @param {Arary} deps 
     * @param {Function} callback context of the module
     */
    var define = function (moduleName, deps, callback) {
        var mod = modules[moduleName];
        if(mod){
            // some tasks have asked for this module, but until now the deps are known, start loading scripts of the deps
            mod.deps = deps;
            mod.context = callback;
            mod.require();
        }
        else{
            // lazy loading since no tasks have asked for this module yet, no need to load it.
            modules[moduleName] = new Module(moduleName,deps,STATE.LOADED,callback,null);
        }
    };

    /**
     * custom configuration
     * @param {Object} o configuration of  the lib
     */
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
        // the task could be regarded as a special module
        // use a random string as module name
        var task = new Module(_.genRandomID(), deps, STATE.LOADED, callback, null);
        modules[task.name] = task;
        task.require();
    }
    window.define = define;
}(window||{}))