/**
 * Created by kule on 2016/7/20.
 */
var _=require('lodash');
var exec = require('child_process').exec;
var colors = require('colors');
var ShellPromiseChain=function(config){
    this._config=Object.assign({
        cwd:'./',
        shortLog:99999999999,
        maxBuffer:5 * 1024 * 1024
    },config);
    this._promise=Promise.resolve(config);
    this.callLog=[];
};
ShellPromiseChain.prototype.getConfig=function(keyPath){
    return _.get(this._config,keyPath);
};
ShellPromiseChain.prototype.copy=function(conifg){
    config=Object.assign({},this._config,config);
    return new ShellPromiseChain(config);
};
ShellPromiseChain.prototype.exec=function(cmd,execResolver,config){
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
ShellPromiseChain.prototype.addPromise=function(promise){
    this._promise=this._promise.then(()=>promise);
    return this;
};
ShellPromiseChain.prototype.result=function(onFulfilled,onRejected){
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
ShellPromiseChain.exec=function(cmd,config,execResolver){
    var shell=new ShellPromiseChain(config);
    return shell.exec(cmd,execResolver,config);
};
module.exports=ShellPromiseChain;