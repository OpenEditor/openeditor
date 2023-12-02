import React, { useMemo } from 'react';
import hash from 'object-hash';
import { Avatar, Tooltip } from 'antd';

import { User } from '../models';

const UserAvatar = ({ id, users }: { id: string; users: User[] | undefined }): JSX.Element | null => {
  const user = useMemo(() => users?.find(user => user.id === id), [id, users]);
  const emailHash = useMemo(() => (user ? hash.MD5(user.email.trim().toLowerCase()) : null), [user]);

  return user ? (
    <Tooltip title={`${user.name} <${user.email}>`}>
      <Avatar src={emailHash ? `https://www.gravatar.com/avatar/${emailHash}?d=404` : null} alt={user.email}>
        {user?.name
          .split(' ')
          .map(s => s.charAt(0).toUpperCase())
          .join('')}
      </Avatar>
    </Tooltip>
  ) : null;
};

export const UserAvatarGroup = ({ ids, users }: { ids: string[]; users: User[] | undefined }): JSX.Element | null => (
  <Avatar.Group maxCount={2}>
    {ids.map(id => (
      <UserAvatar key={id} {...{ id, users }} />
    ))}
  </Avatar.Group>
);

export default UserAvatar;
