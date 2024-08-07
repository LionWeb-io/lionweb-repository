// Code generated by protoc-gen-ts_proto. DO NOT EDIT.
// versions:
//   protoc-gen-ts_proto  v1.181.1
//   protoc               v5.27.1
// source: src/proto/Chunk.proto

/* eslint-disable */
import _m0 from "protobufjs/minimal.js";

export const protobufPackage = "io.lionweb.lioncore.protobuf";

export interface PBChunk {
  serializationFormatVersion: string;
  /** We use this mechanism both to save space and to represent nulls (identified by -1) */
  stringValues: string[];
  metaPointers: PBMetaPointer[];
  languages: PBLanguage[];
  nodes: PBNode[];
}

export interface PBLanguage {
  key: number;
  version: number;
}

export interface PBNode {
  id: number;
  classifier: number;
  properties: PBProperty[];
  containments: PBContainment[];
  references: PBReference[];
  /** This is a list of indexes representing the string values corresponding to the IDs of the annotations */
  annotations: number[];
  /** Optional */
  parent: number;
}

export interface PBMetaPointer {
  language: number;
  version: number;
  key: number;
}

export interface PBProperty {
  metaPointerIndex: number;
  /** Optional */
  value: number;
}

export interface PBContainment {
  metaPointerIndex: number;
  children: number[];
}

export interface PBReference {
  metaPointerIndex: number;
  values: PBReferenceValue[];
}

export interface PBReferenceValue {
  /** Optional */
  resolveInfo: number;
  /** Optional */
  referred: number;
}

function createBasePBChunk(): PBChunk {
  return { serializationFormatVersion: "", stringValues: [], metaPointers: [], languages: [], nodes: [] };
}

