/* eslint-disable no-nested-ternary */
/* eslint-disable react/jsx-curly-brace-presence */
/* eslint-disable no-unused-expressions */
/* eslint-disable react/button-has-type */
import React, { useState, useEffect, useMemo } from 'react';
import { Switch, Route, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Auth, DataStore, Hub } from 'aws-amplify';
import { defaultDarkModeOverride, useAuthenticator } from '@aws-amplify/ui-react';
import { useAtom } from 'jotai';
import { useKonami } from 'react-konami-code';
import * as Sentry from '@sentry/react';

import { User, Transcript, Project, Folder, ProjectGroup } from './models';
import { darkModeAtom, debugModeAtom } from './atoms';
import AuthPage from './pages/Auth';
import Home from './pages/Home';
import TranscriptPage from './pages/Transcript';
import NotFound from './pages/NotFound';
import UserMenu from './components/UserMenu';

export const theme = {
  name: 'open-editor',
  overrides: [defaultDarkModeOverride],
};

const getUser = async (username: string): Promise<User | undefined> =>
  (await DataStore.query(User, user => user.cognitoUsername('eq', username), { limit: 1 })).pop();

const getUsers = async (setUsers: (users: User[]) => void): Promise<void> => setUsers(await DataStore.query(User));

const getTranscripts = async (setTranscripts: (transcripts: Transcript[]) => void): Promise<void> =>
  setTranscripts(await DataStore.query(Transcript));

const getFolders = async (setFolders: (folders: Folder[]) => void): Promise<void> =>
  setFolders(await DataStore.query(Folder));

const getProjects = async (setProjects: (projects: Project[]) => void): Promise<void> =>
  setProjects(await DataStore.query(Project));

const getProjectGroups = async (setProjectGroups: (projects: ProjectGroup[]) => void): Promise<void> =>
  setProjectGroups(await DataStore.query(ProjectGroup));

const AppWrapper = (): JSX.Element => {
  const { authStatus } = useAuthenticator(context => [context.user]);
  const [darkMode] = useAtom(darkModeAtom);

  return (
    <>
      {darkMode && (
        <Helmet>
          <style>{'@import "/style/antd.dark.css";'}</style>
        </Helmet>
      )}
      {authStatus === 'authenticated' ? <App /> : <AuthPage {...{ theme, darkMode }} />}
    </>
  );
};

const App = (): JSX.Element => {
  const { user: cognitoUser, signOut } = useAuthenticator(context => [context.user]);

  const [ready, setReady] = useState(false);
  const [users, setUsers] = useState<User[] | undefined>(undefined);
  const [transcripts, setTranscripts] = useState<Transcript[] | undefined>(undefined);
  const [folders, setFolders] = useState<Folder[] | undefined>(undefined);
  const [projects, setProjects] = useState<Project[] | undefined>(undefined);
  const [projectGroups, setProjectGroups] = useState<ProjectGroup[] | undefined>(undefined);

  const [debugMode, setDebug] = useAtom(debugModeAtom);
  useKonami(() => setDebug(!debugMode));

  useEffect(() => {
    getUsers(setUsers);

    const subscription = DataStore.observe(User).subscribe(() => getUsers(setUsers));
    window.addEventListener('online', () => navigator.onLine && getUsers(setUsers));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getTranscripts(setTranscripts);

    const subscription = DataStore.observe(Transcript).subscribe(() => getTranscripts(setTranscripts));
    window.addEventListener('online', () => navigator.onLine && getTranscripts(setTranscripts));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getFolders(setFolders);

    const subscription = DataStore.observe(Folder).subscribe(() => getFolders(setFolders));
    window.addEventListener('online', () => navigator.onLine && getFolders(setFolders));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getProjects(setProjects);

    const subscription = DataStore.observe(Project).subscribe(() => getProjects(setProjects));
    window.addEventListener('online', () => navigator.onLine && getProjects(setProjects));

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    getProjectGroups(setProjectGroups);

    const subscription = DataStore.observe(ProjectGroup).subscribe(() => getProjectGroups(setProjectGroups));
    window.addEventListener('online', () => navigator.onLine && getProjectGroups(setProjectGroups));

    return () => subscription.unsubscribe();
  }, []);

  const user = useMemo(
    () => users?.find(({ cognitoUsername }) => cognitoUsername === cognitoUser?.username),
    [cognitoUser, users],
  );

  const groups = useMemo(
    () => cognitoUser?.getSignInUserSession()?.getIdToken().payload['cognito:groups'],
    [cognitoUser],
  );

  const userProjectGroups = useMemo(
    () =>
      groups.includes('Admins') ? projectGroups : projectGroups?.filter(({ title }) => groups.includes(title)) ?? [],
    [projectGroups, groups],
  );

  useEffect(() => {
    Hub.listen('datastore', ({ payload: { event, data } }) => {
      if (event === 'ready') setReady(true);
    });

    // return () => Hub.remove('datastore', listener);
  }, []);

  useEffect(() => {
    if (!cognitoUser || !ready) return;

    const { username, attributes } = cognitoUser;
    const { email } = attributes ?? { email: '' };

    Sentry.setUser({ email });

    username &&
      (async () => {
        const user = await getUser(username);

        if (!user) {
          const { identityId } = await Auth.currentCredentials();

          await DataStore.save(
            new User({
              identityId,
              cognitoUsername: username,
              email,
              name: email.split('@')[0],
              metadata: '{}',
            }),
          );
        }
      })();
  }, [cognitoUser, ready]);

  return (
    <Switch>
      <Route path="/" exact>
        <PageWrapper
          {...{
            user,
            userProjectGroups,
            users,
            groups,
            projects,
            folders,
            transcripts,
            userMenu: <UserMenu {...{ user, groups, signOut }} />,
          }}
        />
      </Route>
      <Route path="/:uuid([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})">
        <PageWrapper
          {...{
            user,
            userProjectGroups,
            users,
            groups,
            projects,
            folders,
            transcripts,
            userMenu: <UserMenu {...{ user, groups, signOut }} />,
          }}
        />
      </Route>
      <Route path="*">
        <NotFound />
      </Route>
    </Switch>
  );
};

