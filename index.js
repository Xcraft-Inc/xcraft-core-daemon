'use strict';

const fs = require('fs');
const path = require('path');

class Daemon {
  constructor(serverName, serverScript, options, logs, resp) {
    if (!(this instanceof Daemon)) {
      return new Daemon(serverName, serverScript, options, logs, resp);
    }

    const xConfig = require('xcraft-core-etc')(null, resp).load('xcraft');

    this._serverName = serverName;
    this._serverScript = serverScript;
    this._options = options;
    this._logs = logs;
    this._resp = resp || {
      log: {
        verb: console.log,
        info: console.log,
        warn: console.warn,
        err: console.error,
      },
    };

    this._proc = null;
    this._pidFile = path.join(
      xConfig.xcraftRoot,
      './var/run/' + serverName + 'd.pid'
    );
  }

  get proc() {
    return this._proc;
  }

  start() {
    let isRunning = false;
    if (fs.existsSync(this._pidFile)) {
      this._resp.log.info('the ' + this._serverName + ' server seems running');

      isRunning = true;
      const pid = fs.readFileSync(this._pidFile, 'utf8');

      try {
        process.kill(pid, 0);
      } catch (err) {
        if (err.code === 'ESRCH') {
          this._resp.log.info(
            'but the process can not be found, then we try to start it'
          );
          fs.unlinkSync(this._pidFile);
          isRunning = false;
        }
      }
    }

    if (!isRunning) {
      const xProcess = require('xcraft-core-process')({
        logger: 'daemon',
        resp: this._resp,
      });

      /* TODO: add logging capabilities. */
      const options = {
        detached: this._options.detached,
        stdio: this._options.detached || !this._logs ? 'ignore' : 'pipe',
        env: this._options.env || process.env,
      };

      const args = [this._serverScript];
      if (
        process.env.hasOwnProperty('XCRAFT_DEBUG') &&
        parseInt(process.env.XCRAFT_DEBUG) === 1
      ) {
        args.unshift(`--inspect=${this._options.inspectPort || 9229}`);
      }

      this._proc = xProcess.spawn(
        this._options.bin || process.execPath,
        args,
        options,
        (err) => {
          if (err) {
            this._resp.log.err(err);
          }

          try {
            fs.unlinkSync(this._pidFile);
          } catch (ex) {
            // ignore exceptions
          }
        }
      );

      this._resp.log.info(this._serverName + ' server PID: ' + this._proc.pid);
      fs.writeFileSync(this._pidFile, this._proc.pid);

      if (this._options.detached) {
        this._proc.unref();
      }
    }
  }

  stop() {
    try {
      const pid = fs.readFileSync(this._pidFile, 'utf8');
      process.kill(pid, 'SIGTERM');
      try {
        fs.unlinkSync(this._pidFile);
      } catch (ex) {
        // ignore exceptions
      }
    } catch (err) {
      if (err.code !== 'ENOENT') {
        this._resp.log.err(err);
      }
    }
  }

  restart() {
    this.stop();
    this.start();
  }

  isOurDaemon() {
    return this._proc && this._proc.pid;
  }
}

module.exports = Daemon;
