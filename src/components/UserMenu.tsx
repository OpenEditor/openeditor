/* eslint-disable react/jsx-curly-brace-presence, jsx-a11y/label-has-associated-control */
import React, { useCallback, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { DataStore } from 'aws-amplify';
import { Avatar, Dropdown, Button, Space, Switch, Drawer, InputNumber, Input } from 'antd';
import { DownOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import hash from 'object-hash';

import { User } from '../models';
import { darkModeAtom, measureAtom, transportAtTopAtom, showFullTimecodeAtom, playerPositionAtom } from '../atoms';

interface UserMenuProps {
  user: User | undefined;
  groups: string[];
  signOut: () => void;
}

const UserMenu = ({ user, groups, signOut }: UserMenuProps): JSX.Element => {
  const [darkMode, setDarkMode] = useAtom(darkModeAtom);
  const [name, setName] = useState(user?.name);
  const [measure, setMeasure] = useAtom(measureAtom);
  const [transportAtTop, setTransportAtTop] = useAtom(transportAtTopAtom);
  const [showFullTimecode, setShowFullTimecode] = useAtom(showFullTimecodeAtom);

  const emailHash = useMemo(() => (user ? hash.MD5(user.email.trim().toLowerCase()) : null), [user]);

  const [settingsDrawerVisible, setSettingsDrawerVisible] = useState(false);
  const closeSettingsDrawer = useCallback(() => setSettingsDrawerVisible(false), []);

  const handleClick = useCallback(
    ({ key }: { key: string }) => {
      if (key === '0') setSettingsDrawerVisible(true);
      if (key === '1') signOut();
      // if (key === '2') setDarkMode(!darkMode);
    },
    [signOut, darkMode, setDarkMode],
  );

  const handleDarkModeChange = useCallback((darkMode: boolean) => setDarkMode(darkMode), [setDarkMode]);
  const handleTransportChange = useCallback(
    (transportAtTop: boolean) => setTransportAtTop(transportAtTop),
    [setTransportAtTop],
  );
  const handleShowFullTimecodeChange = useCallback(
    (showFullTimecode: boolean) => setShowFullTimecode(showFullTimecode),
    [setShowFullTimecode],
  );
  const handleMeasureChange = useCallback(
    (measure: number | null) => {
      if (measure) setMeasure(measure);
    },
    [setMeasure],
  );
  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value), []);

  const updateName = useCallback(async () => {
    const original = await DataStore.query(User, user?.id as string);
    if (!original) return;
    await DataStore.save(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      User.copyOf(original, (updated: any) => {
        // eslint-disable-next-line no-param-reassign
        updated.name = name;
      }),
    );
  }, [user, name]);

  return (
    <>
      <Dropdown
        trigger={['click']}
        menu={{
          onClick: handleClick,
          items: [
            {
              label: (
                <Space>
                  <SettingOutlined /> Preferences
                </Space>
              ),
              key: '0',
            },
            {
              label: (
                <Space>
                  <LogoutOutlined /> Sign Out
                </Space>
              ),
              key: '1',
            },
            {
              type: 'divider',
            },
            {
              label: (
                <Space>
                  <Switch size="small" checked={darkMode} onChange={handleDarkModeChange} disabled />
                  Dark mode
                </Space>
              ),
              key: '2',
            },
          ],
        }}>
        <div style={{ cursor: 'pointer' }}>
          <Avatar src={emailHash ? `https://www.gravatar.com/avatar/${emailHash}?d=404` : null}>
            {user?.name.charAt(0).toUpperCase()}
          </Avatar>
          <DownOutlined />
        </div>
      </Dropdown>
      <Drawer title="Settings" placement="right" onClose={closeSettingsDrawer} open={settingsDrawerVisible} width={600}>
        <Space direction="vertical" size="large">
          <Space>
            Display name <Input value={name} onChange={handleNameChange} />
            <Button onClick={updateName}>Update</Button>
          </Space>
          <Space>
            <Switch size="small" checked={darkMode} onChange={handleDarkModeChange} disabled />
            Dark mode
          </Space>
          <Space>
            <Switch size="small" checked={transportAtTop} onChange={handleTransportChange} />
            Media transport docked at top
          </Space>
          <Space>
            <Switch size="small" checked={showFullTimecode} onChange={handleShowFullTimecodeChange} />
            Show full timecode
          </Space>
          <Space>
            <InputNumber addonAfter="em" min={30} max={80} step={1} value={measure} onChange={handleMeasureChange} />
            editor measure (line length)
          </Space>
          {/* <Divider orientation="left" orientationMargin="0">
            User data
          </Divider> */}
        </Space>
      </Drawer>
    </>
  );
};

export default UserMenu;
