/* eslint-disable no-console */
/* eslint-disable dot-notation */
/* eslint-disable no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable jsx-a11y/media-has-caption */
/* eslint-disable no-nested-ternary */
import React, { useState, useEffect, useMemo, useCallback, useRef, Ref } from 'react';
import { DataStore, Storage } from 'aws-amplify';
import { useAtom } from 'jotai';
import { v4 as uuidv4 } from 'uuid';
import { Card, Tag, Badge, Tooltip, Steps, Button, Upload, Select, message, Input } from 'antd';
import {
  UploadOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  MinusCircleOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import mime from 'mime/lite';
// import MediaInfo, { Result } from 'mediainfo.js';
import {
  MediaController,
  MediaControlBar,
  MediaPlayButton,
  MediaTimeDisplay,
  MediaTimeRange,
  MediaVolumeRange,
} from 'media-chrome/dist/react';

import { User, Transcript, Project, Folder } from '../../models';
import languages from '../../data/aws-transcribe-languages.json';
import { debugModeAtom } from '../../atoms';

import type { UploadRequestOption, UploadProgressEvent, UploadRequestError } from 'rc-upload/lib/interface';
import type { UploadFile, UploadChangeParam } from 'antd/lib/upload/interface';

const { Step } = Steps;
const { Option } = Select;

interface StatusCardProps {
  user: User | undefined;
  groups: string[];
  transcript: Transcript;
  root: Project | Folder | undefined;
  closeModal: () => void;
}

const LABELS = {
  upload: {
    title: {
      default: 'Upload',
      wait: 'Ready to upload',
      process: 'Uploading',
      finish: 'Uploaded',
      error: 'Upload failed',
    },
    description: {
      default: 'Upload a media file',
    },
  },
  transcode: {
    title: {
      default: 'Transcode',
      wait: 'Ready to transcode',
      process: 'Transcoding',
      finish: 'Transcoded',
      error: 'Transcode failed',
    },
    description: {
      default: 'Transcode to a speech-recognition format',
    },
  },
  transcribe: {
    title: {
      default: 'Transcribe',
      wait: 'Ready to transcribe',
      process: 'Transcribing',
      finish: 'Transcribed',
      error: 'Transcribe failed',
    },
    description: {
      default: 'Transcribe the speech-recognition format',
    },
  },
  edit: {
    title: {
      default: 'Edit',
      wait: 'Ready to edit',
      process: 'Editing',
      finish: 'Edited',
      error: 'Edit failed',
    },
    description: {
      default: 'Edit the transcript',
    },
  },
  align: {
    title: {
      default: 'Realign',
      wait: 'Ready to realign',
      process: 'Realigning',
      finish: 'Realigned',
      error: 'Realign failed',
    },
    description: {
      default: 'Realign the transcript',
    },
  },
};

// const STATUS = ['default', 'wait', 'process', 'finish', 'error'];

const languageOptions = languages.map(language => ({
  label: `${language.Language} (${language['Language code']})`,
  value: language['Language code'],
}));

const StatusCard = ({ user, groups, transcript, root, closeModal }: StatusCardProps): JSX.Element => {
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState([]);
  const [status, setStatus] = useState<'wait' | 'process' | 'finish' | 'error' | undefined>('wait');
  const [progress, setProgress] = useState(0);
  const fileList = useRef<UploadFile[]>([]);
  const [url, setUrl] = useState<string>('');
  const [validUrl, setValidUrl] = useState<boolean>(false);

  const uuid = transcript.id;

  useEffect(() => {
    if (!transcript) return;

    const { step: nextStep, steps } = (transcript.status as unknown as Record<string, any>) ?? { step: 0, steps: [] };

    setSteps(steps);

    if (step === 2 && nextStep === 3) {
      console.log('close modal?');
      closeModal();
    }
    console.log({ step, nextStep });
    setStep(nextStep);

    setStatus(steps[nextStep].status);
    setProgress(steps[nextStep]?.progress ?? 0);

    const uploadIndex = steps.findIndex((step: any) => step.type === 'upload');
    if (steps[uploadIndex]?.data?.fileList?.length > 0) fileList.current = steps[uploadIndex]?.data?.fileList ?? [];
  }, [transcript, step, closeModal]);

  const updateStatus = useCallback(
    async ({
      step,
      status,
      progress,
      data = {},
      title,
    }: {
      step: number;
      status: 'wait' | 'process' | 'finish' | 'error' | undefined;
      progress?: number | undefined;
      data?: Record<string, unknown> | undefined;
      title?: string | undefined;
    }) => {
      const original = await DataStore.query(Transcript, uuid);
      if (!original) return;

      await DataStore.save(
        Transcript.copyOf(original, (updated: any) => {
          const originalStatus = JSON.parse(JSON.stringify(original.status)); // FIXME
          // eslint-disable-next-line no-param-reassign
          updated.status = JSON.stringify({
            ...originalStatus,
            steps: [
              ...originalStatus.steps.slice(0, step),
              {
                ...originalStatus.steps[step],
                status,
                progress,
                data: {
                  ...originalStatus.steps[step]?.data,
                  ...data,
                  fileList: fileList.current,
                },
              },
              ...originalStatus.steps.slice(step + 1),
            ],
          });
          // eslint-disable-next-line no-param-reassign
          if (title) updated.title = title;
        }),
      );
    },
    [uuid],
  );

  // const updateTitle = useCallback(
  //   async (title: string) => {
  //     const original = await DataStore.query(Transcript, uuid);
  //     if (!original) return;

  //     await DataStore.save(
  //       Transcript.copyOf(original, (updated: any) => {
  //         // eslint-disable-next-line no-param-reassign
  //         updated.title = title;
  //       }),
  //     );
  //   },
  //   [uuid],
  // );

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { value: inputValue } = e.target;
    setUrl(inputValue);
    try {
      const { protocol } = new URL(inputValue);
      if (protocol !== 'https:' && protocol !== 'http:') throw new Error('Invalid protocol');
      setValidUrl(true);
    } catch (error) {
      setValidUrl(false);
    }
  }, []);

  const handleUpload = useCallback(
    async ({ file, onError, onSuccess, onProgress, filename, data }: UploadRequestOption) => {
      setStatus('process');

      const { name, type, size } = file as RcFile;
      // FIXME: limit on type and size?
      // fileInfo(file as RcFile);

      await updateStatus({ step: 0, status: 'process', progress: 0, title: name });
      // await updateTitle(name);

      const key = `uploads/${new Date()
        .toISOString()
        .replace(/T(.*)$/, '')
        .replaceAll('-', '/')}/${uuid}/${uuidv4()}.${name.split('.').pop()}`;

      try {
        await Storage.put(key, file, {
          contentType: mime.getType(name) ?? type,
          metadata: {
            transcript: uuid,
            user: user?.id ?? '',
          },
          progressCallback: ({ loaded, total }) => {
            const percent = Math.floor((loaded / total) * 100);
            setProgress(percent);
            if (onProgress) onProgress({ percent } as UploadProgressEvent);
          },
        });
      } catch (error) {
        console.error(error);
        message.error('Upload failed');

        setStatus('error');
        await updateStatus({ step: 0, status: 'error', progress: 0 });

        if (onError) onError(error as UploadRequestError);
      }

      setStatus('finish');
      setProgress(0);
      updateStatus({ step: 0, status: 'finish', progress: 100, data: { key, url: data?.url } });

      if (onSuccess) onSuccess(null);
    },
    [user, uuid, setProgress, setStatus, updateStatus],
  );

  const handleUrlImport = useCallback(() => {
    const { pathname } = new URL(url);
    const fileName = pathname.split('/').pop() ?? '';
    const file = new File([url], `${fileName}.url`, { type: mime.getType(fileName) ?? 'application/octet-stream' });
    console.log({ file, fileName, pathname, url });
    handleUpload({ file, filename: url, data: { url }, action: 'url', method: 'POST' });
  }, [url, handleUpload]);

  const handleRemove = useCallback((file: UploadFile) => {
    console.log('remove', file);
  }, []);

  const handleDownload = useCallback(async () => {
    const {
      key,
      fileList: [{ name, type = 'video/mp4' }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } = (transcript?.status as unknown as Record<string, any>)?.steps[0]?.data ?? {};

    const hideMessage = message.loading('Download in progress…', 0);
    try {
      const result = await Storage.get(key, { download: true });
      const url = URL.createObjectURL(result.Body as Blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = name ?? `download.${mime.getExtension(type)}`;

      const clickHandler = (): void => {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          a.removeEventListener('click', clickHandler);
        }, 150);
      };

      a.addEventListener('click', clickHandler, false);
      a.click();
    } catch (error) {
      message.error('Download failed');
    }
    hideMessage();
  }, [transcript]);

  const handleUploadChange = useCallback((change: UploadChangeParam) => {
    // console.log(change);
    fileList.current = change.fileList;
  }, []);

  const setLanguage = useCallback(
    async (language: string) => {
      const original = await DataStore.query(Transcript, uuid);
      if (!original) return;

      await DataStore.save(
        Transcript.copyOf(original, updated => {
          // eslint-disable-next-line no-param-reassign
          updated.language = language;
        }),
      );
    },
    [uuid],
  );

  const audioKey = useMemo(() => {
    const transcodeIndex = steps.findIndex((step: any) => step.type === 'transcode');
    return (steps[transcodeIndex] as any)?.data?.audio?.key;
  }, [steps]);

  const fixedSteps = useMemo(() => {
    const STATUS = ['wait', 'process', 'finish', 'error'];
    const taggedSteps = steps.map((step: any) => ({
      ...step,
      index: STATUS.findIndex(s => s === step.status) ?? 0,
    }));

    console.log({ taggedSteps });

    return taggedSteps.length === 0
      ? []
      : [
          taggedSteps.filter((step: any) => step.type === 'upload').sort((a: any, b: any) => b.index - a.index)[0],
          taggedSteps.filter((step: any) => step.type === 'transcode').sort((a: any, b: any) => b.index - a.index)[0],
          taggedSteps.filter((step: any) => step.type === 'transcribe').sort((a: any, b: any) => b.index - a.index)[0],
          taggedSteps.filter((step: any) => step.type === 'edit').sort((a: any, b: any) => b.index - a.index)[0],
          taggedSteps.filter((step: any) => step.type === 'align').sort((a: any, b: any) => b.index - a.index)[0],
        ];
  }, [steps]);

  return (
    <Card
      title={
        <>
          Status: <Status {...{ steps, step, status }} />
        </>
      }>
      <Steps current={step} direction="vertical" percent={progress} status={status}>
        {fixedSteps.map(({ type, status, title = {}, description, data = { url: null } }, index) =>
          type === 'upload' ? (
            <Step
              key={type}
              title={getTitle({ type, status, title })}
              description={
                <>
                  <Upload
                    fileList={fileList.current}
                    showUploadList={{ showRemoveIcon: false, showDownloadIcon: true }}
                    maxCount={1}
                    customRequest={handleUpload}
                    onRemove={handleRemove}
                    onChange={handleUploadChange}
                    onDownload={handleDownload}>
                    {fileList.current.length === 0 && !data?.url && (
                      <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        disabled={step !== index || status === 'process' || status === 'finish'}>
                        Upload
                      </Button>
                    )}
                  </Upload>
                  {fileList.current.length === 0 && !data?.url ? (
                    <>
                      <p style={{ marginTop: 12 }}>or import URL:</p>
                      <Input.Group compact>
                        <Input
                          style={{ width: 'calc(100% - 200px)' }}
                          value={url}
                          status={validUrl || url === '' ? '' : 'error'}
                          onChange={handleUrlChange}
                          disabled={step !== index || status === 'process' || status === 'finish'}
                        />
                        <Button
                          type="primary"
                          disabled={!validUrl || step !== index || status === 'process' || status === 'finish'}
                          onClick={handleUrlImport}>
                          Import
                        </Button>
                      </Input.Group>
                    </>
                  ) : data.url ? (
                    <p style={{ overflowWrap: 'break-word', wordBreak: 'break-all' }}>
                      <a href={data.url} target="_blank" rel="noreferrer">
                        {data.url}
                      </a>
                    </p>
                  ) : null}
                </>
              }
            />
          ) : type === 'transcode' ? (
            <Step
              key={type}
              icon={
                (steps[index] as any).status === 'process' ? <LoadingOutlined style={{ color: '#1890ff' }} /> : null
              }
              title={getTitle({ type, status, title })}
              description={
                audioKey ? <Audio key={audioKey} audioKey={audioKey} /> : getDescription({ type, status, description })
              }
            />
          ) : type === 'transcribe' ? (
            <Step
              key={type}
              icon={
                (steps[index] as any).status === 'process' ? <LoadingOutlined style={{ color: '#1890ff' }} /> : null
              }
              title={getTitle({ type, status, title })}
              description={
                <Select
                  defaultValue={transcript.language}
                  style={{ width: 230 }}
                  onChange={setLanguage}
                  disabled={step >= index}>
                  {languageOptions.map(({ label, value }) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  ))}
                </Select>
              }
            />
          ) : (
            <Step
              key={type}
              title={getTitle({ type, status, title })}
              description={getDescription({ type, status, description })}
            />
          ),
        )}
      </Steps>
    </Card>
  );
};

