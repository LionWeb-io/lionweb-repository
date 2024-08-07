// automatically generated by the FlatBuffers compiler, do not modify

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion */

import * as flatbuffers from 'flatbuffers';

export class FBReferenceValue {
  bb: flatbuffers.ByteBuffer|null = null;
  bb_pos = 0;
  __init(i:number, bb:flatbuffers.ByteBuffer):FBReferenceValue {
  this.bb_pos = i;
  this.bb = bb;
  return this;
}

static getRootAsFBReferenceValue(bb:flatbuffers.ByteBuffer, obj?:FBReferenceValue):FBReferenceValue {
  return (obj || new FBReferenceValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

static getSizePrefixedRootAsFBReferenceValue(bb:flatbuffers.ByteBuffer, obj?:FBReferenceValue):FBReferenceValue {
  bb.setPosition(bb.position() + flatbuffers.SIZE_PREFIX_LENGTH);
  return (obj || new FBReferenceValue()).__init(bb.readInt32(bb.position()) + bb.position(), bb);
}

resolveInfo():string|null
resolveInfo(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
resolveInfo(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 4);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

referred():string|null
referred(optionalEncoding:flatbuffers.Encoding):string|Uint8Array|null
referred(optionalEncoding?:any):string|Uint8Array|null {
  const offset = this.bb!.__offset(this.bb_pos, 6);
  return offset ? this.bb!.__string(this.bb_pos + offset, optionalEncoding) : null;
}

static startFBReferenceValue(builder:flatbuffers.Builder) {
  builder.startObject(2);
}

static addResolveInfo(builder:flatbuffers.Builder, resolveInfoOffset:flatbuffers.Offset) {
  builder.addFieldOffset(0, resolveInfoOffset, 0);
}

static addReferred(builder:flatbuffers.Builder, referredOffset:flatbuffers.Offset) {
  builder.addFieldOffset(1, referredOffset, 0);
}

static endFBReferenceValue(builder:flatbuffers.Builder):flatbuffers.Offset {
  const offset = builder.endObject();
  return offset;
}

static createFBReferenceValue(builder:flatbuffers.Builder, resolveInfoOffset:flatbuffers.Offset, referredOffset:flatbuffers.Offset):flatbuffers.Offset {
  FBReferenceValue.startFBReferenceValue(builder);
  FBReferenceValue.addResolveInfo(builder, resolveInfoOffset);
  FBReferenceValue.addReferred(builder, referredOffset);
  return FBReferenceValue.endFBReferenceValue(builder);
}
}
