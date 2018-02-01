'use strict';

const fs = require ('fs');
const path = require ('path');

class Daemon {
  constructor (serverName, serverScript, detached, logs, response) {
    const xConfig = require ('xcraft-core-etc') (null, response).load (
      'xcraft'
    );

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
      './const/run/' + serverName + 'd.pid'
    );
  }

  start () {
    let isRunning = false;
    if (fs.existsSync (this.pidFile)) {
      this.response.log.info (
        'the ' + this.serverName + ' server seems running'
      );

      isRunning = true;
      const pid = fs.readFileSync (this.pidFile, 'utf8');

      try {
        process.kill (pid, 0);
      } catch (err) {
        if (err.code === 'ESRCH') {
          this.response.log.info (
            'but the process can not be found, then we try to start it'
          );
          fs.unlinkSync (this.pidFile);
          isRunning = false;
        }
      }
    }

    if (!isRunning) {
      const xProcess = require ('xcraft-core-process') ({
        logger: 'daemon',
        resp: this.response,
      });

      /* TODO: add logging capabilities. */
      const options = {
        detached: this.detached,
        stdio: this.detached || !this.logs ? 'ignore' : 'pipe',
        env: this.env || process.env,
      };

      const args = [this.serverScript];
      if (
        process.env.hasOwnProperty ('XCRAFT_DEBUG') &&
        parseInt (process.env.XCRAFT_DEBUG) === 1
      ) {
        args.unshift ('--debug');
      }

      this.proc = xProcess.spawn (process.execPath, args, options, err => {
        if (err) {
          this.response.log.err (err);
        }

        try {
          fs.unlinkSync (this.pidFile);
        } catch (ex) {
          // ignore exceptions
        }
      });

      this.response.log.info (
        this.serverName + ' server PID: ' + this.proc.pid
      );
      fs.writeFileSync (this.pidFile, this.proc.pid);

      if (this.detached) {
        this.proc.unref ();
      }
    }
  }

  stop () {
    try {
      const pid = fs.readFileSync (this.pidFile, 'utf8');
      process.kill (pid, 'SIGTERM');
      try {
        fs.unlinkSync (this.pidFile);
      } catch (ex) {
        // ignore exceptions
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this.response.log.err (err);
      }
    }
  }

  restart () {
    this.stop ();
    this.start ();
  }

  isOurDaemon () {
    return this.proc && this.proc.pid;
  }
}

module.exports = Daemon;
