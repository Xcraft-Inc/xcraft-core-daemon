'use strict';

var moduleName = 'daemon';

var fs    = require ('fs');
var path  = require ('path');

var xLog    = require ('xcraft-core-log') (moduleName);
var xConfig = require ('xcraft-core-etc').load ('xcraft');


module.exports = function (serverName, serverScript, detached) {
  var proc = null;

  var pidFile = path.join (xConfig.xcraftRoot, './var/run/' + serverName + 'd.pid');

  return {
    start: function () {
      var isRunning = false;
      if (fs.existsSync (pidFile)) {
        xLog.info ('the ' + serverName + ' server seems running');

        isRunning = true;
        var pid = fs.readFileSync (pidFile, 'utf8');

        try {
          process.kill (pid, 0);
        } catch (err) {
          if (err.code === 'ESRCH') {
            xLog.info ('but the process can not be found, then we try to start it');
            fs.unlinkSync (pidFile);
            isRunning = false;
          }
        }
      }

      if (!isRunning) {
        var xProcess = require ('xcraft-core-process');

        var options = {
          detached: detached,
          stdio:    detached ? 'ignore' : 'inherit'
        };

        proc = xProcess.spawn ('node', [serverScript], options, function () {
          fs.unlinkSync (pidFile);
        }, function (line) {
          console.log ('[' + proc.pid + ']: ' + line);
        }, function (line) {
          console.log ('[' + proc.pid + ']: ' + line);
        });

        xLog.info (serverName + ' server PID: ' + proc.pid);
        fs.writeFileSync (pidFile, proc.pid);

        if (detached) {
          proc.unref ();
        }
      }
    },

    stop: function () {
      try {
        var pid = fs.readFileSync (pidFile, 'utf8');
        process.kill (pid, 'SIGTERM');
        try {
          fs.unlinkSync (pidFile);
        } catch (ex) {}
      } catch (err) {
        if (err.code !== 'ENOENT') {
          xLog.err (err);
        }
      }
    },

    restart: function () {
      this.stop ();
      this.start ();
    },

    isOurDaemon: function () {
      return proc && proc.pid;
    }
  };
};