interface PageWrapperProps {
  user: User | undefined;
  userProjectGroups: ProjectGroup[] | undefined;
  users: User[] | undefined;
  groups: string[];
  projects: Project[] | undefined;
  folders: Folder[] | undefined;
  transcripts: Transcript[] | undefined;
  userMenu: JSX.Element;
}

const PageWrapper = ({
  user,
  userProjectGroups,
  users,
  groups,
  projects,
  folders,
  transcripts,
  userMenu,
}: PageWrapperProps): JSX.Element => {
  const params = useParams();
  // const { uuid } = params as Record<string, string>;
  const uuid = (params as Record<string, string>).uuid ?? userProjectGroups?.[0]?.id ?? '';

  const projectGroup = useMemo(() => userProjectGroups?.find(({ id }) => id === uuid), [userProjectGroups, uuid]);
  const project = useMemo(() => projects?.find(({ id }) => id === uuid), [projects, uuid]);
  const folder = useMemo(() => folders?.find(({ id }) => id === uuid), [folders, uuid]);
  const transcript = useMemo(() => transcripts?.find(({ id }) => id === uuid), [transcripts, uuid]);

  const [root, routes] = useMemo(() => {
    const home = { path: '/', breadcrumbName: 'Home', projectGroups: userProjectGroups };

    if (projectGroup) {
      home.path = `/${uuid}`;
      home.breadcrumbName = userProjectGroups?.find(({ id }) => id === uuid)?.title ?? 'Home';
      return [null, [home]];
    }

    if (project) {
      if (project.parent) {
        home.path = `/${project.parent}`;
        home.breadcrumbName = userProjectGroups?.find(({ id }) => id === project.parent)?.title ?? 'Home';
      }

      return [project, [home]];
    }

    if (folder || transcript) {
      const parents = getParents(uuid, projects ?? [], folders ?? [], transcripts ?? []);
      const root = parents?.slice(-1)?.[0];

      if (parents.length > 0 && parents[parents.length - 1].parent) {
        home.path = `/${parents[parents.length - 1].parent}`;
        home.breadcrumbName =
          userProjectGroups?.find(({ id }) => id === parents[parents.length - 1].parent)?.title ?? 'Home';
      }

      return [
        root,
        [
          home,
          ...parents
            .map(({ id, title }) => ({
              path: `/${id}`,
              breadcrumbName: title,
            }))
            .reverse(),
        ],
      ];
    }

    return [null, [home]];
  }, [uuid, project, projects, folder, folders, transcript, transcripts, userProjectGroups, projectGroup]);

  useEffect(() => window.scrollTo(0, 0), [uuid]);

  return projectGroup || project || folder || !uuid ? (
    <Home
      {...{
        uuid,
        user,
        users,
        groups,
        project,
        projects,
        projectGroup,
        folder,
        folders,
        transcripts,
        userMenu,
        root,
        routes,
      }}
    />
  ) : transcript ? (
    <TranscriptPage
      {...{ uuid, user, groups, project, projects, folders, transcript, transcripts, userMenu, root, routes }}
    />
  ) : (
    <NotFound />
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findNodeById = (id: string, nodes: any[]): any | null => nodes.find(node => node.id === id) || null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getParents = (id: string, projects: Project[], folders: Folder[], transcripts: Transcript[]): any[] => {
  const allNodes = [...projects, ...folders, ...transcripts];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any[] = [];

  let currentNode = findNodeById(id, allNodes);
  while (currentNode && currentNode.parent !== null) {
    currentNode = findNodeById(currentNode.parent, allNodes);
    if (currentNode) {
      result.push(currentNode);
    }
  }

  return result;
};

export default AppWrapper;