export const PBChunk = {
  encode(message: PBChunk, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.serializationFormatVersion !== "") {
      writer.uint32(10).string(message.serializationFormatVersion);
    }
    for (const v of message.stringValues) {
      writer.uint32(18).string(v!);
    }
    for (const v of message.metaPointers) {
      PBMetaPointer.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.languages) {
      PBLanguage.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.nodes) {
      PBNode.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBChunk {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBChunk();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.serializationFormatVersion = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.stringValues.push(reader.string());
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.metaPointers.push(PBMetaPointer.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.languages.push(PBLanguage.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.nodes.push(PBNode.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBChunk {
    return {
      serializationFormatVersion: isSet(object.serializationFormatVersion)
        ? globalThis.String(object.serializationFormatVersion)
        : "",
      stringValues: globalThis.Array.isArray(object?.stringValues)
        ? object.stringValues.map((e: any) => globalThis.String(e))
        : [],
      metaPointers: globalThis.Array.isArray(object?.metaPointers)
        ? object.metaPointers.map((e: any) => PBMetaPointer.fromJSON(e))
        : [],
      languages: globalThis.Array.isArray(object?.languages)
        ? object.languages.map((e: any) => PBLanguage.fromJSON(e))
        : [],
      nodes: globalThis.Array.isArray(object?.nodes) ? object.nodes.map((e: any) => PBNode.fromJSON(e)) : [],
    };
  },

  toJSON(message: PBChunk): unknown {
    const obj: any = {};
    if (message.serializationFormatVersion !== "") {
      obj.serializationFormatVersion = message.serializationFormatVersion;
    }
    if (message.stringValues?.length) {
      obj.stringValues = message.stringValues;
    }
    if (message.metaPointers?.length) {
      obj.metaPointers = message.metaPointers.map((e) => PBMetaPointer.toJSON(e));
    }
    if (message.languages?.length) {
      obj.languages = message.languages.map((e) => PBLanguage.toJSON(e));
    }
    if (message.nodes?.length) {
      obj.nodes = message.nodes.map((e) => PBNode.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBChunk>, I>>(base?: I): PBChunk {
    return PBChunk.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBChunk>, I>>(object: I): PBChunk {
    const message = createBasePBChunk();
    message.serializationFormatVersion = object.serializationFormatVersion ?? "";
    message.stringValues = object.stringValues?.map((e) => e) || [];
    message.metaPointers = object.metaPointers?.map((e) => PBMetaPointer.fromPartial(e)) || [];
    message.languages = object.languages?.map((e) => PBLanguage.fromPartial(e)) || [];
    message.nodes = object.nodes?.map((e) => PBNode.fromPartial(e)) || [];
    return message;
  },
};

function createBasePBLanguage(): PBLanguage {
  return { key: 0, version: 0 };
}

export const PBLanguage = {
  encode(message: PBLanguage, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== 0) {
      writer.uint32(8).int32(message.key);
    }
    if (message.version !== 0) {
      writer.uint32(16).int32(message.version);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBLanguage {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBLanguage();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.key = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.version = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBLanguage {
    return {
      key: isSet(object.key) ? globalThis.Number(object.key) : 0,
      version: isSet(object.version) ? globalThis.Number(object.version) : 0,
    };
  },

  toJSON(message: PBLanguage): unknown {
    const obj: any = {};
    if (message.key !== 0) {
      obj.key = Math.round(message.key);
    }
    if (message.version !== 0) {
      obj.version = Math.round(message.version);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBLanguage>, I>>(base?: I): PBLanguage {
    return PBLanguage.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBLanguage>, I>>(object: I): PBLanguage {
    const message = createBasePBLanguage();
    message.key = object.key ?? 0;
    message.version = object.version ?? 0;
    return message;
  },
};

function createBasePBNode(): PBNode {
  return { id: 0, classifier: 0, properties: [], containments: [], references: [], annotations: [], parent: 0 };
}

export const PBNode = {
  encode(message: PBNode, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== 0) {
      writer.uint32(8).int32(message.id);
    }
    if (message.classifier !== 0) {
      writer.uint32(16).int32(message.classifier);
    }
    for (const v of message.properties) {
      PBProperty.encode(v!, writer.uint32(26).fork()).ldelim();
    }
    for (const v of message.containments) {
      PBContainment.encode(v!, writer.uint32(34).fork()).ldelim();
    }
    for (const v of message.references) {
      PBReference.encode(v!, writer.uint32(42).fork()).ldelim();
    }
    writer.uint32(50).fork();
    for (const v of message.annotations) {
      writer.int32(v);
    }
    writer.ldelim();
    if (message.parent !== 0) {
      writer.uint32(56).int32(message.parent);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBNode {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBNode();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.id = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.classifier = reader.int32();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.properties.push(PBProperty.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.containments.push(PBContainment.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.references.push(PBReference.decode(reader, reader.uint32()));
          continue;
        case 6:
          if (tag === 48) {
            message.annotations.push(reader.int32());

            continue;
          }

          if (tag === 50) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.annotations.push(reader.int32());
            }

            continue;
          }

          break;
        case 7:
          if (tag !== 56) {
            break;
          }

          message.parent = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBNode {
    return {
      id: isSet(object.id) ? globalThis.Number(object.id) : 0,
      classifier: isSet(object.classifier) ? globalThis.Number(object.classifier) : 0,
      properties: globalThis.Array.isArray(object?.properties)
        ? object.properties.map((e: any) => PBProperty.fromJSON(e))
        : [],
      containments: globalThis.Array.isArray(object?.containments)
        ? object.containments.map((e: any) => PBContainment.fromJSON(e))
        : [],
      references: globalThis.Array.isArray(object?.references)
        ? object.references.map((e: any) => PBReference.fromJSON(e))
        : [],
      annotations: globalThis.Array.isArray(object?.annotations)
        ? object.annotations.map((e: any) => globalThis.Number(e))
        : [],
      parent: isSet(object.parent) ? globalThis.Number(object.parent) : 0,
    };
  },

  toJSON(message: PBNode): unknown {
    const obj: any = {};
    if (message.id !== 0) {
      obj.id = Math.round(message.id);
    }
    if (message.classifier !== 0) {
      obj.classifier = Math.round(message.classifier);
    }
    if (message.properties?.length) {
      obj.properties = message.properties.map((e) => PBProperty.toJSON(e));
    }
    if (message.containments?.length) {
      obj.containments = message.containments.map((e) => PBContainment.toJSON(e));
    }
    if (message.references?.length) {
      obj.references = message.references.map((e) => PBReference.toJSON(e));
    }
    if (message.annotations?.length) {
      obj.annotations = message.annotations.map((e) => Math.round(e));
    }
    if (message.parent !== 0) {
      obj.parent = Math.round(message.parent);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBNode>, I>>(base?: I): PBNode {
    return PBNode.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBNode>, I>>(object: I): PBNode {
    const message = createBasePBNode();
    message.id = object.id ?? 0;
    message.classifier = object.classifier ?? 0;
    message.properties = object.properties?.map((e) => PBProperty.fromPartial(e)) || [];
    message.containments = object.containments?.map((e) => PBContainment.fromPartial(e)) || [];
    message.references = object.references?.map((e) => PBReference.fromPartial(e)) || [];
    message.annotations = object.annotations?.map((e) => e) || [];
    message.parent = object.parent ?? 0;
    return message;
  },
};

function createBasePBMetaPointer(): PBMetaPointer {
  return { language: 0, version: 0, key: 0 };
}

export const PBMetaPointer = {
  encode(message: PBMetaPointer, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.language !== 0) {
      writer.uint32(8).int32(message.language);
    }
    if (message.version !== 0) {
      writer.uint32(16).int32(message.version);
    }
    if (message.key !== 0) {
      writer.uint32(24).int32(message.key);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBMetaPointer {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBMetaPointer();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.language = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.version = reader.int32();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.key = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBMetaPointer {
    return {
      language: isSet(object.language) ? globalThis.Number(object.language) : 0,
      version: isSet(object.version) ? globalThis.Number(object.version) : 0,
      key: isSet(object.key) ? globalThis.Number(object.key) : 0,
    };
  },

  toJSON(message: PBMetaPointer): unknown {
    const obj: any = {};
    if (message.language !== 0) {
      obj.language = Math.round(message.language);
    }
    if (message.version !== 0) {
      obj.version = Math.round(message.version);
    }
    if (message.key !== 0) {
      obj.key = Math.round(message.key);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBMetaPointer>, I>>(base?: I): PBMetaPointer {
    return PBMetaPointer.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBMetaPointer>, I>>(object: I): PBMetaPointer {
    const message = createBasePBMetaPointer();
    message.language = object.language ?? 0;
    message.version = object.version ?? 0;
    message.key = object.key ?? 0;
    return message;
  },
};

function createBasePBProperty(): PBProperty {
  return { metaPointerIndex: 0, value: 0 };
}

export const PBProperty = {
  encode(message: PBProperty, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.metaPointerIndex !== 0) {
      writer.uint32(8).int32(message.metaPointerIndex);
    }
    if (message.value !== 0) {
      writer.uint32(16).int32(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBProperty {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBProperty();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.metaPointerIndex = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.value = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBProperty {
    return {
      metaPointerIndex: isSet(object.metaPointerIndex) ? globalThis.Number(object.metaPointerIndex) : 0,
      value: isSet(object.value) ? globalThis.Number(object.value) : 0,
    };
  },

  toJSON(message: PBProperty): unknown {
    const obj: any = {};
    if (message.metaPointerIndex !== 0) {
      obj.metaPointerIndex = Math.round(message.metaPointerIndex);
    }
    if (message.value !== 0) {
      obj.value = Math.round(message.value);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBProperty>, I>>(base?: I): PBProperty {
    return PBProperty.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBProperty>, I>>(object: I): PBProperty {
    const message = createBasePBProperty();
    message.metaPointerIndex = object.metaPointerIndex ?? 0;
    message.value = object.value ?? 0;
    return message;
  },
};

function createBasePBContainment(): PBContainment {
  return { metaPointerIndex: 0, children: [] };
}

export const PBContainment = {
  encode(message: PBContainment, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.metaPointerIndex !== 0) {
      writer.uint32(8).int32(message.metaPointerIndex);
    }
    writer.uint32(18).fork();
    for (const v of message.children) {
      writer.int32(v);
    }
    writer.ldelim();
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBContainment {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBContainment();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.metaPointerIndex = reader.int32();
          continue;
        case 2:
          if (tag === 16) {
            message.children.push(reader.int32());

            continue;
          }

          if (tag === 18) {
            const end2 = reader.uint32() + reader.pos;
            while (reader.pos < end2) {
              message.children.push(reader.int32());
            }

            continue;
          }

          break;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBContainment {
    return {
      metaPointerIndex: isSet(object.metaPointerIndex) ? globalThis.Number(object.metaPointerIndex) : 0,
      children: globalThis.Array.isArray(object?.children) ? object.children.map((e: any) => globalThis.Number(e)) : [],
    };
  },

  toJSON(message: PBContainment): unknown {
    const obj: any = {};
    if (message.metaPointerIndex !== 0) {
      obj.metaPointerIndex = Math.round(message.metaPointerIndex);
    }
    if (message.children?.length) {
      obj.children = message.children.map((e) => Math.round(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBContainment>, I>>(base?: I): PBContainment {
    return PBContainment.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBContainment>, I>>(object: I): PBContainment {
    const message = createBasePBContainment();
    message.metaPointerIndex = object.metaPointerIndex ?? 0;
    message.children = object.children?.map((e) => e) || [];
    return message;
  },
};

function createBasePBReference(): PBReference {
  return { metaPointerIndex: 0, values: [] };
}

export const PBReference = {
  encode(message: PBReference, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.metaPointerIndex !== 0) {
      writer.uint32(8).int32(message.metaPointerIndex);
    }
    for (const v of message.values) {
      PBReferenceValue.encode(v!, writer.uint32(18).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBReference {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBReference();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.metaPointerIndex = reader.int32();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.values.push(PBReferenceValue.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBReference {
    return {
      metaPointerIndex: isSet(object.metaPointerIndex) ? globalThis.Number(object.metaPointerIndex) : 0,
      values: globalThis.Array.isArray(object?.values)
        ? object.values.map((e: any) => PBReferenceValue.fromJSON(e))
        : [],
    };
  },

  toJSON(message: PBReference): unknown {
    const obj: any = {};
    if (message.metaPointerIndex !== 0) {
      obj.metaPointerIndex = Math.round(message.metaPointerIndex);
    }
    if (message.values?.length) {
      obj.values = message.values.map((e) => PBReferenceValue.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBReference>, I>>(base?: I): PBReference {
    return PBReference.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBReference>, I>>(object: I): PBReference {
    const message = createBasePBReference();
    message.metaPointerIndex = object.metaPointerIndex ?? 0;
    message.values = object.values?.map((e) => PBReferenceValue.fromPartial(e)) || [];
    return message;
  },
};

function createBasePBReferenceValue(): PBReferenceValue {
  return { resolveInfo: 0, referred: 0 };
}

export const PBReferenceValue = {
  encode(message: PBReferenceValue, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.resolveInfo !== 0) {
      writer.uint32(8).int32(message.resolveInfo);
    }
    if (message.referred !== 0) {
      writer.uint32(16).int32(message.referred);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PBReferenceValue {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePBReferenceValue();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.resolveInfo = reader.int32();
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.referred = reader.int32();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PBReferenceValue {
    return {
      resolveInfo: isSet(object.resolveInfo) ? globalThis.Number(object.resolveInfo) : 0,
      referred: isSet(object.referred) ? globalThis.Number(object.referred) : 0,
    };
  },

  toJSON(message: PBReferenceValue): unknown {
    const obj: any = {};
    if (message.resolveInfo !== 0) {
      obj.resolveInfo = Math.round(message.resolveInfo);
    }
    if (message.referred !== 0) {
      obj.referred = Math.round(message.referred);
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PBReferenceValue>, I>>(base?: I): PBReferenceValue {
    return PBReferenceValue.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PBReferenceValue>, I>>(object: I): PBReferenceValue {
    const message = createBasePBReferenceValue();
    message.resolveInfo = object.resolveInfo ?? 0;
    message.referred = object.referred ?? 0;
    return message;
  },
};

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends globalThis.Array<infer U> ? globalThis.Array<DeepPartial<U>>
  : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
