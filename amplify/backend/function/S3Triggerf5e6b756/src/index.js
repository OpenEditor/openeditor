/* Amplify Params - DO NOT EDIT
	API_OPENEDITOR_GRAPHQLAPIENDPOINTOUTPUT
	API_OPENEDITOR_GRAPHQLAPIIDOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */
/* eslint-disable */
import consumers from 'stream/consumers';
import crypto from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { HttpRequest } from '@aws-sdk/protocol-http';
import {
  MediaConvertClient,
  DescribeEndpointsCommand,
  CreateJobCommand,
  GetJobCommand,
} from '@aws-sdk/client-mediaconvert';
import { TranscribeClient, StartTranscriptionJobCommand } from '@aws-sdk/client-transcribe';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3, S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { default as fetch, Request } from 'node-fetch';
import { nanoid } from 'nanoid';
import pako from 'pako';
import ffprobe from 'ffprobe';
import * as cldrSegmentation from 'cldr-segmentation';
import MiniSearch from 'minisearch';

import stream from 'stream';
import JSONStream from 'JSONStream';
import Deferred from 'deferential';
import bl from 'bl';
import { spawn } from 'child_process';

const { Sha256 } = crypto;

const GRAPHQL_ENDPOINT = process.env.API_OPENEDITOR_GRAPHQLAPIENDPOINTOUTPUT;
const GRAPHQL_API_KEY = process.env.API_OPENEDITOR_GRAPHQLAPIIDOUTPUT;
const MEDIACONVERT_ROLE = process.env.MEDIACONVERT_ROLE;
const REGION = process.env.REGION || process.env.AWS_REGION || 'us-east-1';

// const s3client = new S3Client({ region: REGION });
const s3 = new S3({ region: REGION });

const transcriptQuery = /* GraphQL */ `
  query transcriptQuery($uuid: ID!) {
    getTranscript(id: $uuid) {
      _deleted
      _lastChangedAt
      _version
      createdAt
      id
      language
      media
      metadata
      owner
      parent
      status
      title
      updatedAt
    }
  }
`;

const transcriptMutation = /* GraphQL */ `
  mutation transcriptMutation($input: UpdateTranscriptInput!) {
    updateTranscript(input: $input) {
      _deleted
      _lastChangedAt
      _version
      createdAt
      id
      language
      media
      metadata
      owner
      parent
      status
      title
      updatedAt
    }
  }
`;

// https://docs.amplify.aws/lib/graphqlapi/graphql-from-nodejs/q/platform/js/#iam-authorization
const graphqlRequest = async ({ query, variables }) => {
  const endpoint = new URL(GRAPHQL_ENDPOINT);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: REGION,
    service: 'appsync',
    sha256: Sha256,
  });

  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.host,
    },
    hostname: endpoint.host,
    body: JSON.stringify({ query, variables }),
    path: endpoint.pathname,
  });

  const signed = await signer.sign(requestToBeSigned);
  const request = new Request(endpoint, signed);

  let statusCode = 200;
  let body;
  let response;

  try {
    response = await fetch(request);
    body = await response.json();
    if (body.errors) statusCode = 400;
  } catch (error) {
    statusCode = 500;
    body = {
      errors: [
        {
          message: error.message,
        },
      ],
    };
  }

  // return {
  //   statusCode,
  //   body: JSON.stringify(body),
  // };
  return body;
};

