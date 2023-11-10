/* eslint-disable jsx-a11y/anchor-is-valid */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-nested-ternary */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
/* eslint-disable no-restricted-globals */
import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { DataStore, Storage, API } from 'aws-amplify';
import { useAtom } from 'jotai';
import Moment from 'react-moment';
import 'moment-timezone';
import TC, { FRAMERATE } from 'smpte-timecode';
import pako from 'pako';
import {
  Layout,
  Col,
  Row,
  Table,
  Typography,
  Drawer,
  Button,
  Space,
  Divider,
  FloatButton,
  Popconfirm,
  Modal,
  Input,
  message,
  Tree,
  Dropdown,
  Empty,
} from 'antd';
import { DownOutlined } from '@ant-design/icons';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import FolderOpenOutlined from '@ant-design/icons/FolderOpenOutlined';
import FolderAddOutlined from '@ant-design/icons/FolderAddOutlined';
import FolderTwoTone from '@ant-design/icons/FolderTwoTone';
import ProjectOutlined from '@ant-design/icons/ProjectOutlined';
import ProjectTwoTone from '@ant-design/icons/ProjectTwoTone';
import VideoCameraTwoTone from '@ant-design/icons/VideoCameraTwoTone';
import AudioTwoTone from '@ant-design/icons/AudioTwoTone';
import { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@ant-design/pro-components';
import axios from 'axios';
import MiniSearch from 'minisearch';
import Highlighter from 'react-highlight-words';
import { RawDraftContentBlock } from 'draft-js';

import { User, Transcript, Project, Folder, ProjectGroup } from '../models';
import StatusCard, { StatusTag, StatusBadge } from '../components/cards/StatusCard';
import UserAvatar, { UserAvatarGroup } from '../components/UserAvatar';
import DataCard from '../components/cards/DataCard';
import Footer from '../components/Footer';
import { darkModeAtom } from '../atoms';

import type { DataNode, DirectoryTreeProps } from 'antd/es/tree';
import type { MenuProps } from 'antd';

const { Header, Content } = Layout;
const { Text } = Typography;
const { DirectoryTree } = Tree;
const { Search } = Input;

interface HomeProps {
  uuid: string | undefined;
  user: User | undefined;
  users: User[] | undefined;
  groups: string[];
  userMenu: JSX.Element;
  project: Project | undefined;
  projects: Project[] | undefined;
  projectGroup: ProjectGroup | undefined;
  folder: Folder | undefined;
  folders: Folder[] | undefined;
  transcripts: Transcript[] | undefined;
  root: Project | Folder | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  routes: any[];
}

const useQuery = (): URLSearchParams => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const Home = ({
  uuid,
  user,
  users,
  groups,
  project,
  projects = [],
  projectGroup,
  folder,
  folders = [],
  transcripts = [],
  userMenu,
  root,
  routes = [],
}: HomeProps): JSX.Element => {
  const history = useHistory();
  const query = useQuery();
  const [darkMode] = useAtom(darkModeAtom);
  const [messageApi, contextHolder] = message.useMessage();

  const rows = useMemo(
    () =>
      [
        // eslint-disable-next-line eqeqeq
        ...projects.filter(({ parent }) => parent == uuid),
        // eslint-disable-next-line eqeqeq
        ...folders.filter(({ parent }) => parent == uuid),
        // eslint-disable-next-line eqeqeq
        ...transcripts.filter(({ parent }) => parent == uuid),
      ].filter(row => {
        const metadata = JSON.parse(JSON.stringify(row.metadata)); // FIXME
        return metadata?.deleted !== true;
      }),
    [projects, folders, transcripts, uuid],
  );

  const newTranscript = useCallback(async () => {
    const transcript = await DataStore.save(
      new Transcript({
        title: `New Transcript ${new Date().toLocaleString()}`,
        parent: folder?.id ?? project?.id ?? null,
        language: 'en-US',
        media: '{}',
        metadata: JSON.stringify({
          createdBy: user?.id,
          updatedBy: [user?.id],
        }),
        status: JSON.stringify({
          step: 0,
          steps: [
            {
              type: 'upload',
              status: 'wait',
            },
            {
              type: 'transcode',
            },
            {
              type: 'transcribe',
            },
            {
              type: 'edit',
            },
            {
              type: 'align',
            },
          ],
        }),
      }),
    );

    console.log({ transcript });
    history.push(`/${transcript.id}`);
  }, [history, project, folder, user]);

  // const createTranscripts = useCallback(async () => {
  //   const t = [];
  //   const data = [];

  //   // eslint-disable-next-line no-restricted-syntax
  //   for (const d of data) {
  //     // console.log(d);
  //     // eslint-disable-next-line no-await-in-loop
  //     const t1 = await DataStore.save(
  //       new Transcript({
  //         title: d.title,
  //         parent: d.parent,
  //         language: 'en-US',
  //         media: '{}',
  //         metadata: JSON.stringify({
  //           PK: d.metadata.PK,
  //           src: d.metadata.src,
  //           createdBy: user?.id,
  //           updatedBy: [user?.id],
  //         }),
  //         status: JSON.stringify({
  //           step: 0,
  //           steps: [
  //             {
  //               type: 'upload',
  //               status: 'wait',
  //             },
  //             {
  //               type: 'transcode',
  //             },
  //             {
  //               type: 'transcribe',
  //             },
  //             {
  //               type: 'edit',
  //             },
  //             {
  //               type: 'align',
  //             },
  //           ],
  //         }),
  //       }),
  //     );
  //     t.push({ id: t1.id, PK: d.metadata.PK });
  //   }
  //   console.log({ t });
  // }, [user]);

  // const updateTranscript = useCallback(async () => {
  //   const t = [];

  //   // eslint-disable-next-line no-restricted-syntax
  //   for (const ID of t) {
  //     const { id } = ID;

  //     // eslint-disable-next-line no-await-in-loop
  //     const original = await DataStore.query(Transcript, id);
  //     // eslint-disable-next-line no-await-in-loop
  //     await DataStore.save(
  //       // eslint-disable-next-line no-loop-func
  //       Transcript.copyOf(original as Transcript, (updated: any) => {
  //         const originalStatus = JSON.parse(JSON.stringify(original?.status)); // FIXME
  //         originalStatus.step = 3;
  //         originalStatus.steps[2].status = 'finish';
  //         // eslint-disable-next-line no-param-reassign
  //         updated.status = JSON.stringify({
  //           ...originalStatus,
  //         });
  //       }),
  //     );
  //   }
  // }, []);

  const [newFolderModalVisible, setNewFolderModalVisible] = useState(false);
  const [newProjectModalVisible, setNewProjectModalVisible] = useState(false);
  const [moveToFolderModalVisible, setMoveToFolderModalVisible] = useState(false);
  const [statusDrawerVisible, setStatusDrawerVisible] = useState(false);
  const [statusDrawerTranscript, setStatusDrawerTranscript] = useState<Transcript | null>(null);

  const openStatusDrawer = useCallback((transcript: Transcript) => {
    setStatusDrawerTranscript(transcript);
    setStatusDrawerVisible(true);
  }, []);
  const closeStatusDrawer = useCallback(() => {
    setStatusDrawerVisible(false);
    // setStatusDrawerTranscript(null); // TODO: keep while uploading only
  }, []);

  const newFolder = useCallback(() => setNewFolderModalVisible(true), []);
  const newProject = useCallback(() => setNewProjectModalVisible(true), []);

  const columns = useMemo(
    (): ColumnsType<Transcript | Folder> => [
      {
        title: 'Title',
        dataIndex: 'title',
        key: 'title',
        width: '33%',
        render: (title: string, record: Transcript | Folder) => {
          const metadata = JSON.parse(JSON.stringify(record.metadata)); // FIXME
          return (
            <span>
              {record instanceof Project ? (
                <ProjectTwoTone style={{ fontSize: 20, marginRight: 10 }} />
              ) : record instanceof Folder ? (
                <FolderTwoTone style={{ fontSize: 20, marginRight: 10 }} />
              ) : (record.status as any)?.steps?.[0]?.data?.ffprobe?.streams.findIndex(
                  ({ codec_type: type }: { codec_type: string }) => type === 'video',
                ) > -1 ? (
                <VideoCameraTwoTone style={{ fontSize: 20, marginRight: 10 }} />
              ) : (
                <AudioTwoTone style={{ fontSize: 20, marginRight: 10 }} />
              )}
              <Link to={`/${record.id}`}>
                <Text
                  style={{
                    textDecoration: metadata.deleted ? 'line-through' : 'none',
                  }}>
                  {title}
                </Text>
              </Link>
            </span>
          );
        },
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render: (status: any, record) =>
          record instanceof Transcript ? (
            <div style={{ display: 'inline-block' }} onClick={() => openStatusDrawer(record as Transcript)}>
              <StatusTag transcript={record as Transcript} />
            </div>
          ) : null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // render: (status: any, record) => <StatusBadge transcript={record} />,
      },
      {
        title: 'Duration',
        dataIndex: ['status'],
        key: 'duration',
        align: 'right',
        // FIXME: move to component, memoize, add folder timing (recursive sum of children)
        render: status => (
          <span>
            {status?.steps?.[0]?.data?.ffprobe?.streams?.[0]?.duration
              ? timecode({
                  seconds: status?.steps?.[0]?.data?.ffprobe?.streams?.[0]?.duration ?? 0,
                  partialTimecode: true,
                  frameRate: 1000,
                  dropFrame: false,
                  offset: 0,
                })
              : null}
          </span>
        ),
      },
      {
        title: (
          <span>
            Last modified <small>(ago)</small>
          </span>
        ),
        dataIndex: 'updatedAt',
        key: 'updatedAt',
        align: 'right',
        render: (updatedAt: string) => (
          <span title={new Date(updatedAt).toLocaleString()}>
            <Moment fromNow ago date={updatedAt} />
          </span>
        ),
        defaultSortOrder: 'descend',
        // sortr2: (a: Transcript | Folder, b: Transcript | Folder) =>
        //   new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime(),
        sorter: (a: Transcript | Folder, b: Transcript | Folder) => {
          if (a instanceof Folder && b instanceof Transcript) {
            return 1; // sort a before b
          }
          if (a instanceof Transcript && b instanceof Folder) {
            return -1; // sort b before a
          }
          return new Date(a.updatedAt ?? 0).getTime() - new Date(b.updatedAt ?? 0).getTime();
        },
      },
      {
        title: 'by',
        dataIndex: ['metadata', 'updatedBy'],
        key: 'updatedBy',
        render: updatedBy => <UserAvatarGroup ids={Array.isArray(updatedBy) ? updatedBy : []} users={users} />,
      },
      {
        title: (
          <span>
            Added <small>(ago)</small>
          </span>
        ),
        dataIndex: 'createdAt',
        key: 'createdAt',
        align: 'right',
        render: (createdAt: string) => (
          <span title={new Date(createdAt).toLocaleString()}>
            <Moment fromNow ago date={createdAt} />
          </span>
        ),
        sorter: (a: Transcript | Folder, b: Transcript | Folder) =>
          new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime(),
      },
      {
        title: 'by',
        dataIndex: ['metadata', 'createdBy'],
        key: 'createdBy',
        render: createdBy => <UserAvatar id={createdBy} users={users} />,
      },
    ],
    [openStatusDrawer, users],
  );

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const onSelectChange = (newSelectedRowKeys: React.Key[]): void => {
    console.log('selectedRowKeys changed: ', newSelectedRowKeys);
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
  };

  const deleteRows = useCallback(async () => {
    await Promise.all(
      selectedRowKeys.map(async id => {
        const project = (await DataStore.query(Project, id as string)) as Project;
        const folder = (await DataStore.query(Folder, id as string)) as Folder;
        const transcript = (await DataStore.query(Transcript, id as string)) as Transcript;

        const item = project || folder || transcript;

        // Actual delete
        // if (transcript) return DataStore.delete(transcript);

        // Mark as deleted
        const metadata = JSON.parse(JSON.stringify(item.metadata)); // FIXME

        if (project)
          await DataStore.save(
            Project.copyOf(project, (updated: any) => {
              // eslint-disable-next-line no-param-reassign
              updated.metadata = JSON.stringify({ ...metadata, deleted: true });
            }),
          );

        if (folder)
          await DataStore.save(
            Folder.copyOf(folder, (updated: any) => {
              // eslint-disable-next-line no-param-reassign
              updated.metadata = JSON.stringify({ ...metadata, deleted: true });
            }),
          );

        if (transcript)
          await DataStore.save(
            Transcript.copyOf(transcript, (updated: any) => {
              // eslint-disable-next-line no-param-reassign
              updated.metadata = JSON.stringify({ ...metadata, deleted: true });
            }),
          );

        messageApi.open({
          type: 'warning',
          content: `${item.title} deleted`,
        });
        return null;
      }),
    );
    setSelectedRowKeys([]);
  }, [selectedRowKeys, messageApi]);

  const itemRender = useCallback((route: any, params: any, routes: any[], paths: any[]) => {
    if (route.projectGroups && route.projectGroups.length > 0) {
      const items: MenuProps['items'] = route.projectGroups.map((projectGroup: ProjectGroup, i: number) => ({
        key: `${i + 1}`,
        label: <Link to={`/${projectGroup.id}`}>{projectGroup.title}</Link>,
      }));

      return (
        <Dropdown menu={{ items }}>
          <a onClick={e => e.preventDefault()}>
            <Space>
              {route.breadcrumbName}
              <DownOutlined />
            </Space>
          </a>
        </Dropdown>
      );
    }
    return <Link to={route.path}>{route.breadcrumbName}</Link>;
  }, []);

  const search = useMemo(() => query.get('search'), [query]);
  const [searchResults, setSearchResults] = useState<any | null>(null);

  return (
    <>
      {contextHolder}
      <Layout>
        <PageContainer
          breadcrumb={{
            routes,
            itemRender,
          }}
          title={
            <>
              <span>{project ? project.title : folder ? folder.title : 'OpenEditor'}</span> <br />
            </>
          }
          extra={
            <Space>
              <SearchBox {...{ root, folders, transcripts, setSearchResults }} />
              {groups?.includes('Admins') && (!uuid || projectGroup) ? (
                <Button type="default" shape="round" icon={<ProjectOutlined />} onClick={newProject}>
                  New Project
                </Button>
              ) : null}
              {uuid && !projectGroup ? (
                <>
                  <Button type="default" shape="round" icon={<FolderAddOutlined />} onClick={newFolder}>
                    New Folder
                  </Button>
                  <Button type="primary" shape="round" icon={<UploadOutlined />} onClick={newTranscript}>
                    New Transcript
                  </Button>
                </>
              ) : null}
              <Divider />
              {userMenu}
            </Space>
          }
        />
        <Content>
          <Row
            style={{
              backgroundColor: darkMode ? 'black' : 'white',
              // paddingTop: '3em',
              // paddingBottom: '5em',
            }}>
            <Col span={22} offset={1}>
              {search && searchResults ? (
                <div>
                  {(searchResults as any).results.map((result: any) => {
                    const transcript = transcripts?.find(t => result.id === t.id);

                    return (
                      <div key={result.id} style={{ marginTop: '2em' }}>
                        <h3>
                          <Link to={`/${result.id}`}>{transcript?.title}</Link>
                        </h3>
                        <Excerpt
                          id={result.id}
                          terms={result.terms}
                          query={(searchResults as any).query}
                          transcript={transcript as Transcript}
                        />
                      </div>
                    );
                  })}
                  {searchResults?.results.length === 0 ? (
                    <Empty
                      description={
                        <span>
                          No results found. <br /> <Button>Index Project</Button>
                        </span>
                      }
                    />
                  ) : null}
                </div>
              ) : (
                <Table
                  size="middle"
                  rowKey="id"
                  pagination={false}
                  sticky
                  dataSource={rows}
                  columns={columns}
                  rowSelection={rowSelection}
                  // rowSelection={uuid ? rowSelection : undefined}
                />
              )}
            </Col>
          </Row>
          <Drawer
            title={statusDrawerTranscript?.title}
            placement="right"
            onClose={closeStatusDrawer}
            open={statusDrawerVisible}
            width={600}>
            {statusDrawerTranscript ? (
              <StatusCard transcript={statusDrawerTranscript} user={user} groups={groups} />
            ) : null}
          </Drawer>
          <NewProjectModal
            visible={newProjectModalVisible}
            setVisible={setNewProjectModalVisible}
            userId={user?.id}
            uuid={uuid}
          />
          <NewFolderModal
            visible={newFolderModalVisible}
            setVisible={setNewFolderModalVisible}
            userId={user?.id}
            parentId={project?.id ?? folder?.id}
          />
          {selectedRowKeys.length > 0 ? (
            <MoveToFolderModal
              visible={moveToFolderModalVisible}
              setVisible={setMoveToFolderModalVisible}
              userId={user?.id}
              root={root}
              folder={folder}
              folders={folders}
              selectedRowKeys={selectedRowKeys}
            />
          ) : null}
          {/* <Button onClick={updateTranscript} type="primary">
            IMPORT
          </Button> */}
          <DataCard objects={{ user, groups, root, project, projects, folder, folders, transcripts }} />
          {selectedRowKeys.length > 0 ? (
            <FloatButton.Group shape="square" style={{ right: 94 }}>
              {root ? (
                <FloatButton
                  icon={<FolderOpenOutlined />}
                  tooltip="Move to folder"
                  type="primary"
                  onClick={() => setMoveToFolderModalVisible(true)}
                />
              ) : null}
              <Popconfirm
                title="Delete selected items"
                description={`Delete ${selectedRowKeys.length} items?`}
                placement="left"
                icon={<DeleteOutlined style={{ color: 'red' }} />}
                onConfirm={deleteRows}
                // onCancel={cancel}
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel">
                <FloatButton icon={<DeleteOutlined />} type="primary" className="danger-button" />
              </Popconfirm>
            </FloatButton.Group>
          ) : null}
          <Footer />
          <FloatButton.BackTop />
        </Content>
      </Layout>
    </>
  );
};

const Excerpt = ({
  id,
  terms,
  query,
  transcript,
}: {
  id: string;
  terms: string[];
  query: string;
  transcript: Transcript;
}): JSX.Element => {
  const [results, setResults] = useState<RawDraftContentBlock[]>([]);

  const originalFrameRate = useMemo(() => {
    const videoStream = (transcript as any)?.status?.steps?.[0]?.data?.ffprobe?.streams.find(
      (stream: any) => stream.codec_type === 'video',
    );

    // eslint-disable-next-line dot-notation, no-eval
    if (videoStream?.['r_frame_rate']) return parseFloat(parseFloat(eval(videoStream?.['r_frame_rate'])).toFixed(2));

    return null;
  }, [transcript]);

  const frameRate = useMemo(
    () => (transcript as any)?.metadata.frameRate ?? originalFrameRate ?? 1000,
    [transcript, originalFrameRate],
  );

  const offset = useMemo(
    () => (transcript as any)?.metadata.offset ?? new TC(0, frameRate as FRAMERATE).toString(),
    [transcript, frameRate],
  );

  useEffect(() => {
    API.get('search', '/search', { queryStringParameters: { id, terms: terms.join(' '), query } })
      .then(response => {
        setResults(response);
      })
      .catch(error => {
        console.log(error.response);
      });
  }, [id, terms, query]);
  return (
    <div style={{ marginLeft: '3em' }}>
      {results.slice(0, 3).map(block => (
        <p key={block.key}>
          <Link
            to={`/${id}?t=${(block.data as any).start ?? 0},${(block.data as any).end ?? 0}&block=${
              block.key
            }&q=${encodeURIComponent(query)}`}>
            <code>
              {timecode({
                seconds: (block.data as any).start ?? 0,
                frameRate,
                offset,
                partialTimecode: false,
              })}
              &thinsp;–&thinsp;
              {timecode({
                seconds: (block.data as any).end ?? 0,
                frameRate,
                offset,
                partialTimecode: false,
              })}
            </code>
          </Link>
          <br />
          <strong>{`${(block.data as any)?.speaker}: `}</strong>
          <Highlighter highlightClassName="matchedText" searchWords={terms} autoEscape textToHighlight={block.text} />
        </p>
      ))}
      {results.length > 3 ? (
        <details>
          <summary>
            <small>{results.length - 3} more</small>
          </summary>
          {results.slice(3).map(block => (
            <p key={block.key}>
              <Link
                to={`/${id}?t=${(block.data as any).start ?? 0},${(block.data as any).end ?? 0}&block=${
                  block.key
                }&q=${encodeURIComponent(query)}`}>
                <code>
                  {timecode({
                    seconds: (block.data as any).start ?? 0,
                    frameRate,
                    offset,
                    partialTimecode: false,
                  })}
                  &thinsp;–&thinsp;
                  {timecode({
                    seconds: (block.data as any).end ?? 0,
                    frameRate,
                    offset,
                    partialTimecode: false,
                  })}
                </code>
              </Link>
              <br />
              <strong>{`${(block.data as any)?.speaker}: `}</strong>
              <Highlighter
                highlightClassName="matchedText"
                searchWords={terms}
                autoEscape
                textToHighlight={block.text}
              />
            </p>
          ))}
        </details>
      ) : null}
    </div>
  );
};

const SearchBox = ({
  root,
  folders,
  transcripts,
  setSearchResults,
}: {
  root: Project | Folder | undefined;
  folders: Folder[];
  transcripts: Transcript[];
  setSearchResults: (results: any | null) => void;
}): JSX.Element => {
  const history = useHistory();
  const query = useQuery();
  const [index, setIndex] = useState<any | undefined | null>(undefined);
  const [searchString, setSearchString] = useState('');

  const search = useMemo(() => query.get('search'), [query]);

  useEffect(() => {
    if (!root) return;
    (async () => {
      window.Indexes = window.Indexes ?? {};
      let data = window.Indexes[root.id]; // FIXME
      try {
        if (!data) {
          const result = await axios.get(await Storage.get(`indexes/${root.id}/index.json`, { level: 'public' }));
          data = result.data;
        }
      } catch (error) {
        data = {
          documentCount: 0,
          nextId: 0,
          documentIds: {},
          fieldIds: {
            title: 0,
            text: 1,
          },
          fieldLength: {},
          averageFieldLength: [],
          storedFields: {},
          dirtCount: 0,
          index: [],
          serializationVersion: 2,
        };
      }
      setIndex(data);
      window.Indexes[root.id] = data;
    })();
  }, [root]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchString(e.target.value);
    // TBD filter title search? (+debounce)
  }, []);

  const handleSearch = useCallback(() => {
    if (!root) return;
    if (!index) return;
    if (searchString.trim().length === 0) {
      setSearchResults(null);
      return;
    }
    // console.log({ index });
    // const results = MiniSearch.loadJSON(JSON.stringify(index), { fields: ['title', 'text'] }).search(searchString, {
    //   combineWith: 'AND',
    //   prefix: true,
    //   // fuzzy: 0.1,
    // });
    // console.log(results);

    // API.get('search', '/search', { queryStringParameters: { query: searchString, index: 'default' } })
    //   .then(response => {
    //     console.log(response);
    //   })
    //   .catch(error => {
    //     console.log(error.response);
    //   });
    history.push(`/${root.id}?search=${searchString.trim()}`);
    // setSearchResults({ query: searchString, results });
  }, [index, searchString, setSearchResults, root, history]);

  useEffect(() => {
    if (!root) return;
    if (!index) return;
    if (!search) return;

    if (search.trim().length === 0) {
      setSearchResults(null);
      return;
    }
    setSearchString(search);

    //
    API.get('search', '/search', { queryStringParameters: { index: root.id, query: search } })
      .then(response => {
        console.log('ssearch!', { response });
        setSearchResults({ query: search, results: response });
      })
      .catch(error => {
        console.log(error.response);
      });
    //

    // const results = MiniSearch.loadJSON(JSON.stringify(index), { fields: ['title', 'text'] }).search(search, {
    //   combineWith: 'AND',
    //   prefix: true,
    //   // fuzzy: 0.1,
    // });
    // console.log(results);

    // // history.push(`/${root.id}?search=${searchString.trim()}`);
    // setSearchResults({ query: search, results });
  }, [index, root, search, setSearchResults]);

  const handleIndex = useCallback(async () => {
    if (!root) return;
    // find all transcripts of current project/root
    const t = [];
    const q = [root.id];
    while (q.length > 0) {
      const f = q.pop();
      const children = transcripts.filter(t => t.parent === f);
      t.push(...children);
      const nodes = folders.filter(t => t.parent === f);
      q.push(...nodes.map(f => f.id));
    }

    console.log({ t, q });

    const documents = (
      await Promise.allSettled(
        t
          .filter(t => !(t.metadata as any).deleted)
          .map(async t => {
            const { data } = await axios.get(
              await Storage.get(`transcript/${t.id}/transcript.json`, { level: 'public' }),
            );

            const text = data.blocks.map((b: RawDraftContentBlock) => b.text).join('\n');
            return { id: t.id, title: t.title, text };
          }),
      )
    )
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value);

    console.log({ documents });

    const miniSearch = new MiniSearch({ fields: ['title', 'text'] });
    miniSearch.addAll(documents);
    await Storage.put(
      `indexes/${root.id}/index.json`,
      new Blob([pako.gzip(new TextEncoder().encode(JSON.stringify(miniSearch)))]),
      {
        level: 'public',
        contentType: 'application/json',
        contentEncoding: 'gzip',
      },
    );
    setIndex(miniSearch);
    window.Indexes = window.Indexes ?? {};
    window.Indexes[root.id] = miniSearch;
  }, [root, folders, transcripts]);

  return index === null ? (
    <Button onClick={handleIndex}>Index Project</Button>
  ) : (
    <Search
      allowClear
      disabled={!index || !root?.id}
      placeholder="input search text"
      value={searchString}
      onChange={handleSearchChange}
      onSearch={handleSearch}
    />
  );
};

