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
const Debug = require("debug");
const manifest_parser_proxy_1 = require("./manifest-parser-proxy");
const utils_1 = require("./utils");
const debug = Debug("p2pml:shaka:index");
function initShakaPlayer(player, segmentManager) {
    registerParserProxies();
    initializeNetworkingEngine();
    let intervalId = 0;
    let lastPlayheadTimeReported = 0;
    player.addEventListener("loading", async () => {
        if (intervalId > 0) {
            clearInterval(intervalId);
            intervalId = 0;
        }
        lastPlayheadTimeReported = 0;
        const manifest = player.getManifest();
        if (manifest && manifest.p2pml) {
            manifest.p2pml.parser.reset();
        }
        await segmentManager.destroy();
        intervalId = setInterval(() => {
            const time = getPlayheadTime(player);
            if (time !== lastPlayheadTimeReported || player.isBuffering()) {
                segmentManager.setPlayheadTime(time);
                lastPlayheadTimeReported = time;
            }
        }, 500);
    });
    debug("register request filter");
    player.getNetworkingEngine().registerRequestFilter((requestType, request) => {
        request.p2pml = { player, segmentManager };
    });
}
exports.initShakaPlayer = initShakaPlayer;
function registerParserProxies() {
    debug("register parser proxies");
    shaka.media.ManifestParser.registerParserByExtension("mpd", manifest_parser_proxy_1.ShakaDashManifestParserProxy);
    shaka.media.ManifestParser.registerParserByMime("application/dash+xml", manifest_parser_proxy_1.ShakaDashManifestParserProxy);
    shaka.media.ManifestParser.registerParserByExtension("m3u8", manifest_parser_proxy_1.ShakaHlsManifestParserProxy);
    shaka.media.ManifestParser.registerParserByMime("application/x-mpegurl", manifest_parser_proxy_1.ShakaHlsManifestParserProxy);
    shaka.media.ManifestParser.registerParserByMime("application/vnd.apple.mpegurl", manifest_parser_proxy_1.ShakaHlsManifestParserProxy);
}
function initializeNetworkingEngine() {
    debug("init networking engine");
    shaka.net.NetworkingEngine.registerScheme("http", processNetworkRequest);
    shaka.net.NetworkingEngine.registerScheme("https", processNetworkRequest);
}
function processNetworkRequest(uri, request, requestType, progressUpdated) {
    if (!request.p2pml) {
        return shaka.net.HttpXHRPlugin(uri, request, requestType, progressUpdated);
    }
    const { player, segmentManager } = request.p2pml;
    let assetsStorage = segmentManager.getSettings().assetsStorage;
    let masterManifestUri;
    let masterSwarmId;
    if (assetsStorage !== undefined
        && player.getNetworkingEngine().p2pml !== undefined
        && player.getNetworkingEngine().p2pml.masterManifestUri !== undefined) {
        masterManifestUri = player.getNetworkingEngine().p2pml.masterManifestUri;
        masterSwarmId = utils_1.getMasterSwarmId(masterManifestUri, segmentManager.getSettings());
    }
    else {
        assetsStorage = undefined;
    }
    let segment;
    const manifest = player.getManifest();
    if (requestType === shaka.net.NetworkingEngine.RequestType.SEGMENT
        && manifest !== null
        && manifest.p2pml !== undefined
        && manifest.p2pml.parser !== undefined) {
        segment = manifest.p2pml.parser.find(uri, request.headers.Range);
    }
    if (segment !== undefined && segment.streamType === "video") { // load segment using P2P loader
        debug("request", "load", segment.identity);
        const promise = segmentManager.load(segment, utils_1.getSchemedUri(player.getAssetUri ? player.getAssetUri() : player.getManifestUri()), getPlayheadTime(player));
        const abort = async () => {
            debug("request", "abort", segment.identity);
            // TODO: implement abort in SegmentManager
        };
        return new shaka.util.AbortableOperation(promise, abort);
    }
    else if (assetsStorage) { // load or store the asset using assets storage
        const responsePromise = (async () => {
            const asset = await assetsStorage.getAsset(uri, request.headers.Range, masterSwarmId);
            if (asset !== undefined) {
                return {
                    data: asset.data,
                    uri: asset.responseUri,
                    fromCache: true
                };
            }
            else {
                const response = await shaka.net.HttpXHRPlugin(uri, request, requestType, progressUpdated).promise;
                assetsStorage.storeAsset({
                    masterManifestUri: masterManifestUri,
                    masterSwarmId: masterSwarmId,
                    requestUri: uri,
                    requestRange: request.headers.Range,
                    responseUri: response.uri,
                    data: response.data
                });
                return response;
            }
        })();
        return new shaka.util.AbortableOperation(responsePromise, async () => { });
    }
    else { // load asset using default plugin
        return shaka.net.HttpXHRPlugin(uri, request, requestType, progressUpdated);
    }
}
function getPlayheadTime(player) {
    let time = 0;
    const date = player.getPlayheadTimeAsDate();
    if (date) {
        time = date.valueOf();
        if (player.isLive()) {
            time -= player.getPresentationStartTimeAsDate().valueOf();
        }
        time /= 1000;
    }
    return time;
}