export const handler = async function (event) {
  console.log('Received S3 event:', JSON.stringify(event, null, 2));

  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;

  // UPLOAD
  // TODO check for media type extensions?
  if (key.startsWith('public/uploads/') && !key.endsWith('.json')) {
    const [, uuid] = key.split('/').reverse();
    const folder = key.split('/').slice(0, -1).join('/');

    let remoteUrl;
    if (key.endsWith('.url')) {
      const { Body: stream } = await s3.getObject({
        Bucket: bucket,
        Key: key,
      });

      remoteUrl = await consumers.text(stream);
    }

    const {
      data: { getTranscript: transcript },
    } = await graphqlRequest({ query: transcriptQuery, variables: { uuid } });

    const status = JSON.parse(transcript.status);
    const metadata = JSON.parse(transcript.metadata);

    // UPLOAD status
    const uploadIndex = status.steps.findIndex(step => step.type === 'upload');
    if (!status.steps[uploadIndex].data) status.steps[uploadIndex].data = {};
    status.steps[uploadIndex].data.s3 = event.Records[0].s3.object;
    // status.steps[uploadIndex].timeStamp = new Date().toISOString();

    // FFPROBE
    let isVideo = false;
    let audioStreamsCount = 0;
    let audioStreamsIndexes = [];
    let offset;
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const url = remoteUrl ?? (await getSignedUrl(s3, command, { expiresIn: 3600 }));

      const probe = await ffprobe2(url, { path: '/opt/ffprobe' });
      status.steps[uploadIndex].data.ffprobe = probe;

      isVideo = probe.streams.some(stream => stream.codec_type === 'video');
      audioStreamsCount = probe.streams.filter(stream => stream.codec_type === 'audio').length;
      audioStreamsIndexes = probe.streams
        .map((stream, i) => (stream.codec_type === 'audio' ? i : null))
        .filter(i => i !== null);

      metadata.isVideo = isVideo;
      metadata.audioStreamsCount = audioStreamsCount;
      metadata.audioStreamsIndexes = audioStreamsIndexes;

      if (probe.stderr) {
        const match = probe.stderr.match(/\b([0-1]\d|2[0-3]):([0-5]\d):([0-5]\d)[:;]([0-5]\d)\b/);
        if (match && match[0]) {
          offset = match[0];
          metadata.offset = offset;
        }
      }

      await s3.putObject({
        Bucket: bucket,
        Key: `${folder}/${uuid}-ffprobe.json`,
        Body: Buffer.from(JSON.stringify(probe)),
        ContentType: 'application/json',
      });
    } catch (ignored) {}

    // TRANSCODE
    const transcodeIndex = status.steps.findIndex(step => step.type === 'transcode');
    if (!status.steps[transcodeIndex].data) status.steps[transcodeIndex].data = {};
    // TODO skip if transcode not next?
    status.step = transcodeIndex;
    status.steps[transcodeIndex].status = 'wait';
    // status.steps[transcodeIndex].timeStamp = new Date().toISOString();
    try {
      let describeEndpointsCommandOutput;
      try {
        const { Body: stream } = await s3.getObject({
          Bucket: bucket,
          Key: `cache/describeEndpointsCommandOutput.json`,
        });
        describeEndpointsCommandOutput = JSON.parse(await consumers.text(stream));
      } catch (ignored) {}

      let mediaConvertClient = new MediaConvertClient({ region: REGION });
      try {
        const describeEndpointsCommand = new DescribeEndpointsCommand({ Mode: 'DEFAULT' });
        describeEndpointsCommandOutput = await mediaConvertClient.send(describeEndpointsCommand);

        await s3.putObject({
          Bucket: bucket,
          Key: `cache/describeEndpointsCommandOutput.json`,
          Body: Buffer.from(JSON.stringify(describeEndpointsCommandOutput)),
          ContentType: 'application/json',
        });
      } catch (ignored) {} // using cached endpoint

      mediaConvertClient = new MediaConvertClient({
        endpoint: describeEndpointsCommandOutput.Endpoints[0].Url,
        region: REGION,
      });

      const jobM4A = {
        Role: MEDIACONVERT_ROLE,
        Settings: {
          OutputGroups: [
            {
              CustomName: 'Audio',
              Name: 'File Group',
              Outputs: [
                {
                  ContainerSettings: {
                    Container: 'MP4',
                    Mp4Settings: {
                      CslgAtom: 'INCLUDE',
                      FreeSpaceBox: 'EXCLUDE',
                      MoovPlacement: 'PROGRESSIVE_DOWNLOAD',
                    },
                  },
                  AudioDescriptions: [
                    {
                      AudioTypeControl: 'FOLLOW_INPUT',
                      AudioSourceName: 'Audio Selector 1',
                      CodecSettings: {
                        Codec: 'AAC',
                        AacSettings: {
                          AudioDescriptionBroadcasterMix: 'NORMAL',
                          Bitrate: 96000,
                          RateControlMode: 'CBR',
                          CodecProfile: 'LC',
                          CodingMode: 'CODING_MODE_2_0',
                          RawFormat: 'NONE',
                          SampleRate: 48000,
                          Specification: 'MPEG4',
                        },
                      },
                      LanguageCodeControl: 'FOLLOW_INPUT',
                    },
                  ],
                  Extension: 'm4a',
                  NameModifier: '-transcoded', // TODO we might not need it
                },
              ],
              OutputGroupSettings: {
                Type: 'FILE_GROUP_SETTINGS',
                FileGroupSettings: {
                  Destination: `s3://${bucket}/public/media/audio/${uuid}/`,
                },
              },
            },
          ],
          AdAvailOffset: 0,
          Inputs: [
            {
              AudioSelectors: {
                'Audio Selector 1': {
                  Offset: 0,
                  DefaultSelection: 'DEFAULT',
                  ProgramSelection: 1,
                },
              },
              FilterEnable: 'AUTO',
              PsiControl: 'USE_PSI',
              FilterStrength: 0,
              DeblockFilter: 'DISABLED',
              DenoiseFilter: 'DISABLED',
              TimecodeSource: 'ZEROBASED', // TODO EMBEDDED if ffprobe?
              FileInput: remoteUrl ?? `s3://${bucket}/${key}`,
            },
          ],
        },
      };

      if (audioStreamsCount > 1) {
        jobM4A.Settings.Inputs[0].AudioSelectors['Audio Selector 1'].SelectorType = 'TRACK';
        jobM4A.Settings.Inputs[0].AudioSelectors['Audio Selector 1'].Tracks = audioStreamsIndexes;
      }

      const jobHLS = {
        Role: MEDIACONVERT_ROLE,
        Settings: {
          OutputGroups: [
            {
              CustomName: 'HLS',
              Name: 'Apple HLS',
              Outputs: [
                {
                  ContainerSettings: {
                    Container: 'M3U8',
                    M3u8Settings: {},
                  },
                  AudioDescriptions: [
                    {
                      AudioSourceName: 'Audio Selector 1',
                      CodecSettings: {
                        Codec: 'AAC',
                        AacSettings: {
                          Bitrate: 96000,
                          RateControlMode: 'CBR',
                          CodingMode: 'CODING_MODE_2_0',
                          SampleRate: 48000,
                        },
                      },
                    },
                  ],
                  OutputSettings: {
                    HlsSettings: {},
                  },
                  NameModifier: '-audio',
                },
              ],
              OutputGroupSettings: {
                Type: 'HLS_GROUP_SETTINGS',
                HlsGroupSettings: {
                  SegmentLength: 10,
                  Destination: `s3://${bucket}/public/media/hls/${uuid}/`,
                  MinSegmentLength: 0,
                  DirectoryStructure: 'SINGLE_DIRECTORY',
                },
              },
              AutomatedEncodingSettings: {
                AbrSettings: {
                  MaxRenditions: 3,
                },
              },
            },
          ],
          AdAvailOffset: 0,
          Inputs: [
            {
              AudioSelectors: {
                'Audio Selector 1': {
                  Offset: 0,
                  DefaultSelection: 'DEFAULT',
                  ProgramSelection: 1,
                },
              },
              VideoSelector: {},
              FilterEnable: 'AUTO',
              PsiControl: 'USE_PSI',
              FilterStrength: 0,
              DeblockFilter: 'DISABLED',
              DenoiseFilter: 'DISABLED',
              TimecodeSource: 'ZEROBASED', // TODO EMBEDDED if ffprobe?
              FileInput: remoteUrl ?? `s3://${bucket}/${key}`,
            },
          ],
        },
      };

      if (audioStreamsCount > 1) {
        jobHLS.Settings.Inputs[0].AudioSelectors['Audio Selector 1'].SelectorType = 'TRACK';
        jobHLS.Settings.Inputs[0].AudioSelectors['Audio Selector 1'].Tracks = audioStreamsIndexes;
      }

      if (isVideo)
        jobHLS.Settings.OutputGroups[0].Outputs.splice(0, 0, {
          ContainerSettings: {
            Container: 'M3U8',
            M3u8Settings: {},
          },
          VideoDescription: {
            Width: 1920,
            Height: 1080,
            // VideoPreprocessors: {
            //   TimecodeBurnin: {},
            // },
            // TimecodeInsertion: 'PIC_TIMING_SEI',
            CodecSettings: {
              Codec: 'H_264',
              H264Settings: {
                FramerateControl: 'INITIALIZE_FROM_SOURCE',
                RateControlMode: 'QVBR',
                SceneChangeDetect: 'TRANSITION_DETECTION',
                QualityTuningLevel: 'MULTI_PASS_HQ',
              },
            },
          },
          AudioDescriptions: [
            {
              AudioSourceName: 'Audio Selector 1',
              CodecSettings: {
                Codec: 'AAC',
                AacSettings: {
                  Bitrate: 96000,
                  RateControlMode: 'CBR',
                  CodingMode: 'CODING_MODE_2_0',
                  SampleRate: 48000,
                },
              },
            },
          ],
          OutputSettings: {
            HlsSettings: {},
          },
          NameModifier: '-video',
        });

      await s3.putObject({
        Bucket: bucket,
        Key: `${folder}/${uuid}-transcode-input.json`,
        Body: Buffer.from(JSON.stringify({ jobM4A, jobHLS })),
        ContentType: 'application/json',
      });

      const createJobCommand = new CreateJobCommand(jobM4A);
      const createJobCommandOutput = await mediaConvertClient.send(createJobCommand);
      // console.log(createJobCommandOutput);
      await s3.putObject({
        Bucket: bucket,
        Key: `${folder}/${uuid}-transcode-output-m4a.json`,
        Body: Buffer.from(JSON.stringify(createJobCommandOutput)),
        ContentType: 'application/json',
      });

      //
      // const getJobCommand = new GetJobCommand({ Id: createJobCommandOutput.Job.Id });
      // const getJobCommandOutput = await mediaConvertClient.send(getJobCommand);
      // console.log(getJobCommandOutput);
      //

      // TRANSCODE status
      status.steps[transcodeIndex].data.isVideo = isVideo;
      status.steps[transcodeIndex].status = 'process';
      status.steps[transcodeIndex].data.jobs = [createJobCommandOutput.Job];

      try {
        const createJobCommand2 = new CreateJobCommand(jobHLS);
        const createJobCommandOutput2 = await mediaConvertClient.send(createJobCommand2);
        status.steps[transcodeIndex].data.jobs.push(createJobCommandOutput2.Job);

        await s3.putObject({
          Bucket: bucket,
          Key: `${folder}/${uuid}-transcode-output-hls.json`,
          Body: Buffer.from(JSON.stringify(createJobCommandOutput2)),
          ContentType: 'application/json',
        });
      } catch (ignored) {}
    } catch (error) {
      console.log(error);
      // TRANSCODE error status
      status.steps[transcodeIndex].status = 'error';
      status.steps[transcodeIndex].data.error = error.message;
    }

    // UPDATE status
    const mutation = await graphqlRequest({
      query: transcriptMutation,
      variables: {
        input: {
          id: uuid,
          status: JSON.stringify(status),
          metadata: JSON.stringify(metadata),
          _version: transcript._version,
        },
      },
    });
  } else if (key.startsWith('public/media/hls/') && key.endsWith('.m3u8')) {
    // HLS
    const [, uuid] = key.split('/').reverse();

    const {
      data: { getTranscript: transcript },
    } = await graphqlRequest({ query: transcriptQuery, variables: { uuid } });

    const status = JSON.parse(transcript.status);
    const media = JSON.parse(transcript.media);

    // Media
    if (key.match(/-audio/)) {
      media.audio = { ...media.audio, hls: key };
    }
    if (key.match(/-video/)) {
      media.video = { ...media.video, hls: key };
    }
    // media.hls = { ...media.hls, hls: key };

    // UPDATE status
    // const mutation = await graphqlRequest({
    //   query: transcriptMutation,
    //   variables: {
    //     input: {
    //       id: uuid,
    //       media: JSON.stringify(media),
    //       _version: transcript._version,
    //     },
    //   },
    // });
  } else if (key.startsWith('public/media/audio/') && key.endsWith('.m4a')) {
    const [, uuid] = key.split('/').reverse();

    const {
      data: { getTranscript: transcript },
    } = await graphqlRequest({ query: transcriptQuery, variables: { uuid } });

    const status = JSON.parse(transcript.status);
    const media = JSON.parse(transcript.media);
    const metadata = JSON.parse(transcript.metadata);

    // TRANSCODE status
    const transcodeIndex = status.steps.findIndex(step => step.type === 'transcode');
    if (!status.steps[transcodeIndex].data) status.steps[transcodeIndex].data = {};
    status.steps[transcodeIndex].status = 'finish';
    status.steps[transcodeIndex].data.audio = { key };
    // status.steps[transcodeIndex].timeStamp = new Date().toISOString();

    // Media
    media.audio = { ...media.audio, key };

    // IF IMPORTED!
    if (metadata.PK) {
      // UPDATE status
      const mutation = await graphqlRequest({
        query: transcriptMutation,
        variables: {
          input: {
            id: uuid,
            status: JSON.stringify(status),
            media: JSON.stringify(media),
            _version: transcript._version,
          },
        },
      });

      return;
    }

    // TRANSCRIBE
    const transcribeIndex = status.steps.findIndex(step => step.type === 'transcribe');
    if (!status.steps[transcribeIndex].data) status.steps[transcribeIndex].data = {};
    // TODO skip if transcode not next?
    status.step = transcribeIndex;
    status.steps[transcribeIndex].status = 'wait';
    // status.steps[transcribeIndex].timeStamp = new Date().toISOString();
    try {
      const extension = 'm4a'; // FIXME derive from key?

      const transcribeClient = new TranscribeClient({ region: REGION });
      const startTranscriptionJobCommand = new StartTranscriptionJobCommand({
        LanguageCode: transcript.language ?? 'en-US',
        Media: {
          MediaFileUri: `s3://${bucket}/${key}`,
        },
        MediaFormat: extension === 'm4a' ? 'mp4' : extension,
        TranscriptionJobName: uuid,
        OutputBucketName: bucket,
        OutputKey: `public/transcript/${uuid}/stt.json`,
        Settings: {
          ShowSpeakerLabels: true,
          MaxSpeakerLabels: 10, // TODO this should be a parameter
        },
      });
      const startTranscriptionJobCommandOutput = await transcribeClient.send(startTranscriptionJobCommand);
      console.log(startTranscriptionJobCommandOutput);
      // TRANSCRIBE status
      status.steps[transcribeIndex].status = 'process';
      status.steps[transcribeIndex].data.job = startTranscriptionJobCommandOutput.TranscriptionJob;
    } catch (error) {
      // TRANSCRIBE error status
      status.steps[transcribeIndex].status = 'error';
      status.steps[transcribeIndex].data.error = error.message;
    }

    // UPDATE status
    const mutation = await graphqlRequest({
      query: transcriptMutation,
      variables: {
        input: {
          id: uuid,
          status: JSON.stringify(status),
          media: JSON.stringify(media),
          _version: transcript._version,
        },
      },
    });
  } else if (key.startsWith('public/transcript/') && key.endsWith('stt.json')) {
    const [, uuid] = key.split('/').reverse();

    const {
      data: { getTranscript: transcript },
    } = await graphqlRequest({ query: transcriptQuery, variables: { uuid } });

    const status = JSON.parse(transcript.status);

    // TRANSCRIBE status
    const transcribeIndex = status.steps.findIndex(step => step.type === 'transcribe');
    if (!status.steps[transcribeIndex].data) status.steps[transcribeIndex].data = {};
    status.steps[transcribeIndex].status = 'finish';
    status.steps[transcribeIndex].data.stt = { key };
    // status.steps[transcribeIndex].timeStamp = new Date().toISOString();

    // TODO convert Amazon STT -> editor format
    // read S3 -> text https://github.com/aws/aws-sdk-js-v3/issues/1877#issuecomment-1169119980
    // TODO check node >= 16
    const { Body: stream } = await s3.getObject({
      Bucket: bucket,
      Key: key,
    });

    const awsTranscript = JSON.parse(await consumers.text(stream));
    const converted = convertTranscript(awsTranscript);

    // await s3.putObject({
    //   Bucket: bucket,
    //   Key: key.replace('stt.json', 'transcript.json'),
    //   Body: Buffer.from(JSON.stringify(converted)),
    //   ContentType: 'application/json',
    // });

    const utf8Data = new TextEncoder('utf-8').encode(JSON.stringify(converted));
    const jsonGz = pako.gzip(utf8Data);
    // const blobGz = new Blob([jsonGz]);

    await s3.putObject({
      Bucket: bucket,
      Key: key.replace('stt.json', 'transcript.json'),
      Body: Buffer.from(jsonGz),
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    });

    // EDIT status
    const editIndex = status.steps.findIndex(step => step.type === 'edit');
    if (!status.steps[editIndex].data) status.steps[editIndex].data = {};
    status.step = editIndex;
    status.steps[editIndex].status = 'process';
    // status.steps[editIndex].timeStamp = new Date().toISOString();
    // TODO catch edits and set status to process?

    // UPDATE status
    const mutation = await graphqlRequest({
      query: transcriptMutation,
      variables: {
        input: {
          id: uuid,
          status: JSON.stringify(status),
          _version: transcript._version,
        },
      },
    });

    // index transcript
    const miniSearch = new MiniSearch({
      fields: ['text'],
      storeFields: ['speaker', 'start', 'end'],
    });

    miniSearch.addAll(
      converted.blocks.map(({ key: id, text, data }) => ({
        id,
        text,
        speaker: converted.speakers[data?.speaker]?.name ?? '',
        start: data?.start ?? 0,
        end: data?.end ?? 0,
      })),
    );

    await s3.putObject({
      Bucket: bucket,
      Key: key.replace('stt.json', 'index.json'),
      Body: Buffer.from(pako.gzip(new TextEncoder('utf-8').encode(JSON.stringify(miniSearch)))),
      ContentType: 'application/json',
      ContentEncoding: 'gzip',
    });

    // add to root/project index
    const metadata = JSON.parse(transcript.metadata);
    const root = metadata?.root;
    if (root) {
      let indexData;
      let miniSearch2;
      try {
        const { Body: stream2, ContentEncoding: contentEncoding } = await s3.getObject({
          Bucket: bucket,
          Key: `public/indexes/${root}/index.json`,
        });

        try {
          if (contentEncoding === 'gzip') {
            indexData = JSON.parse(pako.inflate(await consumers.buffer(stream2), { to: 'string' }));
          } else {
            indexData = JSON.parse(await consumers.text(stream2));
          }
        } catch (ignored) {}

        miniSearch2 = MiniSearch.loadJSON(JSON.stringify(indexData), { fields: ['title', 'text'] });
      } catch (error) {
        // indexData = JSON.stringify(new MiniSearch({ fields: ['title', 'text'] }));
        miniSearch2 = new MiniSearch({ fields: ['title', 'text'] });
      }

      const document = {
        id: transcript.id,
        title: transcript.title,
        text: converted.blocks.map(b => b.text).join('\n'),
      };
      miniSearch2.add(document);

      await s3.putObject({
        Bucket: bucket,
        Key: `public/indexes/${root}/index.json`,
        Body: Buffer.from(pako.gzip(new TextEncoder('utf-8').encode(JSON.stringify(miniSearch2)))),
        ContentType: 'application/json',
        ContentEncoding: 'gzip',
      });
    }
  }
};

