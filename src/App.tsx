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
import { UpgradeScreen } from './screens/Upgrade';

export function App() {
  return (
    <Routes>
      {/* Landing page renders full-width — no constrained shell. */}
      <Route path="/" element={<LandingScreen />} />
      <Route
        path="*"
        element={
          <Shell>
            <Routes>
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
                <Route path="/upgrade" element={<UpgradeScreen />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Shell>
        }
      />
    </Routes>
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
      <div ref={stageRef} className="flex-1 w-full h-dvh bg-dl-bg relative overflow-hidden">
        <div key={location.pathname} className="w-full h-full animate-dlfade">
          <Outlet />
        </div>
      </div>
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  // On iOS Safari, the bottom URL bar floats over content and `100vh` (lvh)
  // ignores it, so an h-screen Phone extends below the visible viewport and
  // the document can scroll past the bar. Use `h-dvh` on every shell layer
  // (here, the stage, and FullStage) so they track the *currently visible*
  // viewport instead — Phone shrinks when the bar is up so the CTA stays
  // above it. Additionally pin html/body to `overflow:hidden` for the
  // lifetime of the shell to defeat any residual document-level scroll.
  // Landing renders outside Shell, so its own document scroll is unaffected.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);
  return (
    <div className="flex w-full h-dvh overflow-hidden bg-dl-bg md:max-w-[880px] md:mx-auto md:shadow-[0_0_60px_rgba(15,23,42,0.06)]">
      {children}
    </div>
  );
}

function FullStage({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 w-full h-dvh bg-dl-bg relative overflow-hidden">
      {children}
    </div>
  );
}
