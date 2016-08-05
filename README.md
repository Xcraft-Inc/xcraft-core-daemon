
# xcraft-core-daemon

Manage the lifecycle of a daemon.

A daemon must be a node script. A pid file is created in a dedicated directory
and the `SIGTERM` signal is used in order to stop (kill) the daemon.

Note that the logs (stdout and stderr) are not really handled here. If the
daemon is not detached, then the logs are just piped to the parent process.

The Xcraft server is started by this module.
