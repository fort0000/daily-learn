import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { NavContext, type Route, type RouteName, type RouteParams } from './lib/nav';
import { useSession } from './lib/auth';
import { Sidebar } from './components/Sidebar';
import { HomeScreen } from './screens/Home';
import { RoadmapScreen } from './screens/Roadmap';
import { ArticleScreen } from './screens/Article';
import { ChatScreen } from './screens/Chat';
import { ProfileScreen } from './screens/Profile';
import { AccountScreen } from './screens/Account';
import { CreateScreen } from './screens/Create';
import { LoginScreen } from './screens/Login';
import { AuthCallbackScreen } from './screens/AuthCallback';

const screens: Record<RouteName, ComponentType> = {
  home: HomeScreen,
  roadmap: RoadmapScreen,
  article: ArticleScreen,
  chat: ChatScreen,
  profile: ProfileScreen,
  account: AccountScreen,
  create: CreateScreen,
};

const isAuthCallback = () =>
  typeof window !== 'undefined' && window.location.pathname === '/auth/callback';

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const navigate = useCallback((name: RouteName, params?: RouteParams) => {
    setRoute({ name, params: params || {} });
    requestAnimationFrame(() => {
      if (stageRef.current) stageRef.current.scrollTop = 0;
    });
  }, []);

  const session = useSession();

  // Once signed in, drop the /auth/callback path so the URL bar is clean.
  useEffect(() => {
    if (
      session.status === 'signed-in' &&
      typeof window !== 'undefined' &&
      window.location.pathname === '/auth/callback'
    ) {
      window.history.replaceState({}, document.title, '/');
    }
  }, [session.status]);

  // Signed-in always wins — even if the URL is still /auth/callback for a beat.
  if (session.status === 'signed-in') {
    const Screen = screens[route.name];
    return (
      <NavContext.Provider value={{ route, navigate }}>
        <Shell>
          <Sidebar />
          <div ref={stageRef} className="flex-1 w-full h-screen bg-dl-bg relative overflow-hidden">
            <div key={route.name} className="w-full h-full animate-dlfade">
              <Screen />
            </div>
          </div>
        </Shell>
      </NavContext.Provider>
    );
  }

  // No session yet but on the OAuth/email callback path → run the handler.
  if (isAuthCallback()) {
    return (
      <Shell>
        <FullStage>
          <AuthCallbackScreen />
        </FullStage>
      </Shell>
    );
  }

  if (session.status === 'loading') {
    return (
      <Shell>
        <FullStage>
          <div className="w-full h-full bg-dl-bg" />
        </FullStage>
      </Shell>
    );
  }

  return (
    <Shell>
      <FullStage>
        <LoginScreen />
      </FullStage>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="flex w-full h-screen bg-dl-bg md:max-w-[880px] md:mx-auto md:shadow-[0_0_60px_rgba(15,23,42,0.06)]">
      {children}
    </div>
  );
}

function FullStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full h-screen bg-dl-bg relative overflow-hidden">
      {children}
    </div>
  );
}
