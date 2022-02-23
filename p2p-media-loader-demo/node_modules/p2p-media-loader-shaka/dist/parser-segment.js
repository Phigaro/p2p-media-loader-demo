"use strict";
/**
 * Copyright 2018 Novage LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
class ParserSegment {
    constructor(streamId, streamType, streamPosition, streamIdentity, identity, position, start, end, uri, range, prev, next) {
        this.streamId = streamId;
        this.streamType = streamType;
        this.streamPosition = streamPosition;
        this.streamIdentity = streamIdentity;
        this.identity = identity;
        this.position = position;
        this.start = start;
        this.end = end;
        this.uri = uri;
        this.range = range;
        this.prev = prev;
        this.next = next;
    }
    static create(stream, position) {
        const ref = stream.getSegmentReferenceOriginal(position);
        if (!ref) {
            return undefined;
        }
        const uris = ref.createUris();
        if (!uris || uris.length === 0) {
            return undefined;
        }
        const start = ref.getStartTime();
        const end = ref.getEndTime();
        const startByte = ref.getStartByte();
        const endByte = ref.getEndByte();
        const range = startByte || endByte
            ? `bytes=${startByte || ""}-${endByte || ""}`
            : undefined;
        const streamTypeCode = stream.type.substring(0, 1).toUpperCase();
        const streamPosition = stream.getPosition();
        const streamIsHls = streamPosition >= 0;
        const streamIdentity = streamIsHls
            ? `${streamTypeCode}${streamPosition}`
            : `${streamTypeCode}${stream.id}`;
        const identity = streamIsHls
            ? `${position}`
            : `${Number(start).toFixed(3)}`;
        return new ParserSegment(stream.id, stream.type, streamPosition, streamIdentity, identity, position, start, end, utils_1.getSchemedUri(uris[0]), range, () => ParserSegment.create(stream, position - 1), () => ParserSegment.create(stream, position + 1));
    }
} // end of ParserSegment
exports.ParserSegment = ParserSegment;
class ParserSegmentCache {
    constructor(maxSegments) {
        this.segments = [];
        this.maxSegments = maxSegments;
    }
    find(uri, range) {
        return this.segments.find(i => i.uri === uri && i.range === range);
    }
    add(stream, position) {
        const segment = ParserSegment.create(stream, position);
        if (segment && !this.find(segment.uri, segment.range)) {
            this.segments.push(segment);
            if (this.segments.length > this.maxSegments) {
                this.segments.splice(0, this.maxSegments * 0.2);
            }
        }
    }
    clear() {
        this.segments.splice(0);
    }
} // end of ParserSegmentCache
exports.ParserSegmentCache = ParserSegmentCache;