const getTitle = ({
  title,
  status,
  type,
}: {
  title: any[any];
  status: string;
  type: 'upload' | 'transcode' | 'transcribe' | 'edit' | 'align';
}): string =>
  title[status ?? 'default'] ??
  (LABELS[type] as any)['title'][status ?? 'default'] ??
  (LABELS[type] as any)['title'][null ?? 'default'];

const getDescription = ({
  description,
  status,
  type,
}: {
  description: any[any];
  status: string;
  type: 'upload' | 'transcode' | 'transcribe' | 'edit' | 'align';
}): string =>
  description?.[status ?? 'default'] ??
  description?.[null ?? 'default'] ??
  (LABELS[type] as any)['description'][status ?? 'default'] ??
  LABELS[type]['description'][null ?? 'default'];

const Audio = ({ audioKey }: { audioKey: string }): JSX.Element => {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    audioKey &&
      (async () =>
        setSrc(
          await Storage.get(audioKey.replace('public/', ''), {
            download: false,
            expires: 36000,
          }),
        ))();
  }, [audioKey]);

  // TODO 404 audio src?
  return (
    <MediaController audio style={{ width: '100%' }}>
      <audio slot="media" src={src ?? ''}>
        {' '}
      </audio>
      <MediaControlBar style={{ width: '100%' }}>
        <MediaPlayButton />
        <MediaTimeDisplay showDuration />
        <MediaTimeRange />
        <MediaVolumeRange />
      </MediaControlBar>
    </MediaController>
  );
};

