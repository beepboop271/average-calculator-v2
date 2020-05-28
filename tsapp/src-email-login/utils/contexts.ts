import React from 'react';
import {
  colour,
  adobeAnalogousBlue,
  adobeAnalogousPastel,
  adobeMonochromaticBlue,
} from './colours';

//userId context
export interface IUserContext {
  setLoggedIn: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  uid: string | undefined;
  name: string | undefined;
  setName: React.Dispatch<React.SetStateAction<string>> | undefined;
  isLoggedIn: boolean;
  animationEnabled: boolean;
  setAnimationEnabled:
    | React.Dispatch<React.SetStateAction<boolean>>
    | undefined;
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>> | undefined;
  precision: number;
  setPrecision: React.Dispatch<React.SetStateAction<number>> | undefined;
  hasTaCredential: boolean;
  setHasTaCredential: React.Dispatch<React.SetStateAction<boolean>> | undefined;
}

export const UserContext = React.createContext<IUserContext>({
  setLoggedIn: undefined,
  uid: undefined,
  name: undefined,
  setName: undefined,
  isLoggedIn: false,
  animationEnabled: true,
  setAnimationEnabled: undefined,
  darkMode: false,
  setDarkMode: undefined,
  precision: 2,
  setPrecision: undefined,
  hasTaCredential: false,
  setHasTaCredential: undefined,
});

export interface ThemeColour {
  statusBarBackground: string;
  background: string;
  header: {
    background: string;
    dropShadow: string;
    icon: string;
    text: string;
  };
  sidebar: {
    icon: string;
    activeText: string;
    inactiveText: string;
    activeBackground: string;
    inactiveBackground: string;
  };
  courseCard: {
    courseCode: string;
    otherInfo: string;
    percent: string;
    border: string;
    background: string;
  };
  assessmentCard: {
    text: string;
    border: string;
    strand: {
      null: string;
      outline: string;
      percent: string;
      text: string;
    };
    background: string;
  };
  button: {
    text: string;
    background: string;
  };
  settings: {
    icon: string;
    text: string;
    thumb: {
      on: string;
      off: string;
    };
    track: {
      on: string;
      off: string;
    };
  };
  refresh: string;
}

export const lightTheme: ThemeColour = {
  statusBarBackground: colour.LIGHT_GRAY,
  background: colour.LIGHT_LIGHT_GRAY,
  header: {
    background: colour.LIGHT_GRAY,
    text: 'black',
    dropShadow: colour.LIGHT_GRAY,
    icon: colour.DARK_GRAY,
  },
  sidebar: {
    icon: 'black',
    inactiveText: colour.DARK_GRAY,
    activeText: adobeAnalogousPastel.BLUE,
    activeBackground: '#ebf4ff',
    inactiveBackground: colour.LIGHT_LIGHT_GRAY,
  },
  button: {
    background: adobeAnalogousBlue.BLUE,
    text: 'white',
  },
  courseCard: {
    border: adobeMonochromaticBlue.LIGHT_BLUE,
    otherInfo: adobeAnalogousBlue.LIGHT_BLUE,
    percent: adobeAnalogousPastel.BLUE,
    courseCode: '#675cb8',
    background: colour.LIGHT_LIGHT_GRAY,
  },
  assessmentCard: {
    strand: {
      null: adobeAnalogousBlue.MAGENTA,
      text: adobeAnalogousBlue.BLUE,
      outline: '#6991f0',
      percent: '#4e7be6',
    },
    border: adobeMonochromaticBlue.LIGHT_BLUE,
    text: colour.BLUE,
    background: 'white',
  },
  settings: {
    icon: colour.DARK_GRAY,
    thumb: {
      on: colour.BLUE,
      off: 'white',
    },
    track: {
      on: '#d9e4ff',
      off: '#dbdbdb',
    },
    text: 'black',
  },
  refresh: adobeAnalogousBlue.BLUE_VIOLET,
};

export const darkTheme: ThemeColour = {
  statusBarBackground: 'black',
  background: '#121212',
  header: {
    background: '#1f1f1f',
    dropShadow: '#121212',
    text: '#FFFFFFDE',
    icon: '#FFFFFFDE',
  },
  sidebar: {
    icon: '#ffffffAB',
    inactiveText: '#ffffffD6',
    activeText: adobeAnalogousPastel.BLUE,
    activeBackground: '#ffffff0D',
    inactiveBackground: '#121212',
  },
  button: {
    background: '#5E5DE8B0',
    text: 'white',
  },
  courseCard: {
    border: 'black',
    otherInfo: '#668DFFB3',
    percent: adobeAnalogousBlue.BLUE,
    courseCode: '#9B73FFDE',
    background: '#1d1d1d',
  },
  assessmentCard: {
    strand: {
      null: '#E566FFDE',
      text: '#668DFFDE',
      outline: '#668DFFDE',
      percent: '#4e7be6DE',
    },
    border: 'black',
    text: '#FFFFFFDE',
    background: '#1d1d1d',
  },
  settings: {
    icon: '#ffffffB3',
    thumb: {
      on: '#2848bd',
      off: '#cccccc',
    },
    track: {
      on: '#2848bdB3',
      off: '#ffffffB0',
    },
    text: '#ffffffDE',
  },
  refresh: adobeAnalogousBlue.BLUE_VIOLET,
};

export interface Theme {
  colour: ThemeColour;
  mode: 'dark' | 'light';
}

export const ThemeContext = React.createContext<Theme>({
  mode: 'dark',
  colour: darkTheme,
});
