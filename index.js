/**
 * Created by kule on 2016/7/20.
 */
var _=require('lodash');
var exec = require('child_process').exec;
var colors = require('colors');

var ShellPromise=function(config){
    this._config=Object.assign({
        cwd:'./',
        shortLog:99999999999,
        transformLog:function(stdout){return stdout},
        maxBuffer:5 * 1024 * 1024
    },config);
    this._promise=Promise.resolve(config);
    this.callLog=[];
};
ShellPromise.prototype.getConfig=function(keyPath){
    return _.get(this._config,keyPath);
};
ShellPromise.prototype.copy=function(conifg){
    config=Object.assign({},this._config,config);
    return new ShellPromise(config);
};
ShellPromise.prototype.exec=function(cmd,execResolver,config){
    config=Object.assign({},this._config,config);
    var This=this;
    this._promise=this._promise.then(function(result){
        return new Promise(function(resolve,reject){
            var data={
                result:result
            };
            if(_.isFunction(cmd)){
                cmd=cmd.call(this,data);
            }else{
                cmd=_.template(cmd,{
                        interpolate:/${([\s\S]+?)}/g
                })(data);
            }
            exec(cmd,config,
                function(error,stdout){
                    var log=stdout.slice(0,config.shortLog);
                    if(config.transformLog){
                        log=config.transformLog(log);
                    }
                    This.callLog.push(colors.red(error||'')+colors.green(log));
                    var args;
                    if(_.isFunction(execResolver)){
                        args=[error,resolve,reject].concat(_.slice(arguments,1));
                        return execResolver.apply({
                            result:result
                        },args);
                    }
                    if(error){
                        return reject(error);
                    }
                    return resolve(stdout);
                });
            This.callLog.push(cmd+'--'+JSON.stringify(config));
        });
    });
    return this;
};
ShellPromise.prototype.addPromise=function(promise){
    this._promise=this._promise.then(()=>promise);
    return this;
};
ShellPromise.prototype.result=function(onFulfilled,onRejected){
    var This=this;
    function callLog(){
        console.log(colors.yellow(This.callLog.join('\r\n')));
    }
    function success(stdout){
        callLog();
        return Promise.resolve(stdout);
    }
    function error(error){
        callLog();
        console.log(colors.red(error.error||error));
        return Promise.reject(error);
    }
    return this._promise.then(onFulfilled||success,onRejected||error);
};
ShellPromise.exec=function(cmd,config,execResolver){
    var shell=new ShellPromise(config);
    return shell.exec(cmd,execResolver,config);
};
module.exports=ShellPromise;