const NewFolderModal = ({
  visible,
  setVisible,
  parentId,
  userId,
}: {
  visible: boolean;
  setVisible: (visibility: boolean) => void;
  parentId: string | undefined;
  userId: string | undefined;
}): JSX.Element => {
  const [newFolderName, setNewFolderName] = useState('');

  const createFolder = useCallback(async () => {
    const newFolder = await DataStore.save(
      new Folder({
        title: newFolderName,
        parent: parentId,
        metadata: JSON.stringify({
          createdBy: userId,
          updatedBy: [userId],
        }),
        status: '{}',
      }),
    );

    console.log({ newFolder });
    setVisible(false);
  }, [parentId, newFolderName, userId, setVisible]);

  const handleOk = useCallback(() => createFolder(), [createFolder]);
  const handleCancel = useCallback(() => setVisible(false), [setVisible]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = e;
    setNewFolderName(value);
  }, []);

  return (
    <Modal destroyOnClose title="New Folder" style={{ top: 20 }} open={visible} onOk={handleOk} onCancel={handleCancel}>
      <Input placeholder="Folder name" value={newFolderName} onChange={handleChange} />
    </Modal>
  );
};

const NewProjectModal = ({
  visible,
  setVisible,
  userId,
  uuid,
}: {
  visible: boolean;
  setVisible: (visibility: boolean) => void;
  userId: string | undefined;
  uuid: string | undefined;
}): JSX.Element => {
  const [value, setValue] = useState('');

  const createProject = useCallback(async () => {
    const newProject = await DataStore.save(
      new Project({
        title: value,
        parent: uuid,
        users: [userId ?? ''], // FIXME: handle undefined
        metadata: JSON.stringify({
          createdBy: userId,
          updatedBy: [userId],
        }),
        status: '{}',
      }),
    );

    console.log({ newProject });
    setVisible(false);
  }, [value, userId, setVisible]);

  const handleOk = useCallback(() => createProject(), [createProject]);
  const handleCancel = useCallback(() => setVisible(false), [setVisible]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const {
      target: { value },
    } = e;
    setValue(value);
  }, []);

  return (
    <Modal
      destroyOnClose
      title="New Project"
      style={{ top: 20 }}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}>
      <Input placeholder="Project name" value={value} onChange={handleChange} />
    </Modal>
  );
};

