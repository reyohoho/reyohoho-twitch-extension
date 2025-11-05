import settings from '../../settings.js';
import twitch from '../../utils/twitch.js';

export function getPlayerStatsDefinition() {
  return {
    button: false,
    order: 10,

    refresh() {
      return settings.get('playerStats') ? 1000 : false;
    },

    async setup() {
      const player = twitch.getCurrentPlayer();
      if (!player) return null;

      let stats = null;

      try {
        if (typeof player.getPlaybackStats === 'function') {
          stats = player.getPlaybackStats();
        } else if (typeof player.getVideoInfo === 'function') {
          const temp = player.getVideoInfo();
          stats = {
            bufferSize: temp.video_buffer_size,
            displayResolution: `${temp.vid_display_width}x${temp.vid_display_height}`,
            fps: temp.current_fps,
            hlsLatencyBroadcaster: temp.hls_latency_broadcaster / 1000,
            rate: typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1,
            playbackRate: temp.current_bitrate,
            skippedFrames: temp.dropped_frames,
            videoResolution: `${temp.vid_width}x${temp.vid_height}`,
          };
        } else {
          const videoHeight = typeof player.getVideoHeight === 'function' ? player.getVideoHeight() : 0;
          const videoWidth = typeof player.getVideoWidth === 'function' ? player.getVideoWidth() : 0;
          const displayHeight = typeof player.getDisplayHeight === 'function' ? player.getDisplayHeight() : 0;
          const displayWidth = typeof player.getDisplayWidth === 'function' ? player.getDisplayWidth() : 0;

          stats = {
            bufferSize: typeof player.getBufferDuration === 'function' ? player.getBufferDuration() : 0,
            displayResolution: `${displayWidth}x${displayHeight}`,
            videoResolution: `${videoWidth}x${videoHeight}`,
            fps: typeof player.getVideoFrameRate === 'function' ? Math.floor(player.getVideoFrameRate() || 0) : 0,
            hlsLatencyBroadcaster: typeof player.getLiveLatency === 'function' ? player.getLiveLatency() || 0 : 0,
            rate: typeof player.getPlaybackRate === 'function' ? player.getPlaybackRate() : 1,
            playbackRate: typeof player.getVideoBitRate === 'function' ? Math.floor((player.getVideoBitRate() || 0) / 1000) : 0,
            skippedFrames: typeof player.getDroppedFrames === 'function' ? player.getDroppedFrames() : 0,
          };
        }
      } catch (error) {
        console.error('Error getting player stats:', error);
        return null;
      }

      if (!stats || stats.hlsLatencyBroadcaster < -100) {
        return null;
      }

      const delay = stats.hlsLatencyBroadcaster;
      const old = delay > 180;
      const rate = stats.rate == null ? 1 : stats.rate;

      return {
        stats,
        delay,
        old,
        rate,
      };
    },

    label(data) {
      if (!data?.delay || data.old) return null;
      return `${data.delay.toFixed(2)}s`;
    },

    tooltip(data) {
      if (!data?.stats || !data?.delay) {
        return 'Stream Latency';
      }

      const {stats, rate} = data;
      const lines = [];

      if (rate && rate > 1) {
        lines.push(`Playing at ${rate.toFixed(2)}x speed to reduce delay.`);
        lines.push('');
      }

      lines.push('Stream Latency');

      if (stats.videoResolution && stats.fps) {
        lines.push(`Video: ${stats.videoResolution}@${stats.fps}fps`);
      } else if (stats.videoResolution) {
        lines.push(`Video: ${stats.videoResolution}`);
      }

      if (stats.playbackRate) {
        lines.push(`Playback Rate: ${stats.playbackRate} Kbps`);
      }

      if (stats.skippedFrames !== undefined) {
        lines.push(`Dropped Frames: ${stats.skippedFrames}`);
      }

      if (stats.bufferSize > 0) {
        lines.push(`Buffered: ${stats.bufferSize.toFixed(2)}s`);
      }

      return lines.join('\n');
    },

    color(data) {
      const warningThreshold = 10;
      const errorThreshold = 20;

      if (!data?.delay || data.old) return null;

      if (data.delay > errorThreshold) {
        return '#f9b6b6';
      }
      if (data.delay > warningThreshold) {
        return '#fcb896';
      }

      return null;
    },
  };
}

