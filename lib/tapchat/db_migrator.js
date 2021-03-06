// Generated by CoffeeScript 1.7.1
(function() {
  var DBMigrator, Fs, Log, Path, WorkingQueue;

  Path = require('path');

  Fs = require('fs');

  WorkingQueue = require('capisce').WorkingQueue;

  Log = require('./log');

  DBMigrator = (function() {
    function DBMigrator(properties) {
      this.db = properties.db;
      this.dir = properties.dir;
    }

    DBMigrator.prototype.migrate = function(targetVersion, callback) {
      return this.ensureMigrationTable((function(_this) {
        return function() {
          return _this.getCurrentVersion(function(currentVersion) {
            return _this.runMigrations(currentVersion, targetVersion, callback);
          });
        };
      })(this));
    };

    DBMigrator.prototype.runMigrations = function(currentVersion, targetVersion, callback) {
      var queue, version, _fn, _i, _ref;
      queue = new WorkingQueue(1);
      if (currentVersion >= targetVersion) {
        callback();
        return;
      }
      _fn = (function(_this) {
        return function(version) {
          return queue.perform(function(over) {
            return _this.runMigration(version, over);
          });
        };
      })(this);
      for (version = _i = _ref = currentVersion + 1; _ref <= targetVersion ? _i <= targetVersion : _i >= targetVersion; version = _ref <= targetVersion ? ++_i : --_i) {
        _fn(version);
      }
      queue.onceDone(callback);
      return queue.doneAddingJobs();
    };

    DBMigrator.prototype.runMigration = function(version, callback) {
      var file, queue, sql;
      Log.info("Running migration: " + version);
      file = Path.join(this.dir, "schema_" + version + "_up.sql");
      sql = Fs.readFileSync(file).toString();
      queue = new WorkingQueue(1);
      queue.perform((function(_this) {
        return function(over) {
          return _this.db.run("BEGIN TRANSACTION", function(err) {
            if (err) {
              throw err;
            }
            return over();
          });
        };
      })(this));
      queue.perform((function(_this) {
        return function(over) {
          return _this.db.exec(sql, function(err) {
            if (err) {
              throw err;
            }
            return over();
          });
        };
      })(this));
      queue.perform((function(_this) {
        return function(over) {
          return _this.setCurrentVersion(version, over);
        };
      })(this));
      queue.perform((function(_this) {
        return function(over) {
          return _this.db.run("COMMIT", function(err) {
            if (err) {
              throw err;
            }
            return over();
          });
        };
      })(this));
      return queue.onceDone(callback);
    };

    DBMigrator.prototype.ensureMigrationTable = function(callback) {
      var sql;
      sql = "CREATE TABLE IF NOT EXISTS dbix_migration (\n  name 'CHAR(64)' PRIMARY KEY,\n  value 'CHAR(64)'\n);\nINSERT OR IGNORE INTO dbix_migration (name, value) VALUES ('version', 0);";
      return this.db.exec(sql, function(err) {
        if (err) {
          throw err;
        }
        return callback();
      });
    };

    DBMigrator.prototype.getCurrentVersion = function(callback) {
      var sql;
      sql = "SELECT value FROM dbix_migration WHERE name = 'version';";
      return this.db.get(sql, (function(_this) {
        return function(err, row) {
          var ver;
          if (err) {
            throw err;
          }
          ver = row ? parseInt(row.value) : 0;
          return callback(ver);
        };
      })(this));
    };

    DBMigrator.prototype.setCurrentVersion = function(version, callback) {
      var sql;
      sql = "UPDATE dbix_migration SET value = $version WHERE name = 'version'";
      return this.db.run(sql, {
        $version: version
      }, (function(_this) {
        return function(err) {
          if (err) {
            throw err;
          }
          return callback();
        };
      })(this));
    };

    return DBMigrator;

  })();

  module.exports = DBMigrator;

}).call(this);

//# sourceMappingURL=db_migrator.map
