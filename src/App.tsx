import { useEffect, useRef, type ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useSession } from './lib/auth';
import { Sidebar } from './components/Sidebar';
import { LandingScreen } from './screens/Landing';
import { HomeScreen } from './screens/Home';
import { RoadmapScreen } from './screens/Roadmap';
import { ArticleScreen } from './screens/Article';
import { ChatScreen } from './screens/Chat';
import { ProfileScreen } from './screens/Profile';
import { AccountScreen } from './screens/Account';
import { CreateScreen } from './screens/Create';
import { LoginScreen } from './screens/Login';
import { AuthCallbackScreen } from './screens/AuthCallback';

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<FullStage><LandingScreen /></FullStage>} />
        <Route path="/login" element={<FullStage><LoginScreen /></FullStage>} />
        <Route path="/auth/callback" element={<FullStage><AuthCallbackScreen /></FullStage>} />
        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/home" element={<HomeScreen />} />
          <Route path="/roadmap" element={<RoadmapScreen />} />
          <Route path="/lessons/:lessonId" element={<ArticleScreen />} />
          <Route path="/lessons/:lessonId/chat" element={<ChatScreen />} />
          <Route path="/create" element={<CreateScreen />} />
          <Route path="/profile" element={<ProfileScreen />} />
          <Route path="/profile/account" element={<AccountScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (session.status === 'loading') {
    return <FullStage><div className="w-full h-full bg-dl-bg" /></FullStage>;
  }
  if (session.status === 'signed-out') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

function AppLayout() {
  const location = useLocation();
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Reset the stage scroll on every navigation so a deep-scrolled previous
  // page doesn't bleed into the next one.
  useEffect(() => {
    requestAnimationFrame(() => {
      if (stageRef.current) stageRef.current.scrollTop = 0;
    });
  }, [location.pathname]);

  return (
    <>
      <Sidebar />
      <div ref={stageRef} className="flex-1 w-full h-screen bg-dl-bg relative overflow-hidden">
        <div key={location.pathname} className="w-full h-full animate-dlfade">
          <Outlet />
        </div>
      </div>
    </>
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
