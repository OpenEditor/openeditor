/* eslint-disable @typescript-eslint/no-explicit-any, jsx-a11y/label-has-associated-control */
import React, { useCallback, useState, useMemo } from 'react';
import { DataStore } from 'aws-amplify';
import { useAtom } from 'jotai';
import { Card, Input, InputNumber, Space, Button, Radio, RadioChangeEvent } from 'antd';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import TC, { FRAMERATE } from 'smpte-timecode';

import { debugModeAtom, ocrTimecodeAtom } from '../../atoms';
import { User, Transcript } from '../../models';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MetadataCard = ({
  transcript,
  user,
  speakers,
  setSpeakers,
  frameRate: frameRateProp,
  offset: offsetProp,
}: {
  transcript: Transcript | undefined;
  user: User | undefined;
  speakers: { [key: string]: any };
  setSpeakers: (speakers: { [key: string]: any }) => void;
  frameRate: number;
  offset: string;
}): JSX.Element | null => {
  const [title, setTitle] = useState(transcript?.title);
  const [frameRate, setFrameRate] = useState<number>(frameRateProp);
  const [rawOffset, setRawOffset] = useState<string>(offsetProp);
  const [offset, setOffset] = useState<string>(offsetProp);
  const [offsetError, setOffsetError] = useState<boolean>(false);
  const [debugMode] = useAtom(debugModeAtom);
  const [ocrTimecode] = useAtom(ocrTimecodeAtom);

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value: title } = e.target;
      if (title) setTitle(title);
    },
    [setTitle],
  );

  const updateTitle = useCallback(
    async (e: any) => {
      const original = await DataStore.query(Transcript, transcript?.id as string);
      if (!original) return;
      await DataStore.save(
        Transcript.copyOf(original, (updated: any) => {
          // eslint-disable-next-line no-param-reassign
          updated.title = title;
          // eslint-disable-next-line no-param-reassign
          updated.metadata = JSON.stringify({
            ...(original as any)?.metadata,
            // eslint-disable-next-line no-unsafe-optional-chaining
            updatedBy: [...new Set([...(original as any)?.metadata?.updatedBy, user?.id])],
          });
        }),
      );
    },
    [transcript, title, user],
  );

  const handleFrameRateChange = useCallback(
    (e: RadioChangeEvent) => {
      const { value } = e.target;
      if (value) setFrameRate(value);
    },
    [setFrameRate],
  );

  const handleRawOffsetChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value } = e.target;
      try {
        const tc = new TC(value.trim(), frameRate as FRAMERATE);
        setOffset(tc.toString());
        setOffsetError(false);
      } catch (error) {
        setOffsetError(true);
      }
      setRawOffset(value.trim());
    },
    [frameRate],
  );

  const resetRawOffsetChange = useCallback(
    (value: string) => {
      try {
        const tc = new TC(value.trim(), frameRate as FRAMERATE);
        setOffset(tc.toString());
        setOffsetError(false);
      } catch (error) {
        console.log(error);
        setOffsetError(true);
      }
      setRawOffset(value.trim());
    },
    [frameRate],
  );

  const rawOffsetValue = useMemo(() => {
    try {
      const tc = new TC(rawOffset.trim(), frameRate as FRAMERATE);
      setOffset(tc.toString());
      setOffsetError(false);
      return tc.toString();
    } catch (ignored) {
      setOffsetError(true);
      return rawOffset.trim();
    }
  }, [rawOffset, frameRate]);

  const zeroTimecode = useMemo(() => {
    const tc = TC(0, frameRate as FRAMERATE).toString();
    return tc;
  }, [frameRate]);

  // const dropFrame = useMemo(() => offset.indexOf(';') > -1, [offset]);
  const dropFrame = useMemo(() => {
    const tc = TC(0, frameRate as FRAMERATE).toString();
    console.log({ frameRate, tc: TC(0, frameRate as FRAMERATE) });
    return tc.indexOf(';') > -1;
  }, [frameRate]);

  const handleApplyOffset = useCallback(
    async (e: any) => {
      const original = await DataStore.query(Transcript, transcript?.id as string);
      if (!original) return;
      await DataStore.save(
        Transcript.copyOf(original, (updated: any) => {
          // eslint-disable-next-line no-param-reassign
          updated.metadata = JSON.stringify({
            ...(original as any)?.metadata,
            frameRate,
            offset,
            // eslint-disable-next-line no-unsafe-optional-chaining
            updatedBy: [...new Set([...(original as any)?.metadata?.updatedBy, user?.id])],
          });
        }),
      );
    },
    [transcript, frameRate, offset, user],
  );

  const ffprobeTimecode = useMemo(() => {
    let match = (transcript?.status as any)?.steps?.[0]?.data?.ffprobe?.stderr
      ?.match(/\b([0-1]\d|2[0-3])[:;]([0-5]\d)[:;]([0-5]\d)[:;]([0-5]\d)\b/)?.[0]
      ?.replaceAll(';', ':');
    if (!match) return zeroTimecode;
    // if dropFrame replace last : with ;
    if (dropFrame) match = match.replace(/:([^:]*)$/, ';$1');

    const tc = TC(match, frameRate as FRAMERATE).toString();
    return tc;
  }, [transcript, frameRate, dropFrame, zeroTimecode]);

  const ocrTimecode2 = useMemo(() => {
    let match = ocrTimecode
      ?.match(/\b([0-1]\d|2[0-3])[:;]([0-5]\d)[:;]([0-5]\d)[:;]([0-5]\d)\b/)?.[0]
      ?.replaceAll(';', ':');
    if (!match) return zeroTimecode;
    // if dropFrame replace last : with ;
    if (dropFrame) match = match.replace(/:([^:]*)$/, ';$1');

    const tc = TC(match, frameRate as FRAMERATE).toString();
    return tc;
  }, [ocrTimecode, frameRate, dropFrame, zeroTimecode]);

  return (
    <Space style={{ width: '100%' }} direction="vertical" size="large">
      <Card size="small" title="Metadata">
        <Space style={{ width: '100%' }} direction="vertical" size="large">
          <Space style={{ width: '100%' }} direction="vertical" size="small">
            <span>Title</span>
            <Input.Group compact>
              <Input style={{ width: 'calc(100% - 100px)' }} value={title} onChange={handleTitleChange} />
              <Button type="primary" onClick={updateTitle}>
                Update
              </Button>
            </Input.Group>
          </Space>

          <Space style={{ width: '100%' }} direction="vertical" size="small">
            <span>Speaker names</span>
            {Object.keys(speakers).map(speakerId => (
              <SpeakerNameInput key={speakerId} id={speakerId} speakers={speakers} setSpeakers={setSpeakers} />
            ))}
          </Space>
        </Space>
      </Card>
      <Card size="small" title="Timecode">
        <Space style={{ width: '100%' }} direction="vertical" size="small">
          <span>
            Offset
            {/* <code>{offsetProp}</code> */}
          </span>
          <Space>
            <Input
              value={rawOffsetValue}
              status={offsetError ? 'error' : undefined}
              onChange={handleRawOffsetChange}
              className="tcInput"
            />
            {/* <Button icon={<SearchOutlined />} disabled /> */}
            <Button type="primary" disabled={offsetError} onClick={handleApplyOffset}>
              Apply
            </Button>
            <Button type="dashed" danger disabled={offsetError} onClick={() => resetRawOffsetChange(zeroTimecode)}>
              Reset to <code> {zeroTimecode}</code>
            </Button>
          </Space>
          <span>
            Frame rate ({dropFrame ? <abbr title="drop frame">DF</abbr> : <abbr title="non drop frame">NDF</abbr>})
            {/* <code>{frameRateProp}</code> */}
          </span>
          <Radio.Group onChange={handleFrameRateChange} value={frameRate}>
            <Radio value={23.976}>23.976</Radio>
            <Radio value={24}>24</Radio>
            <Radio value={25}>25</Radio>
            <Radio value={29.97}>29.97</Radio>
            <Radio value={30}>30</Radio>
            <Radio value={50}>50</Radio>
            <Radio value={59.94}>59.94</Radio>
            <Radio value={60}>60</Radio>
          </Radio.Group>
          {ffprobeTimecode && ffprobeTimecode !== '' && ffprobeTimecode !== zeroTimecode ? (
            <div>
              <br />
              Offset found in metadata: <code>{ffprobeTimecode}</code>{' '}
              <Button size="small" onClick={() => resetRawOffsetChange(ffprobeTimecode)}>
                Load value
              </Button>
            </div>
          ) : null}
          {ocrTimecode2 && ocrTimecode2 !== '' && ocrTimecode2 !== zeroTimecode ? (
            <div>
              <br />
              Offset found in first frame: <code>{ocrTimecode2}</code>{' '}
              <Button size="small" onClick={() => resetRawOffsetChange(ocrTimecode2)}>
                Load value
              </Button>
            </div>
          ) : null}
        </Space>
      </Card>
    </Space>
  );
};

