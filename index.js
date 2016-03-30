'use strict';

var moduleName = 'daemon';

var fs    = require ('fs');
var path  = require ('path');

var xLog    = require ('xcraft-core-log') (moduleName);
var xConfig = require ('xcraft-core-etc') ().load ('xcraft');


function Daemon (serverName, serverScript, detached, logs) {
  if (!(this instanceof Daemon)) {
    return new Daemon (serverName, serverScript, detached, logs);
  }

  this.serverName   = serverName;
  this.serverScript = serverScript;
  this.detached     = detached;
  this.logs         = logs;

  this.proc    = null;
  this.pidFile = path.join (xConfig.xcraftRoot, './var/run/' + serverName + 'd.pid');
}

Daemon.prototype.start = function () {
  var self = this;

  var isRunning = false;
  if (fs.existsSync (self.pidFile)) {
    xLog.info ('the ' + self.serverName + ' server seems running');

    isRunning = true;
    var pid = fs.readFileSync (self.pidFile, 'utf8');

    try {
      process.kill (pid, 0);
    } catch (err) {
      if (err.code === 'ESRCH') {
        xLog.info ('but the process can not be found, then we try to start it');
        fs.unlinkSync (self.pidFile);
        isRunning = false;
      }
    }
  }

  if (!isRunning) {
    var xProcess = require ('xcraft-core-process') ({logger: 'daemon'});

    /* TODO: add logging capabilities. */
    var options = {
      detached: self.detached,
      stdio:    (self.detached || !self.logs) ? 'ignore' : 'pipe'
    };

    var args = [self.serverScript];
    if (process.env.hasOwnProperty ('XCRAFT_DEBUG') &&
        parseInt (process.env.XCRAFT_DEBUG) === 1) {
      args.unshift ('--debug');
    }

    self.proc = xProcess.spawn ('node', args, options, function (err) {
      if (err) {
        xLog.err (err);
      }

      fs.unlinkSync (self.pidFile);
    });

    xLog.info (self.serverName + ' server PID: ' + self.proc.pid);
    fs.writeFileSync (self.pidFile, self.proc.pid);

    if (self.detached) {
      self.proc.unref ();
    }
  }
};

Daemon.prototype.stop = function () {
  var self = this;

  try {
    var pid = fs.readFileSync (self.pidFile, 'utf8');
    process.kill (pid, 'SIGTERM');
    try {
      fs.unlinkSync (self.pidFile);
    } catch (ex) {}
  } catch (err) {
    if (err.code !== 'ENOENT') {
      xLog.err (err);
    }
  }
};

Daemon.prototype.restart = function () {
  this.stop ();
  this.start ();
};

Daemon.prototype.isOurDaemon = function () {
  return this.proc && this.proc.pid;
};

module.exports = Daemon;
