/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react/self-closing-comp */
/* eslint-disable jsx-a11y/media-has-caption */
import React, { useMemo, useState, useCallback, useEffect, useRef, forwardRef, MutableRefObject } from 'react';
import { Storage } from 'aws-amplify';
import { useAtom } from 'jotai';
import Draggable from 'react-draggable';
import Hls from 'hls.js';
import TC, { FRAMERATE } from 'smpte-timecode';
import {
  MediaController,
  MediaControlBar,
  MediaTimeRange,
  MediaTimeDisplay,
  MediaVolumeRange,
  MediaPlayButton,
  MediaSeekBackwardButton,
  MediaSeekForwardButton,
  MediaMuteButton,
  MediaPipButton,
  MediaPlaybackRateButton,
} from 'media-chrome/dist/react';
import axios from 'axios';
import { createWorker } from 'tesseract.js';

import { playerPositionAtom, darkModeAtom, showFullTimecodeAtom, ocrTimecodeAtom } from '../atoms';

interface PlayerProps {
  audioKey: string | null;
  playing: boolean;
  play: () => void;
  pause: () => void;
  setTime: (time: number) => void;
  seekTo: MutableRefObject<(time: number) => void>;
  aspectRatio: string;
  frameRate: number;
  offset: string;
  pollForVideo: boolean;
}