const SpeakerNameInput = ({
  id,
  speakers,
  setSpeakers,
}: {
  id: string;
  speakers: { [key: string]: any };
  setSpeakers: (speakers: { [key: string]: any }) => void;
}): JSX.Element => {
  const speaker = useMemo(() => speakers[id], [speakers, id]);
  const [name, setName] = useState(speaker.name);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { value: name } = e.target;
      if (name) setName(name);
    },
    [setName],
  );

  const updateSpeakerName = useCallback(
    (e: any) => {
      setSpeakers({ ...speakers, [id]: { ...speaker, name } });
    },
    [id, speaker, name, speakers, setSpeakers],
  );

  return (
    <Input.Group compact>
      <Input style={{ width: 'calc(100% - 100px)' }} value={name} onChange={handleNameChange} />
      <Button type="primary" onClick={updateSpeakerName}>
        Update
      </Button>
    </Input.Group>
  );
};

// const timecode = ({ seconds = 0, frameRate = 1000, dropFrame = false, partialTimecode = false }): string => {
//   const tc = TC(seconds * frameRate, frameRate as FRAMERATE, dropFrame).toString();
//   // hh:mm:ss
//   if (partialTimecode) return tc.split(':').slice(0, 3).join(':');

//   // hh:mm:ss.mmmm
//   if (frameRate === 1000) {
//     const [hh, mm, ss, mmm] = tc.split(':');
//     if (mmm.length === 1) return `${hh}:${mm}:${ss}.${mmm}00`;
//     if (mmm.length === 2) return `${hh}:${mm}:${ss}.${mmm}0`;
//     return `${hh}:${mm}:${ss}.${mmm}`;
//   }

//   return tc;
// };

export default MetadataCard;
