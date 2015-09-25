'use strict';

var AWS = require('aws-sdk');
var uuid = require('uuid');
var async = require('async');
var columnify = require('columnify');

AWS.config.update({region: 'us-west-1'});
var kinesis = new AWS.Kinesis();
var streamName = 'tom-learning-test-ok-to-delete';

function makeRecord() {
  return {
    id: uuid.v4(),
    ts: Date.now(),
  };
}

var stats = {shards: {}};
function printStats() {
  console.log(columnify(stats.shards));
  console.log('----');
}

printStats();
setInterval(printStats, 5000);

async.forever(function(next) {
  var rec = makeRecord();
  kinesis.putRecord({
    Data: new Buffer(rec, 'base64').toString('ascii'),
    PartitionKey: rec.id,
    StreamName: streamName,
  }, function(err, data) {
    if(err) console.error(err);

    stats.lastSequence = data.SequenceNumber;

    if (!stats.shards[data.ShardId]) {
      stats.shards[data.ShardId] = 0;
    }

    stats.shards[data.ShardId] += 1;
    return next(err);
  });
});