const Player = forwardRef<HTMLMediaElement | HTMLVideoElement | any, PlayerProps>(
  (
    {
      audioKey,
      playing,
      play,
      pause,
      setTime,
      seekTo,
      aspectRatio = '16/9',
      frameRate = 25,
      offset,
      pollForVideo = false,
    }: PlayerProps,
    ref,
  ): JSX.Element | null => {
    const [darkMode] = useAtom(darkModeAtom);
    const [showFullTimecode] = useAtom(showFullTimecodeAtom);
    const [position, setPosition] = useAtom(playerPositionAtom);
    const [ocrTimecode, setOcrTimecode] = useAtom(ocrTimecodeAtom);

    const [pip, setPip] = useState<boolean>(false);
    const [duration, setDuration] = useState<number>(0);
    const [currentTime, setCurrentTime] = useState<number>(0);

    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioHLSUrl, setAudioHLSUrl] = useState<string | null>(null);
    const [videoHLSUrl, setVideoHLSUrl] = useState<string | null | undefined>();

    // const videoHLSUrlRef = useRef<string | null | undefined>();
    useEffect(() => {
      // eslint-disable-next-line no-unused-expressions
      audioKey &&
        (async () => {
          const signedAudioUrl = await Storage.get(audioKey.replace('public/', ''), {
            download: false,
            expires: 36000,
          });
          setAudioUrl(signedAudioUrl);

          let audioUrl;
          try {
            const audioM3U8Key = audioKey
              .replace('public/media/audio', 'media/hls')
              .replace('-transcoded.m4a', '-audio.m3u8');

            const signedAudioM3U8Url = await Storage.get(audioM3U8Key, {
              download: false,
              expires: 36000,
            });

            const { data: audioM3U8 } = await axios.get(signedAudioM3U8Url);
            const folder = audioM3U8Key.split('/').slice(0, -1).join('/');
            // console.log('audioM3U8', audioM3U8);

            const signedAudioM3U8 = (
              await Promise.all(
                audioM3U8.split('\n').map(async (line: string) => {
                  if (line.startsWith('#') || line.length === 0) return line;
                  return Storage.get(`${folder}/${line.trim()}`, {
                    download: false,
                    expires: 36000,
                  });
                }),
              )
            ).join('\n');
            // console.log('signedAudioM3U8', signedAudioM3U8);
            const segments = audioM3U8.split('\n').filter((line: string) => !line.startsWith('#')).length;
            // console.log(
            //   'segments',
            //   segments,
            //   audioM3U8,
            //   audioM3U8.split('\n').filter((line: string) => !line.startsWith('#')),
            // );

            const audioBlob = new Blob([signedAudioM3U8], { type: 'application/x-mpegURL' });
            audioUrl = URL.createObjectURL(audioBlob);
            if (segments > 3) setAudioHLSUrl(audioUrl);
            // eslint-disable-next-line no-empty
          } catch (ignored) {}

          let videoUrl;
          try {
            const videoM3U8Key = audioKey
              .replace('public/media/audio', 'media/hls')
              .replace('-transcoded.m4a', '-video_1.m3u8');

            const signedVideoM3U8Url = await Storage.get(videoM3U8Key, {
              download: false,
              expires: 36000,
            });

            const { data: videoM3U8 } = await axios.get(signedVideoM3U8Url);
            const folder = videoM3U8Key.split('/').slice(0, -1).join('/');

            const signedVideoM3U8 = (
              await Promise.all(
                videoM3U8.split('\n').map(async (line: string) => {
                  if (line.startsWith('#') || line.length === 0) return line;
                  return Storage.get(`${folder}/${line.trim()}`, {
                    download: false,
                    expires: 36000,
                  });
                }),
              )
            ).join('\n');
            const segments = videoM3U8.split('\n').filter((line: string) => !line.startsWith('#')).length;

            const videoBlob = new Blob([signedVideoM3U8], { type: 'application/x-mpegURL' });
            videoUrl = URL.createObjectURL(videoBlob);
            if (segments > 3) setVideoHLSUrl(videoUrl);
            // eslint-disable-next-line no-empty
          } catch (ignored) {}

          // console.log({ videoUrl, audioUrl, signedAudioUrl });
        })();
    }, [audioKey]);

    const testForVideoRef = useRef<any>(null);

    useEffect(() => {
      if (!audioKey) return;
      if (videoHLSUrl) {
        clearInterval(testForVideoRef.current);
        return;
      }

      const testVideoUrl = async (): Promise<void> => {
        let videoUrl;
        try {
          const videoM3U8Key = audioKey
            .replace('public/media/audio', 'media/hls')
            .replace('-transcoded.m4a', '-video_1.m3u8');

          const signedVideoM3U8Url = await Storage.get(videoM3U8Key, {
            download: false,
            expires: 36000,
          });

          const { data: videoM3U8 } = await axios.get(signedVideoM3U8Url);
          const folder = videoM3U8Key.split('/').slice(0, -1).join('/');

          const signedVideoM3U8 = (
            await Promise.all(
              videoM3U8.split('\n').map(async (line: string) => {
                if (line.startsWith('#') || line.length === 0) return line;
                return Storage.get(`${folder}/${line.trim()}`, {
                  download: false,
                  expires: 36000,
                });
              }),
            )
          ).join('\n');
          const segments = videoM3U8.split('\n').filter((line: string) => !line.startsWith('#')).length;

          const videoBlob = new Blob([signedVideoM3U8], { type: 'application/x-mpegURL' });
          videoUrl = URL.createObjectURL(videoBlob);
          if (segments > 3 && !videoHLSUrl) setVideoHLSUrl(videoUrl);
          // eslint-disable-next-line no-empty
        } catch (ignored) {}
      };

      clearInterval(testForVideoRef.current);
      testForVideoRef.current = setInterval(testVideoUrl, 5000);
    }, [videoHLSUrl, pollForVideo, audioKey]);

    const handleDragStop = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (e: any, data: any) => {
        const { x, y } = data;
        // setPosition({ x, y });
        setPosition({ x: (x * 100) / window.innerWidth, y: (y * 100) / window.innerHeight });
      },
      [setPosition],
    );

    useEffect(() => {
      if (position.x > 80) setPosition({ x: 2, y: 12 });
      if (position.y > 80) setPosition({ x: 2, y: 12 });
    }, [position, setPosition]);

    // const config = useMemo(
    //   () => ({
    //     forceAudio: !videoHLSUrl,
    //     forceVideo: videoHLSUrl,
    //     forceHLS: audioHLSUrl || videoHLSUrl,
    //     file: {
    //       attributes: {
    //         // poster: 'https://via.placeholder.com/720x576.png?text=4:3',
    //         controlsList: 'nodownload',
    //       },
    //     },
    //   }),
    //   [audioHLSUrl, videoHLSUrl],
    // );

    // const onDuration = useCallback((duration: number) => {
    //   console.log({ duration });
    // }, []);

    const url = useMemo(() => videoHLSUrl ?? audioHLSUrl ?? audioUrl, [audioHLSUrl, audioUrl, videoHLSUrl]);
    const audio = useMemo(() => !videoHLSUrl, [videoHLSUrl]);

    const mediaRef = useRef<HTMLMediaElement | HTMLVideoElement>() as any; // MutableRefObject<HTMLMediaElement>;
    // const audioRef = useRef<HTMLAudioElement>() as MutableRefObject<HTMLAudioElement>;
    // const videoRef = useRef<HTMLVideoElement>() as MutableRefObject<HTMLVideoElement>;

    useEffect(() => {
      if (!mediaRef.current) return;
      if (!videoHLSUrl && !audioHLSUrl) {
        mediaRef.current.src = audioUrl;
        return;
      }

      // if (!Hls.isSupported()) return;
      const hls = new Hls();
      if (audio) {
        hls.loadSource(audioHLSUrl ?? videoHLSUrl ?? audioUrl ?? '');
      } else {
        hls.loadSource(videoHLSUrl ?? audioHLSUrl ?? audioUrl ?? ''); // TODO empty video url
      }
      if (mediaRef) hls.attachMedia((mediaRef as any).current);
    }, [mediaRef, videoHLSUrl, audioHLSUrl, audioUrl, audio]);

    useEffect(() => {
      if (!mediaRef.current) return;

      if (playing) {
        (mediaRef as any).current.play();
      } else {
        (mediaRef as any).current.pause();
      }
    }, [mediaRef.current, playing]);

    const getCurrentFrame = useCallback(() => {
      if (!mediaRef.current) return null;
      const mediaEl = (mediaRef as any).current;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = mediaEl.videoWidth;
        canvas.height = mediaEl.videoHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;
        ctx.drawImage(mediaEl, 0, 0, canvas.width, canvas.height);
        const frame = canvas.toDataURL();

        console.log('frame', frame);
        return frame;
      } catch (error) {
        return null;
      }
    }, []);

    const getCurrentTimecode = useCallback(async () => {
      try {
        const frame = getCurrentFrame();
        if (!frame) return null;

        const worker = await createWorker('eng');
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789:;.',
        });
        const { data } = await worker.recognize(frame);
        console.log({ data });
        await worker.terminate();

        const match = data.text
          .match(/\b([0-1]\d|2[0-3])[:;]([0-5]\d)[:;]([0-5]\d)[:;]([0-5]\d)\b/)?.[0]
          ?.replaceAll(';', ':');
        return match; // TC(match, frameRate as FRAMERATE).toString();
      } catch (error) {
        return null;
      }
    }, [getCurrentFrame]);

    useEffect(() => {
      if (!mediaRef.current) return;

      const mediaEl = (mediaRef as any).current;

      mediaEl.addEventListener('loadeddata', async () => {
        if (mediaEl.currentTime > 0) return;
        const timecode = await getCurrentTimecode();
        console.log('timecode', timecode);
        setOcrTimecode(timecode);
      });

      mediaEl.addEventListener('play', () => play());
      mediaEl.addEventListener('pause', () => pause());
      mediaEl.addEventListener('timeupdate', () => {
        // console.log('timeupdate');
        setTime(mediaEl.currentTime);
        setCurrentTime(mediaEl.currentTime);
      });
      mediaEl.addEventListener('durationchange', () => setDuration(mediaEl.duration));
      mediaEl.addEventListener('enterpictureinpicture', () => setPip(true));
      mediaEl.addEventListener('leavepictureinpicture', () => setPip(false));

      // eslint-disable-next-line no-param-reassign
      seekTo.current = (time: number) => {
        mediaEl.currentTime = time;
      };
    }, [mediaRef.current, play, pause, setTime, seekTo]);

    const [width, setWidth] = useState(300);
    // eslint-disable-next-line no-eval
    // const [height, setHeight] = useState(300 / eval(aspectRatio));
    // eslint-disable-next-line no-eval
    const height = useMemo(() => width / eval(aspectRatio), [width, aspectRatio]);

    // const containerRef = useRef<HTMLDivElement>() as MutableRefObject<HTMLDivElement>;
    // useEffect(() => {
    //   if (!containerRef.current) return;
    //   // get container size
    //   const { width, height } = containerRef.current.getBoundingClientRect();
    //   setWidth(width);
    //   setHeight(height);
    // }, [containerRef.current]);

    const defaultPosition = useMemo(() => {
      const { x, y } = position;
      return { x: (x * window.innerWidth) / 100, y: (y * window.innerHeight) / 100 };
    }, [position]);

    return url ? (
      <>
        <div
          style={{
            position: 'fixed',
            top: 0,
            height: 0,
            zIndex: 999,
            display: audio || pip ? 'none' : 'block',
            // outline: '10px solid red',
          }}>
          <Draggable defaultPosition={defaultPosition} onStop={handleDragStop} handle=".handle">
            <div
              // ref={containerRef}
              className="handle"
              // onClick={e => {
              //   e.stopPropagation();
              //   e.preventDefault();
              // }}
              style={{
                width: '300px',
                backgroundColor: audio && !darkMode ? 'white' : 'black',
                // padding: '6px',
                zIndex: 999,
                boxShadow: '0 0 15px gray',
                aspectRatio: audio ? '16/3' : aspectRatio,
                cursor: 'move',
              }}>
              <MediaController
                id="controller"
                style={{
                  width: '100%',
                  height: '100%',
                  aspectRatio: audio ? '16/3' : aspectRatio,
                  pointerEvents: 'none',
                }}>
                <video slot="media" ref={mediaRef} style={{ width, height, aspectRatio: audio ? '16/3' : aspectRatio }}>
                  {/* <track label="English" kind="captions" srclang="en" src="./vtt/en-cc.vtt" /> */}
                  {/* <track
                        label="thumbnails"
                        default
                        kind="metadata"
                        src="https://image.mux.com/A3VXy02VoUinw01pwyomEO3bHnG4P32xzV7u1j1FSzjNg/storyboard.vtt"
                      /> */}
                </video>
                <MediaControlBar mediaController="controller">
                  <MediaPlayButton />
                  <MediaSeekBackwardButton seek-offset="5" />
                  <MediaSeekBackwardButton seek-offset={1 / frameRate}>
                    <svg slot="backward" aria-hidden="true" viewBox="0 0 20 24">
                      <defs>
                        <style>{`.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}`}</style>
                      </defs>
                      <text className="text value" transform="translate(2.18 19.87)">
                        F
                      </text>
                      <path d="M10 6V3L4.37 7 10 10.94V8a5.54 5.54 0 0 1 1.9 10.48v2.12A7.5 7.5 0 0 0 10 6Z"></path>
                    </svg>
                  </MediaSeekBackwardButton>
                  <MediaSeekForwardButton seek-offset={1 / frameRate}>
                    <svg slot="forward" aria-hidden="true" viewBox="0 0 20 24">
                      <defs>
                        <style>{`.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}`}</style>
                      </defs>
                      <text className="text value" transform="translate(8.9 19.87)">
                        F
                      </text>
                      <path d="M10 6V3l5.61 4L10 10.94V8a5.54 5.54 0 0 0-1.9 10.48v2.12A7.5 7.5 0 0 1 10 6Z"></path>
                    </svg>
                  </MediaSeekForwardButton>
                  <MediaSeekForwardButton seek-offset="5" />
                  <span className="tc">
                    {timecode({ seconds: currentTime, partialTimecode: !showFullTimecode, frameRate, offset })}
                  </span>
                </MediaControlBar>

                {/* <ReactPlayer
                  slot="media"
                  key={url}
                  controls
                  {...{ ref, url, config, playing, onDuration, onProgress }}
                  onPlay={play}
                  onPause={pause}
                  progressInterval={100}
                  width="100%"
                  height="100%"
                /> */}
              </MediaController>
            </div>
          </Draggable>
          <style scoped>
            {`
            audio {
              background-color: ${darkMode ? 'black' : 'white'};
            }
          `}
          </style>
        </div>
        <MediaControlBar mediaController="controller" style={{ width: '100%' }}>
          <MediaPlayButton />
          <MediaSeekBackwardButton seek-offset="5" />
          <MediaSeekBackwardButton seek-offset={1 / frameRate}>
            <svg slot="backward" aria-hidden="true" viewBox="0 0 20 24">
              <defs>
                <style>{`.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}`}</style>
              </defs>
              <text className="text value" transform="translate(2.18 19.87)">
                F
              </text>
              <path d="M10 6V3L4.37 7 10 10.94V8a5.54 5.54 0 0 1 1.9 10.48v2.12A7.5 7.5 0 0 0 10 6Z"></path>
            </svg>
          </MediaSeekBackwardButton>
          <MediaSeekForwardButton seek-offset={1 / frameRate}>
            <svg slot="forward" aria-hidden="true" viewBox="0 0 20 24">
              <defs>
                <style>{`.text{font-size:8px;font-family:Arial-BoldMT, Arial;font-weight:700;}`}</style>
              </defs>
              <text className="text value" transform="translate(8.9 19.87)">
                F
              </text>
              <path d="M10 6V3l5.61 4L10 10.94V8a5.54 5.54 0 0 0-1.9 10.48v2.12A7.5 7.5 0 0 1 10 6Z"></path>
            </svg>
          </MediaSeekForwardButton>
          <MediaSeekForwardButton seek-offset="5" />
          <span className="tc">
            {timecode({ seconds: currentTime, partialTimecode: !showFullTimecode, frameRate, offset })}
          </span>
          <MediaTimeRange />
          {/* <MediaTimeDisplay showDuration /> */}
          <span className="tc">
            {timecode({ seconds: duration, partialTimecode: !showFullTimecode, frameRate, offset })}
          </span>
          <MediaPlaybackRateButton />
          <MediaVolumeRange />
          <MediaPipButton />
        </MediaControlBar>
        <style>
          {`span.tc {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            vertical-align: middle;
            box-sizing: border-box;
            background: var(--media-control-background, rgba(20,20,30, 0.7));

            padding: var(--media-control-padding, 10px);

            font-size: 14px;
            line-height: var(--media-text-content-height, var(--media-control-height, 24px));
            /* font-family: Arial, sans-serif; */
            text-align: center;
            color: #ffffff;
            pointer-events: auto;
          }`}
        </style>
      </>
    ) : null;
  },
);

const timecode = ({
  seconds = 0,
  frameRate = 1000,
  dropFrame,
  partialTimecode = false,
  offset = 0,
}: {
  seconds: number;
  frameRate: FRAMERATE | number;
  dropFrame?: boolean;
  partialTimecode: boolean;
  offset: number | string;
}): string => {
  let tc = TC(seconds * frameRate, frameRate as FRAMERATE, dropFrame).toString();

  try {
    tc = TC(seconds * frameRate, frameRate as FRAMERATE, dropFrame)
      .add(new TC(offset, frameRate as FRAMERATE, dropFrame))
      .toString();
  } catch (error) {
    console.log('offset', error);
  }

  // hh:mm:ss
  if (partialTimecode) return tc.split(':').slice(0, 3).join(':');

  // hh:mm:ss.mmmm
  if (frameRate === 1000) {
    const [hh, mm, ss, mmm] = tc.split(':');
    if (mmm.length === 1) return `${hh}:${mm}:${ss}.${mmm}00`;
    if (mmm.length === 2) return `${hh}:${mm}:${ss}.${mmm}0`;
    return `${hh}:${mm}:${ss}.${mmm}`;
  }

  return tc;
};

export default Player;
