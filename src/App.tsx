import { useCallback, useRef, useState, type ComponentType } from 'react';
import { NavContext, type Route, type RouteName, type RouteParams } from './lib/nav';
import { Sidebar } from './components/Sidebar';
import { HomeScreen } from './screens/Home';
import { RoadmapScreen } from './screens/Roadmap';
import { ArticleScreen } from './screens/Article';
import { ChatScreen } from './screens/Chat';
import { ProfileScreen } from './screens/Profile';
import { AccountScreen } from './screens/Account';
import { CreateScreen } from './screens/Create';

const screens: Record<RouteName, ComponentType> = {
  home: HomeScreen,
  roadmap: RoadmapScreen,
  article: ArticleScreen,
  chat: ChatScreen,
  profile: ProfileScreen,
  account: AccountScreen,
  create: CreateScreen,
};

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const navigate = useCallback((name: RouteName, params?: RouteParams) => {
    setRoute({ name, params: params || {} });
    requestAnimationFrame(() => {
      if (stageRef.current) stageRef.current.scrollTop = 0;
    });
  }, []);

  const Screen = screens[route.name];

  return (
    <NavContext.Provider value={{ route, navigate }}>
      <div className="flex w-full h-screen bg-dl-bg md:max-w-[880px] md:mx-auto md:shadow-[0_0_60px_rgba(15,23,42,0.06)]">
        <Sidebar />
        <div ref={stageRef} className="flex-1 w-full h-screen bg-dl-bg relative overflow-hidden">
          <div key={route.name} className="w-full h-full animate-dlfade">
            <Screen />
          </div>
        </div>
      </div>
    </NavContext.Provider>
  );
}
