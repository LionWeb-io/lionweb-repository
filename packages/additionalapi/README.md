# Bulk import operation

As part of the additional APIs (i.e., APIs not required by the LionWeb specifications) we introduced an API
for performing bulk imports. This API has one strong limitation with respect to standard store operations:
it can process only nodes that are new. In exchange it provides higher speed. It is intended for importing
large number of nodes, typically in the hundreds of thousands of nodes per insert.

## Structure of a Bulk Import request

A Bulk Import requests consists of two elements:
* A list of attach points
* A list of nodes

The nodes provided must all be new nodes (i.e., we should not have any node with the same ID in 
the repository). If this constraint is not respected the operation will fail.

The nodes constitutes one or more trees: some of the nodes are parent of some of the other nodes specified.
However eventually these trees must be attached to existing nodes. This is done based on the information
provided in the _attach points_. The attach points specify where we should _attach_ the trees provided.
Each attach point is constituted by a node id and a containment.

For example, let's suppose that I want to specify in my bulk import two method declarations to a 
class declaration. This example is clearly fictitious because the bulk import would be typically used
for much larger operations. In this case the two method declarations will each have a "root" (the nodes
representing the entire method declaration) plus many other nodes (the parameter declaration, the statements
constituting the body of the method, the expressions within those statements, etc.). So we could
get a list of, let's say, 100 nodes. These nodes will come from each or the other method and will be put
together in the same node lists. There will be also a list of 2 attach points. It will specify the
node id of the class declaration in which these two nodes should be inserted. It will also specify
the containment under which these nodes should be inserted (the containment representing the members of
the class declaration).

Note that:
- all nodes to be imported _must not_ exist
- all containers specified in the attach point _must_ exist

## Binary formats

The operation can use a payload specified in JSON format or one two binary formats.
The binary formats are both from Google: one is ProtoBuf, while the other one is FlatBuffers.
Both have bindings for many languages and are efficient. However FlatBuffers has an edge, as it seems
slightly faster. ProtoBuf on the other hand is more well-known.

For both formats we define schemas in their own DSL and then we generate code in Typescript to read
binary messages based on those schemas.

Resources:
* [FlatBuffers](https://flatbuffers.dev/)
* [ProtoBuf](https://protobuf.dev/)

## How to generate FlatBuffers code

From the root of this package run:

```
flatc --ts -o src src/flatbuffers/chunk.fbs
flatc --ts -o src src/flatbuffers/bulkimport.fbs
```

## How to generate ProtoBuf code

From the root of this package run:

```
protoc --plugin=../../node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=. --ts_proto_opt=esModuleInterop=true --ts_proto_opt=env=node --ts_proto_opt=importSuffix=.js src/proto/Chunk.proto
protoc --plugin=../../node_modules/.bin/protoc-gen-ts_proto --ts_proto_out=. --ts_proto_opt=esModuleInterop=true --ts_proto_opt=env=node --ts_proto_opt=importSuffix=.js src/proto/BulkImport.proto
```
