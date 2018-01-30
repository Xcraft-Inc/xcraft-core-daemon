'use strict';

var fs = require ('fs');
var path = require ('path');

function Daemon (serverName, serverScript, detached, logs, response) {
  const xConfig = require ('xcraft-core-etc') (null, response).load ('xcraft');

  if (!(this instanceof Daemon)) {
    return new Daemon (serverName, serverScript, detached, logs, response);
  }

  this.serverName = serverName;
  this.serverScript = serverScript;
  this.detached = detached;
  this.logs = logs;
  this.response = response || {
    log: {
      verb: console.log,
      info: console.log,
      warn: console.warn,
      err: console.error,
    },
  };

  this.proc = null;
  this.pidFile = path.join (
    xConfig.xcraftRoot,
    './var/run/' + serverName + 'd.pid'
  );
}

Daemon.prototype.start = function () {
  var self = this;

  var isRunning = false;
  if (fs.existsSync (self.pidFile)) {
    self.response.log.info ('the ' + self.serverName + ' server seems running');

    isRunning = true;
    var pid = fs.readFileSync (self.pidFile, 'utf8');

    try {
      process.kill (pid, 0);
    } catch (err) {
      if (err.code === 'ESRCH') {
        self.response.log.info (
          'but the process can not be found, then we try to start it'
        );
        fs.unlinkSync (self.pidFile);
        isRunning = false;
      }
    }
  }

  if (!isRunning) {
    var xProcess = require ('xcraft-core-process') ({
      logger: 'daemon',
      resp: this.response,
    });

    /* TODO: add logging capabilities. */
    var options = {
      detached: self.detached,
      stdio: self.detached || !self.logs ? 'ignore' : 'pipe',
    };

    var args = [self.serverScript];
    if (
      process.env.hasOwnProperty ('XCRAFT_DEBUG') &&
      parseInt (process.env.XCRAFT_DEBUG) === 1
    ) {
      args.unshift ('--debug');
    }

    self.proc = xProcess.spawn (process.execPath, args, options, function (
      err
    ) {
      if (err) {
        self.response.log.err (err);
      }

      try {
        fs.unlinkSync (self.pidFile);
      } catch (ex) {
        // ignore exceptions
      }
    });

    self.response.log.info (self.serverName + ' server PID: ' + self.proc.pid);
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
    } catch (ex) {
      // ignore exceptions
    }
  } catch (err) {
    if (err.code !== 'ENOENT') {
      self.response.log.err (err);
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