const formatTranscript = (items, segments, debug = false) =>
  segments.map(segment => {
    const { start, end, speaker } = segment;
    const tokens = items.filter(({ start: s, end: e }) => start <= s && e <= end);

    const data = {
      items: tokens,
      speaker,
    };

    if (debug) data.segment = segment;

    return {
      data,
      text: tokens.map(({ text }) => text).join(' '),
      entityRanges: [],
      inlineStyleRanges: [],
    };
  });

const convertTranscript = ({
  results: {
    transcripts: [{ transcript }],
    items,
    speaker_labels: { segments },
  },
}) => {
  const segments2 = segments.map(({ start_time, end_time, speaker_label: speaker }) => ({
    start: parseFloat(start_time),
    end: parseFloat(end_time),
    speaker,
  }));

  const items2 = items
    .map(({ start_time, end_time, type, alternatives: [{ content: text }] }) => ({
      start: parseFloat(start_time),
      end: parseFloat(end_time),
      type,
      text,
    }))
    .reduce((acc, { start, end, type, text }) => {
      if (acc.length === 0) return [{ start, end, text }];
      const p = acc.pop();

      if (type !== 'pronunciation') {
        p.text += text;
        return [...acc, p];
      }
      return [...acc, p, { start, end, text }];
    }, []);

  const transcript2 = formatTranscript(items2, segments2);

  let speakers = [...new Set(segments2.map(({ speaker }) => speaker))].filter(s => !!s);

  speakers = speakers.reduce((acc, speaker) => {
    const id = `S${nanoid(3)}`;
    return { ...acc, [id]: { id, name: speaker, default: true } };
  }, {});

  const blocks = transcript2.map(block => {
    const items = block.data.items.map((item, i, arr) => {
      const offset = arr.slice(0, i).reduce((acc, { text }) => acc + text.length + 1, 0);
      return { ...item, offset, length: item.text.length };
    });

    return {
      ...block,
      key: `B${nanoid(5)}`,
      data: {
        ...block.data,
        start: block.data.items?.[0]?.start ?? 0,
        end: block.data.items?.[block.data.items.length - 1]?.end ?? 0,
        speaker: Object.entries(speakers).find(([id, { name }]) => name === block.data.speaker)?.[0],
        items,
        stt: items,
      },
      entityRanges: [],
      inlineStyleRanges: [],
    };
  });

  // "fold" speakers
  const limit = 7;
  const suppressions = cldrSegmentation.suppressions.all;

  const contiguousBlocks = blocks.reduce((acc, block, i) => {
    if (i === 0) return [block];
    const prev = acc.pop();

    if (prev.data.speaker === block.data.speaker) {
      const stt = [
        ...prev.data.stt,
        ...block.data.stt.map(item => ({ ...item, offset: item.offset + prev.text.length + 1 })),
      ].reduce((acc, item, i, arr) => {
        if (i === 0) {
          item.sid = nanoid(3); // sentence id
          item.sno = 1; // sentence number
          item.smod = item.sno % limit; // number % limit
          item.sg = nanoid(3); // sentence group
          return [item];
        }

        const prev = acc.pop();

        if (cldrSegmentation.sentenceSplit(`${prev.text} ${item.text}`, suppressions).length > 1) {
          prev.eol = true;
          item.sid = nanoid(3); // sentence id
          item.sno = prev.sno + 1; // sentence number
          item.smod = item.sno % limit; // number % limit
          item.sg = item.smod === 0 ? nanoid(3) : prev.sg; // sentence group
        } else {
          item.sid = prev.sid;
          item.sno = prev.sno;
          item.sg = prev.sg;
        }

        if (i === arr.length - 1) item.eol = true;

        item.smod = item.sno % limit;

        return [...acc, prev, item];
      }, []);

      const megablock = {
        key: prev.key,
        text: [prev.text, block.text].join(' '),
        data: {
          speaker: prev.data.speaker,
          start: stt[0].start,
          end: stt[stt.length - 1].end,
          items: stt,
          stt,
        },
        entityRanges: [],
        inlineStyleRanges: [],
      };

      return [...acc, megablock];
    }

    return [...acc, prev, block];
  }, []);

  // split every 7 "sentences"
  const sentenceSplitBlocks = contiguousBlocks
    .reduce((acc, block, i, arr) => {
      const count = block.data.stt.filter(({ eol }) => eol)?.length ?? 0;
      // console.log(count);
      if (count > 7) {
        const blocks = block.data.stt.reduce((acc, item, i, arr) => {
          let b;
          let p = true;
          if (i === 0 || item.sg !== arr[i - 1].sg) {
            p = false;
            b = {
              key: `b${nanoid(5)}`,
              data: {
                speaker: block.data.speaker,
                stt: [],
                items: [],
              },
              entityRanges: [],
              inlineStyleRanges: [],
            };
          }

          if (!b) b = acc.pop();

          b.data.stt.push(item);
          b.data.items.push(block.data.items[i]);

          return [...acc, b];
        }, []);

        return [...acc, ...blocks];
      }

      return [...acc, block];
    }, [])
    .map(block => ({
      ...block,
      text: block.data.items.map(({ text }) => text).join(' '),
      data: {
        ...block.data,
        start: block.data.items[0].start,
        end: block.data.items[block.data.items.length - 1].end,
        items: block.data.items.map((item, i, arr) => ({
          ...item,
          offset: arr.slice(0, i).reduce((acc, { text }) => acc + text.length + 1, 0),
        })),
        stt: block.data.stt.map((item, i, arr) => ({
          ...item,
          offset: arr.slice(0, i).reduce((acc, { text }) => acc + text.length + 1, 0),
        })),
      },
    }));

  const t = {
    speakers,
    blocks: sentenceSplitBlocks,
  };

  return t;
};

function ffprobe2(filePath, opts, cb) {
  var params = [];
  params.push('-show_streams', '-print_format', 'json', filePath);

  var d = Deferred();
  var info;
  var stderr;

  var ffprobe = spawn(opts.path, params);
  ffprobe.once('close', function (code) {
    if (!code) {
      info.stderr = stderr;
      d.resolve(info);
    } else {
      var err = stderr.split('\n').filter(Boolean).pop();
      d.reject(new Error(err));
    }
  });

  ffprobe.stderr.pipe(
    bl(function (err, data) {
      stderr = data.toString();
    }),
  );

  ffprobe.stdout.pipe(JSONStream.parse()).once('data', function (data) {
    info = data;
  });

  return d.nodeify(cb);
}
