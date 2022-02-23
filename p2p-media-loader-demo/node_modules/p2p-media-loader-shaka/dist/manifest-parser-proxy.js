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
const parser_segment_1 = require("./parser-segment");
class ShakaManifestParserProxy {
    constructor(originalManifestParser) {
        this.cache = new parser_segment_1.ParserSegmentCache(200);
        this.originalManifestParser = originalManifestParser;
    }
    isHls() { return this.originalManifestParser instanceof shaka.hls.HlsParser; }
    isDash() { return this.originalManifestParser instanceof shaka.dash.DashParser; }
    start(uri, playerInterface) {
        // Tell P2P Media Loader's networking engine code about currently loading manifest
        if (playerInterface.networkingEngine.p2pml === undefined) {
            playerInterface.networkingEngine.p2pml = {};
        }
        playerInterface.networkingEngine.p2pml.masterManifestUri = uri;
        return this.originalManifestParser.start(uri, playerInterface).then((manifest) => {
            this.manifest = manifest;
            for (const period of manifest.periods) {
                const processedStreams = [];
                for (const variant of period.variants) {
                    if ((variant.video != null) && (processedStreams.indexOf(variant.video) == -1)) {
                        this.hookGetSegmentReference(variant.video);
                        processedStreams.push(variant.video);
                    }
                    if ((variant.audio != null) && (processedStreams.indexOf(variant.audio) == -1)) {
                        this.hookGetSegmentReference(variant.audio);
                        processedStreams.push(variant.audio);
                    }
                }
            }
            manifest.p2pml = { parser: this };
            return manifest;
        });
    }
    configure(config) {
        return this.originalManifestParser.configure(config);
    }
    stop() {
        return this.originalManifestParser.stop();
    }
    update() {
        return this.originalManifestParser.update();
    }
    onExpirationUpdated() {
        return this.originalManifestParser.onExpirationUpdated();
    }
    find(uri, range) {
        return this.cache.find(uri, range);
    }
    reset() {
        this.cache.clear();
    }
    hookGetSegmentReference(stream) {
        stream.getSegmentReferenceOriginal = stream.getSegmentReference;
        stream.getSegmentReference = (segmentNumber) => {
            this.cache.add(stream, segmentNumber);
            return stream.getSegmentReferenceOriginal(segmentNumber);
        };
        stream.getPosition = () => {
            if (this.isHls()) {
                if (stream.type === "video") {
                    return this.manifest.periods[0].variants.reduce((a, i) => {
                        if (i.video && i.video.id && !a.includes(i.video.id)) {
                            a.push(i.video.id);
                        }
                        return a;
                    }, []).indexOf(stream.id);
                }
            }
            return -1;
        };
    }
} // end of ShakaManifestParserProxy
exports.ShakaManifestParserProxy = ShakaManifestParserProxy;
class ShakaDashManifestParserProxy extends ShakaManifestParserProxy {
    constructor() {
        super(new shaka.dash.DashParser());
    }
}
exports.ShakaDashManifestParserProxy = ShakaDashManifestParserProxy;
class ShakaHlsManifestParserProxy extends ShakaManifestParserProxy {
    constructor() {
        super(new shaka.hls.HlsParser());
    }
}
exports.ShakaHlsManifestParserProxy = ShakaHlsManifestParserProxy;
