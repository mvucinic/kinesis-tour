
## A guided tour of [AWS Kinesis](http://docs.aws.amazon.com/kinesis/latest/dev/introduction.html) usage including:
  - a producer script
  - a consumer script
  - aws cli commands to tune the stream

### prerequisites/notes

0. create a test kinesis stream w/ 1 shard
0. update produce/consume scripts with shard name
0. remember to tear down the stream when you are done
0. I didn't use [KCL](https://github.com/awslabs/amazon-kinesis-client-nodejs) for my client code (produce, consume). But if I started again, I probably would.

### start producer
    AWS_PROFILE=datascience node produce.js

### start consumer

    AWS_PROFILE=datascience node consume.js

### describe shards

    ➜  kinesis-tools  AWS_PROFILE=datascience aws kinesis describe-stream --stream-name tom-learning-test-ok-to-delete
    {
      "StreamDescription": {
          "StreamStatus": "ACTIVE",
          "StreamName": "tom-learning-test-ok-to-delete",
          "StreamARN": "arn:aws:kinesis:us-west-1:XXXXXXXXX:stream/tom-learning-test-ok-to-delete",
          "Shards": [
              {
                  "ShardId": "shardId-000000000000",
                  "HashKeyRange": {
                      "EndingHashKey": "340282366920938463463374607431768211455",
                      "StartingHashKey": "0"
                  },
                  "SequenceNumberRange": {
                      "StartingSequenceNumber": "49554751971385712311965096607999491514675643249030332418"
                  }
              }
          ]
      }
    }

### split once
    AWS_PROFILE=datascience aws kinesis split-shard --stream-name tom-learning-test-ok-to-delete --shard-to-split shardId-000000000000 --new-starting-hash-key 170141183460469000000000000000000000000

### split twice more
    AWS_PROFILE=datascience aws kinesis split-shard --stream-name tom-learning-test-ok-to-delete --shard-to-split shardId-000000000001 --new-starting-hash-key 85000000000000000000000000000000000000

    AWS_PROFILE=datascience aws kinesis split-shard --stream-name tom-learning-test-ok-to-delete --shard-to-split shardId-000000000002 --new-starting-hash-key 255000000000000000000000000000000000000

### split once more (3rd level)
    AWS_PROFILE=datascience aws kinesis split-shard --stream-name tom-learning-test-ok-to-delete --shard-to-split shardId-000000000006 --new-starting-hash-key 297500000000000000000000000000000000000

- 0,1,2,6 are closed. will remain visible until horizon expires them
- shards 3,4,5,7,8 are open. merging is only possible between contiguous shards

### merge 4,5 -> 9
    AWS_PROFILE=datascience aws kinesis merge-shards --stream-name tom-learning-test-ok-to-delete --shard-to-merge shardId-000000000004 --adjacent-shard-to-merge shardId-000000000005

- shards 3,7,8,9

### merge 7,8 -> 10
    AWS_PROFILE=datascience aws kinesis merge-shards --stream-name tom-learning-test-ok-to-delete --shard-to-merge shardId-000000000007 --adjacent-shard-to-merge shardId-000000000008

- shards 3,9,10

### merge 3,9 -> 11
    AWS_PROFILE=datascience aws kinesis merge-shards --stream-name tom-learning-test-ok-to-delete --shard-to-merge shardId-000000000003 --adjacent-shard-to-merge shardId-000000000009

- shards 10,11

### merge 10,11 -> 12
    AWS_PROFILE=datascience aws kinesis merge-shards --stream-name tom-learning-test-ok-to-delete --shard-to-merge shardId-000000000010 --adjacent-shard-to-merge shardId-000000000011