const Status = ({
  steps,
  step,
  status,
}: {
  steps: never[];
  step: number;
  status: 'wait' | 'process' | 'finish' | 'error' | undefined;
}): JSX.Element => {
  const [debugMode] = useAtom(debugModeAtom);
  const currentStep = steps[step] as any;
  const color = status2color[status ?? 'default'];
  const icon = currentStep?.type === 'edit' ? <CheckCircleOutlined /> : status2icon[status ?? 'default'];
  const label = currentStep
    ? getTitle({ title: currentStep?.title ?? {}, status: status as string, type: currentStep.type })
    : '?';
  const message = currentStep
    ? getDescription({ description: currentStep?.description ?? {}, status: status as string, type: currentStep.type })
    : '?';

  return (
    <Tooltip title={message} placement="right">
      <Tag {...{ icon, color }}>
        {label} {debugMode ? `(${status})` : null}
      </Tag>
    </Tooltip>
  );
};

// FIXME ignore Folder?
export const StatusTag = ({ transcript }: { transcript: Transcript }): JSX.Element => {
  const { step, steps = [] } = (transcript.status as unknown as Record<string, any>) ?? { step: 0, steps: [] };
  const { status } = steps[step];

  return <Status {...{ steps, step, status }} />;
};

export const StatusBadge = ({ transcript }: { transcript: Transcript }): JSX.Element => {
  const { step, steps = [] } = (transcript.status as unknown as Record<string, any>) ?? {
    step: 0,
    steps: [],
  };
  const currentStep = steps[step] as any;
  const { status } = currentStep;

  const color = status2color[status ?? 'default'];
  const label = currentStep
    ? getTitle({ title: currentStep?.title ?? {}, status: status as string, type: currentStep.type })
    : '?';
  const message = currentStep
    ? getDescription({ description: currentStep?.description ?? {}, status: status as string, type: currentStep.type })
    : '?';

  return (
    <Tooltip title={message} placement="right">
      <Badge status={color as any} text={label} />
    </Tooltip>
  );
};

