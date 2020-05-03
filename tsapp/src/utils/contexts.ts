import React from 'react';

//userId context
export interface IUserContext {
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>>|undefined;
  uid: string|undefined;
  isLoggedIn: boolean;
};

export const UserContext = React.createContext<IUserContext>({
  setLoggedIn: undefined,
  uid: undefined,
  isLoggedIn: false
});