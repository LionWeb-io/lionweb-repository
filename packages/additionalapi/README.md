# How to generate FlatBuffers code

From the root of this package run:

```
flatc --ts -o src src/flatbuffers/chunk.fbs
```

# How to generate ProtoBuf code

From the root of the repository run:

```
protoc --plugin=./node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=packages/additionalapi/src/proto --ts_proto_opt=esModuleInterop=true --ts_proto_opt=env=node --ts_proto_opt=importSuffix=.js packages/additionalapi/src/proto/Chunk.proto
```