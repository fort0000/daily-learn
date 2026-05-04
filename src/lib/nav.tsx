import { createContext, useContext } from 'react';

export type RouteName =
  | 'home'
  | 'roadmap'
  | 'article'
  | 'chat'
  | 'profile'
  | 'account'
  | 'create';

export type RouteParams = Record<string, unknown>;

export type Route = { name: RouteName; params?: RouteParams };

export type NavContextValue = {
  route: Route;
  navigate: (name: RouteName, params?: RouteParams) => void;
};

export const NavContext = createContext<NavContextValue>({
  route: { name: 'home' },
  navigate: () => {},
});

export const useNav = () => useContext(NavContext);