const status2color: { [key: string]: string } = {
  wait: 'default',
  process: 'processing',
  finish: 'success',
  error: 'error',
  default: 'default',
};

const status2icon = {
  wait: <ClockCircleOutlined />,
  process: <SyncOutlined spin />,
  finish: <CheckCircleOutlined />,
  error: <CloseCircleOutlined />,
  default: <MinusCircleOutlined />,
};

// https://github.com/facebook/create-react-app/issues/11756#issuecomment-1002637667
// const fileInfo = (file: RcFile): Promise<Result> =>
//   new Promise((resolve, reject) => {
//     MediaInfo({ format: 'object' }).then(mediaInfo => {
//       const getSize = (): number => file.size;

//       console.log({ mediaInfo });

//       const readChunk = (chunkSize: number, offset: number): Promise<Uint8Array> | Uint8Array =>
//         new Promise((resolve, reject) => {
//           const reader = new FileReader();
//           reader.onload = (event: ProgressEvent<FileReader>) => {
//             if (event?.target?.error) {
//               reject(event.target.error);
//             }
//             resolve(new Uint8Array(event?.target?.result as ArrayBuffer));
//           };
//           reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
//         });

//       (mediaInfo.analyzeData(getSize, readChunk) as Promise<Result>)
//         .then(result => {
//           console.log({ result });
//           resolve(result);
//         })
//         .catch(err => reject(err));
//     });
//   });

export default StatusCard;
