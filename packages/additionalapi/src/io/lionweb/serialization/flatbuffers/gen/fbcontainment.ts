// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

import { FBMetaPointer } from '../../../../../io/lionweb/serialization/flatbuffers/gen/fbmeta-pointer.js';


export class FBContainment {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):FBContainment {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsFBContainment(bb:flatbuffers.ByteBuffer, obj?:FBContainment):FBContainment {
  return (obj || new FBContainment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsFBContainment(bb:flatbuffers.ByteBuffer, obj?:FBContainment):FBContainment {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new FBContainment()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

metaPointer(obj?:FBMetaPointer):FBMetaPointer|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? (obj || new FBMetaPointer()).__init(this.bb!.__indirect(this.bb_pos + offset), this.bb!) : null;
}

children(index: number):string
children(index: number,optionalEncoding:flatbuffers.Encoding):string|Uint8Array
children(index: number,optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb!.__vector(this.bb_pos + offset) + index * 4, optionalEncoding) : null;
}

childrenLength():number {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__vector_len(this.bb_pos + offset) : 0;
}

static startFBContainment(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addMetaPointer(builder:flatbuffers.Builder, metaPointerOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, metaPointerOffset, 0);
}

static addChildren(builder:flatbuffers.Builder, childrenOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, childrenOffset, 0);
}

static createChildrenVector(builder:flatbuffers.Builder, data:flatbuffers.Offset[]):flatbuffers.Offset {
  builder.startVector(4, data.length, 4);
  for (let i = data.length - 1; i >= 0; i--) {
    builder.addOffset(data[i]!);
  }
  return builder.endVector();
}

static startChildrenVector(builder:flatbuffers.Builder, numElems:number) {
  builder.startVector(4, numElems, 4);
}

static endFBContainment(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createFBContainment(builder:flatbuffers.Builder, metaPointerOffset:flatbuffers.Offset, childrenOffset:flatbuffers.Offset):flatbuffers.Offset {
  FBContainment.startFBContainment(builder);
  FBContainment.addMetaPointer(builder, metaPointerOffset);
  FBContainment.addChildren(builder, childrenOffset);
  return FBContainment.endFBContainment(builder);
}
}