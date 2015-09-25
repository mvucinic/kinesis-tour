'use strict';

var AWS = require('aws-sdk');
var async = require('async');
var columnify = require('columnify');

AWS.config.update({region: 'us-west-1'});
var kinesis = new AWS.Kinesis({});
var streamName = 'tom-learning-test-ok-to-delete';

var stats = {};
function printStats() {
  var shardCounts = Object.keys(stats).map(function(shard) {
    return {
      shard: shard,
      count: stats[shard].count,
      ms_behind: stats[shard].MillisBehindLatest
    };
  });
  console.log(columnify(shardCounts));
  console.log('---');
}

setInterval(printStats, 10000);

function initializeShards(next) {
  kinesis.describeStream({
    StreamName: streamName,
  }, function(err, streamData) {
    if (err) return next(err);
    streamData.StreamDescription.Shards.forEach(function(shard) {
      if (!stats[shard.ShardId]) {
        stats[shard.ShardId] = {count: 0, iterator: null};
      }
    });

    async.each(streamData.StreamDescription.Shards, function(shard, cb) {
      kinesis.getShardIterator({
        ShardId: shard.ShardId,
        ShardIteratorType: 'LATEST',
        StreamName: streamName,
      }, function(err, shardIterator) {
        if (err || !shardIterator) return cb(err);

        if (!stats[shard.ShardId].iterator) {
          stats[shard.ShardId].iterator = shardIterator.ShardIterator;
        }

        return cb(err);
      });
    }, next);
  });
}

function getRecords(shardId, shardIterator, cb) {
  var getParams = {ShardIterator: shardIterator};
  kinesis.getRecords(getParams, function(err, res) {
    if(err) return cb(err);
    stats[shardId].count += res.Records.length;
    stats[shardId].iterator = res.NextShardIterator || null;
    stats[shardId].MillisBehindLatest = res.MillisBehindLatest;
    return cb(err);
  });
}

function pollShards(next) {
  async.forEachOf(stats, function(detail, shardId, cb) {
    async.whilst(
      function() { return stats[shardId].iterator; },

      function(done) {
        getRecords(shardId, stats[shardId].iterator, function(err) {
          setTimeout(function() { done(err); }, 1500);
        });
      },

      cb
    );
  }, next);
}

async.forever(function(next) {
  async.series([
    initializeShards,
    pollShards,
  ], function(err) {
    if (err) console.error(err);
    console.log('all done, sleeping 1s');
    setTimeout(next, 1000);
  });
});