const MoveToFolderModal = ({
  visible,
  setVisible,
  userId,
  root,
  folder,
  folders,
  selectedRowKeys = [],
}: {
  visible: boolean;
  setVisible: (visibility: boolean) => void;
  userId: string | undefined;
  root: Project | Folder | undefined;
  folder: Folder | undefined;
  folders: Folder[];
  selectedRowKeys: React.Key[];
}): JSX.Element => {
  const moveToFolder = useCallback(() => {
    console.log('move to folder');
  }, []);

  console.log({ root, folder });

  const treeData: DataNode[] = useMemo(() => {
    if (!root) return [];

    const rootNode = {
      title: root.title,
      key: root.id,
      children: [],
    };

    const findChildren = (node: DataNode): DataNode | void => {
      const children = folders.filter(f => f.parent === node.key && !(f.metadata as any).deleted);
      if (children.length > 0) {
        // eslint-disable-next-line no-param-reassign
        node.children = children.map(c => ({
          title: c.title,
          key: c.id,
          children: [],
        }));
        node.children.forEach(findChildren);
      }
    };

    return [findChildren(rootNode) ?? rootNode];
  }, [root, folders]);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

  const moveToParent = useCallback(async () => {
    const [parentId] = selectedKeys;
    if (!parentId || parentId === '') return;

    await Promise.all(
      selectedRowKeys.map(async id => {
        const folder = (await DataStore.query(Folder, id as string)) as Folder;
        const transcript = (await DataStore.query(Transcript, id as string)) as Transcript;

        if (folder)
          await DataStore.save(
            Folder.copyOf(folder, (updated: any) => {
              // eslint-disable-next-line no-param-reassign
              updated.parent = parentId;
            }),
          );

        if (transcript)
          await DataStore.save(
            Transcript.copyOf(transcript, (updated: any) => {
              // eslint-disable-next-line no-param-reassign
              updated.parent = parentId;
            }),
          );

        return null;
      }),
    );
    // setSelectedRowKeys([]);
    setVisible(false);
  }, [selectedRowKeys, selectedKeys, setVisible]);

  const handleSelect = useCallback((keys: React.Key[], e: any) => {
    setSelectedKeys(keys as string[]);
  }, []);

  const handleOk = useCallback(() => moveToParent(), [moveToParent]);
  const handleCancel = useCallback(() => setVisible(false), [setVisible]);

  return (
    <Modal
      destroyOnClose
      title="Move to Folder"
      style={{ top: 20 }}
      open={visible}
      onOk={handleOk}
      onCancel={handleCancel}>
      <DirectoryTree
        defaultExpandAll
        onSelect={handleSelect}
        treeData={treeData}
        defaultSelectedKeys={folder ? [folder.id] : []}
      />
    </Modal>
  );
};

// FIXME: DRY, move to utils
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

const timecode = ({
  seconds = 0,
  frameRate = 1000,
  dropFrame = false,
  partialTimecode = false,
  offset = 0,
}: {
  seconds: number | undefined;
  frameRate: FRAMERATE | number;
  dropFrame?: boolean;
  partialTimecode: boolean;
  offset: number | string;
}): string => {
  let tc = TC(seconds * frameRate, frameRate as FRAMERATE, dropFrame).toString();

  try {
    tc = TC(seconds * frameRate, frameRate as FRAMERATE, dropFrame)
      .add(new TC(offset, frameRate as FRAMERATE))
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

export default Home;
