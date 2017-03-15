/**
 * @file source-updater.js
 */
import videojs from 'video.js';

const MAX_BUFFERED_SECONDS = 60; // for an 8mbit stream (eg. well encoded full HD quality)
                                       // that would be about 60Mbytes

/**
 * A queue of callbacks to be serialized and applied when a
 * MediaSource and its associated SourceBuffers are not in the
 * updating state. It is used by the segment loader to update the
 * underlying SourceBuffers when new data is loaded, for instance.
 *
 * @class SourceUpdater
 * @param {MediaSource} mediaSource the MediaSource to create the
 * SourceBuffer from
 * @param {String} mimeType the desired MIME type of the underlying
 * SourceBuffer
 */
export default class SourceUpdater {
  static get MAX_BUFFERED_SECONDS() {
    return MAX_BUFFERED_SECONDS;
  }

  constructor(mediaSource, mimeType) {
    let createSourceBuffer = () => {
      this.sourceBuffer_ = mediaSource.addSourceBuffer(mimeType);

      // run completion handlers and process callbacks as updateend
      // events fire
      this.onUpdateendCallback_ = () => {
        let pendingCallback = this.pendingCallback_;

        this.pendingCallback_ = null;

        if (pendingCallback) {
          pendingCallback();
        }

        this.runCallback_();
      };

      this.sourceBuffer_.addEventListener('updateend', this.onUpdateendCallback_);

      this.runCallback_();
    };

    this.callbacks_ = [];
    this.pendingCallback_ = null;
    this.timestampOffset_ = 0;
    this.mediaSource = mediaSource;

    if (mediaSource.readyState === 'closed') {
      mediaSource.addEventListener('sourceopen', createSourceBuffer);
    } else {
      createSourceBuffer();
    }
  }

  /**
   * Aborts the current segment and resets the segment parser.
   *
   * @param {Function} done function to call when done
   * @see http://w3c.github.io/media-source/#widl-SourceBuffer-abort-void
   */
  abort(done) {
    this.queueCallback_(() => {
      this.sourceBuffer_.abort();
    }, done);
  }

  /**
   * Queue an update to append an ArrayBuffer.
   *
   * @param {ArrayBuffer} bytes
   * @param {Function} done the function to call when done
   * @see http://www.w3.org/TR/media-source/#widl-SourceBuffer-appendBuffer-void-ArrayBuffer-data
   */
  appendBuffer(bytes, done) {
    this.queueCallback_(() => {
      this.sourceBuffer_.appendBuffer(bytes);
    }, done);
  }

  /**
   * Indicates what TimeRanges are buffered in the managed SourceBuffer.
   *
   * @see http://www.w3.org/TR/media-source/#widl-SourceBuffer-buffered
   */
  buffered() {
    if (!this.sourceBuffer_) {
      return videojs.createTimeRanges();
    }
    return this.sourceBuffer_.buffered;
  }

  totalBufferedTime() {
    let bufferedTime = 0;
    let buffered = this.buffered();
    if (buffered.length) {
      bufferedTime = buffered.end(buffered.length - 1) - buffered.start(buffered.length - 1);
    }
    return bufferedTime;
  }

  /**
   * Queue an update to set the duration.
   *
   * @param {Double} duration what to set the duration to
   * @see http://www.w3.org/TR/media-source/#widl-MediaSource-duration
   */
  duration(duration) {
    this.queueCallback_(() => {
      this.sourceBuffer_.duration = duration;
    });
  }

  /**
   * Queue an update to remove a time range from the buffer.
   *
   * @param {Number} start where to start the removal
   * @param {Number} end where to end the removal
   * @see http://www.w3.org/TR/media-source/#widl-SourceBuffer-remove-void-double-start-unrestricted-double-end
   */
  remove(start, end) {
    this.queueCallback_(() => {
      this.sourceBuffer_.remove(start, end);
    }, null, true);
  }

  /**
   * wether the underlying sourceBuffer is updating or not
   *
   * @return {Boolean} the updating status of the SourceBuffer
   */
  updating() {
    return !this.sourceBuffer_ || this.sourceBuffer_.updating;
  }

  /**
   * Set/get the timestampoffset on the SourceBuffer
   *
   * @return {Number} the timestamp offset
   */
  timestampOffset(offset) {
    if (typeof offset !== 'undefined') {
      this.queueCallback_(() => {
        this.sourceBuffer_.timestampOffset = offset;
      });
      this.timestampOffset_ = offset;
    }
    return this.timestampOffset_;
  }

  flush() {
    this.callbacks_ = [];
  }

  /**
   * que a callback to run
   */
  queueCallback_(callback, done, removal = false) {
    this.callbacks_.push([callback.bind(this), done, removal]);
    this.runCallback_();
  }

  /**
   * run a queued callback
   */
  runCallback_() {
    let callbacks;

    if (!this.callbacks_.length) {
      // rest of the function relies on callback enqueued
      return;
    }

    let totalBufferedTime = this.totalBufferedTime();

    if (totalBufferedTime > MAX_BUFFERED_SECONDS) {
      callbacks = this.callbacks_[this.callbacks_.length - 1];
      // run callback-callback ;) indicate we're done to outer world
      let pendingCallback = callbacks[1];
      // clear it
      callbacks[1] = null;
      // run it
      if (pendingCallback) {
        pendingCallback();
      }

      // unjam things: if we can remove stuff try to do that first so we can append things again

      // find first removal callback in queue and remove it from there
      callbacks = this.callbacks_.slice(0).find((cb, index) => {
        // removal flag on queue item -> we should remove it
        return !!(cb[2] && this.callbacks_.splice(index, 1));
      });
                                // since we are currently exceeding limits in buffer
                                // pretty safe to assume sourcebuffer exists?
                                // but we could have removed it in previous "done" callback
      if (callbacks !== undefined
        && this.sourceBuffer_   
        && !this.sourceBuffer_.updating) {
        console.warn('unjaming SourceBuffer task queue by prioritizing removals');
        this.pendingCallback_ = callbacks[1];
        callbacks[0]();
      }

    } else if (this.sourceBuffer_ &&
        !this.sourceBuffer_.updating) {
      callbacks = this.callbacks_.shift();
      this.pendingCallback_ = callbacks[1];
      callbacks[0]();
    }
  }

  /**
   * dispose of the source updater and the underlying sourceBuffer
   */
  dispose() {
    this.sourceBuffer_.removeEventListener('updateend', this.onUpdateendCallback_);
    if (this.sourceBuffer_ && this.mediaSource.readyState === 'open') {
      this.sourceBuffer_.abort();
    }
  }
}
